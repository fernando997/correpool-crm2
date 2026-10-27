import { NextRequest } from 'next/server'
import {
  autenticar, comIdempotencia, erro, ok, lerJson, dataHoraBrasilia, registrarMovimento,
} from '@/lib/apiIa'

// PATCH /api/ai/leads/{id} — atribui closer, muda etapa (só primeiro_contato/agendado) e marca reunião.
// DELETE /api/ai/leads/{id} — não permitido para chaves de IA.

const ETAPAS_PERMITIDAS = ['primeiro_contato', 'agendado']
const ETAPAS_EXISTENTES = [
  'trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3', 'agendado',
  'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado', 'declinado', 'descartado',
]
// A partir daqui o lead é do closer: a IA não volta etapa
const ETAPAS_DO_CLOSER = ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado']
const CAMPOS = ['vendedor_id', 'etapa', 'data_reuniao', 'link_reuniao']

export async function DELETE() {
  return erro(403, 'Exclusão de leads não é permitida para chaves de IA')
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await autenticar(req, 'leads:atribuir')
  if ('resposta' in auth) return auth.resposta
  const { chave, db } = auth

  const body = await lerJson(req)
  if (!body) return erro(400, 'Corpo inválido: esperado um objeto JSON')
  const extras = Object.keys(body).filter((k) => !CAMPOS.includes(k))
  if (extras.length) return erro(403, `Campos não permitidos para esta chave: ${extras.join(', ')}`)
  if (!Object.keys(body).length) return erro(400, `Envie ao menos um campo: ${CAMPOS.join(', ')}`)

  return comIdempotencia(req, db, chave, `PATCH /leads/${params.id}`, body, async () => {
    const { data: lead } = await db.from('leads').select('id, status_funil').eq('id', params.id).maybeSingle()
    if (!lead) return erro(404, 'Lead não encontrado')

    const upd: Record<string, unknown> = { ultima_interacao_em: new Date().toISOString() }

    if (body.vendedor_id !== undefined) {
      const vid = typeof body.vendedor_id === 'string' ? body.vendedor_id.trim() : ''
      const { data: closer } = await db.from('users').select('id')
        .eq('id', vid).eq('tipo', 'vendedor').eq('closer', true).eq('ativo', true).maybeSingle()
      if (!closer) return erro(400, 'vendedor_id não é um closer ativo (veja /api/ai/vendedores?papel=closer)')
      upd.vendedor_id = vid
    }

    let novaEtapa: string | null = null
    if (body.etapa !== undefined) {
      const etapa = String(body.etapa)
      if (!ETAPAS_EXISTENTES.includes(etapa)) return erro(400, `etapa inválida. Aceitas: ${ETAPAS_PERMITIDAS.join(', ')}`)
      if (!ETAPAS_PERMITIDAS.includes(etapa)) return erro(403, `Esta chave só pode mudar para ${ETAPAS_PERMITIDAS.join(' ou ')}`)
      if (ETAPAS_DO_CLOSER.includes(lead.status_funil)) {
        return erro(409, `Lead já está em "${lead.status_funil}" com o closer; a IA não altera a etapa`)
      }
      if (etapa !== lead.status_funil) novaEtapa = etapa
    }

    if (body.data_reuniao !== undefined) {
      const dh = typeof body.data_reuniao === 'string' ? dataHoraBrasilia(body.data_reuniao) : null
      if (!dh) return erro(400, 'data_reuniao inválida: use ISO 8601 com fuso, ex. 2026-10-28T14:30:00-03:00')
      upd.data_reuniao = dh.data
      upd.hora_reuniao = dh.hora
      upd.reuniao_agendada = true
    }

    if (body.link_reuniao !== undefined) {
      const link = typeof body.link_reuniao === 'string' ? body.link_reuniao.trim() : ''
      if (!/^https:\/\/\S+$/.test(link) || link.length > 500) return erro(400, 'link_reuniao inválido: use uma URL https')
      upd.link_meet = link
    }

    const etapaFinal = novaEtapa ?? lead.status_funil
    if (etapaFinal === 'agendado') {
      const { data: atual } = await db.from('leads').select('vendedor_id, data_reuniao').eq('id', params.id).single()
      if (!(upd.vendedor_id ?? atual?.vendedor_id)) return erro(400, 'Para agendar, informe vendedor_id (closer)')
      if (!(upd.data_reuniao ?? atual?.data_reuniao)) return erro(400, 'Para agendar, informe data_reuniao')
    }
    if (novaEtapa) {
      upd.status_funil = novaEtapa
      if (lead.status_funil === 'declinado') Object.assign(upd, { motivo_perda: null, temperatura: 'frio' })
    }

    const { error } = await db.from('leads').update(upd).eq('id', params.id)
    if (error) return erro(500, 'Falha ao atualizar lead')

    const autor = chave.usuario_id ?? 'vitor-ia'
    if (novaEtapa) {
      await registrarMovimento(db, params.id, lead.status_funil, novaEtapa, autor,
        novaEtapa === 'agendado' ? `Reunião agendada pelo Vitor (IA) ${upd.data_reuniao ?? ''} ${upd.hora_reuniao ?? ''}`.trim()
          : 'Movido pelo Vitor (IA)')
    }
    return ok({ id: params.id, etapa: etapaFinal })
  })
}
