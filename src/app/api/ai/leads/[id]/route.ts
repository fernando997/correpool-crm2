import { NextRequest } from 'next/server'
import {
  autenticar, semPermissao, comIdempotencia, erro, ok, lerJson, dataHoraBrasilia, registrarMovimento,
  texto, atualizarLead, canalDaOrigem, ehOrigemIa, ORIGENS_IA, USUARIOS_IA,
} from '@/lib/apiIa'

// PATCH /api/ai/leads/{id} — atribui closer e SDR, muda etapa (só primeiro_contato/agendado),
// marca reunião e corrige UTM/origem. Mudanças de UTM, origem, SDR e closer vão para api_auditoria.
// DELETE /api/ai/leads/{id} — não permitido para chaves de IA.

const ETAPAS_PERMITIDAS = ['primeiro_contato', 'agendado']
const ETAPAS_EXISTENTES = [
  'trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3', 'agendado',
  'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado', 'declinado', 'descartado',
]
// A partir daqui o lead é do closer: a IA não volta etapa
const ETAPAS_DO_CLOSER = ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado']
// Campos por permissão da chave
const CAMPOS_ATRIBUIR = ['vendedor_id', 'sdr_id', 'etapa', 'data_reuniao', 'link_reuniao']      // leads:atribuir
const CAMPOS_MARKETING = ['utm_source', 'utm_campaign', 'utm_content', 'utm_anuncio', 'origem'] // leads:escrever
const CAMPOS = [...CAMPOS_ATRIBUIR, ...CAMPOS_MARKETING]

export async function DELETE() {
  return erro(403, 'Exclusão de leads não é permitida para chaves de IA')
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await autenticar(req)
  if ('resposta' in auth) return auth.resposta
  const { chave, db } = auth

  const body = await lerJson(req)
  if (!body) return erro(400, 'Corpo inválido: esperado um objeto JSON')
  const enviados = Object.keys(body)
  const extras = enviados.filter((k) => !CAMPOS.includes(k))
  if (extras.length) return erro(403, `Campos não permitidos para esta chave: ${extras.join(', ')}`)
  if (!enviados.length) return erro(400, `Envie ao menos um campo: ${CAMPOS.join(', ')}`)
  const negado =
    (enviados.some((k) => CAMPOS_ATRIBUIR.includes(k)) && semPermissao(chave, 'leads:atribuir')) ||
    (enviados.some((k) => CAMPOS_MARKETING.includes(k)) && semPermissao(chave, 'leads:escrever'))
  if (negado) return negado

  return comIdempotencia(req, db, chave, `PATCH /leads/${params.id}`, body, async () => {
    const { data: lead } = await db.from('leads').select('*').eq('id', params.id).maybeSingle()
    if (!lead) return erro(404, 'Lead não encontrado')

    const upd: Record<string, unknown> = { ultima_interacao_em: new Date().toISOString() }

    // ── Closer ───────────────────────────────────────────────
    let closerEhFila = false
    if (body.vendedor_id !== undefined) {
      const vid = typeof body.vendedor_id === 'string' ? body.vendedor_id.trim() : ''
      const { data: closer } = await db.from('users').select('id, fila')
        .eq('id', vid).eq('tipo', 'vendedor').eq('closer', true).eq('ativo', true).maybeSingle()
      if (!closer) return erro(400, 'vendedor_id não é um closer ativo (veja /api/ai/vendedores?papel=closer)')
      upd.vendedor_id = vid
      closerEhFila = closer.fila === true
    }

    // ── SDR: só IA, e nunca tira o crédito de um SDR humano ─
    if (body.sdr_id !== undefined) {
      const sid = typeof body.sdr_id === 'string' ? body.sdr_id.trim() : ''
      if (!USUARIOS_IA.includes(sid)) {
        return erro(400, `sdr_id inválido: esta chave só atribui SDR de IA (${USUARIOS_IA.join(', ')})`)
      }
      const sdrAtual = lead.sdr_id as string | null
      if (sdrAtual && sdrAtual !== sid && !USUARIOS_IA.includes(sdrAtual)) {
        return erro(409, 'O lead já tem um SDR humano; a IA não troca esse crédito')
      }
      upd.sdr_id = sid
    }

    // ── Etapa ────────────────────────────────────────────────
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

    // ── Reunião ──────────────────────────────────────────────
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

    // ── UTM e origem ─────────────────────────────────────────
    // Lead criado pela própria IA: corrige. Os demais (formulário etc.) só preenchem
    // o que está vazio — a atribuição original nunca é trocada.
    const criadoPelaIa = Boolean(lead.criado_por)
    const conflitos: string[] = []
    for (const campo of CAMPOS_MARKETING) {
      if (body[campo] === undefined) continue
      const valor = texto(body[campo], campo === 'origem' ? 50 : 300)
      if (!valor) return erro(400, `${campo} inválido: envie um texto não vazio`)
      if (campo === 'origem' && !ehOrigemIa(valor)) return erro(400, `origem inválida. Aceitas: ${ORIGENS_IA.join(', ')}`)
      const valorAtual = lead[campo] as string | null
      if (!criadoPelaIa && valorAtual && valorAtual !== valor) conflitos.push(campo)
      else upd[campo] = valor
    }
    if (conflitos.length) {
      return erro(409, `Lead não foi criado pela IA e já tem ${conflitos.join(', ')} da origem original; a IA não sobrescreve`)
    }

    // ── Regras de agendamento ────────────────────────────────
    const etapaFinal = (novaEtapa ?? lead.status_funil) as string
    const closerFinal = (upd.vendedor_id ?? lead.vendedor_id) as string | null
    if (etapaFinal === 'agendado') {
      if (!closerFinal) return erro(400, 'Para agendar, informe vendedor_id (closer)')
      if (!(upd.data_reuniao ?? lead.data_reuniao)) return erro(400, 'Para agendar, informe data_reuniao')
    }
    // Fila recebe lead, mas não reunião
    if (etapaFinal === 'agendado' || body.data_reuniao !== undefined) {
      if (body.vendedor_id === undefined && closerFinal) {
        const { data: c } = await db.from('users').select('fila').eq('id', closerFinal).maybeSingle()
        closerEhFila = c?.fila === true
      }
      if (closerEhFila) return erro(409, 'Fila não recebe reunião: atribua um closer antes de agendar')
    }

    if (novaEtapa) {
      upd.status_funil = novaEtapa
      if (lead.status_funil === 'declinado') Object.assign(upd, { motivo_perda: null, temperatura: 'frio' })
    }

    const r = await atualizarLead(db, chave, `PATCH /leads/${params.id}`, lead, upd)
    if ('resposta' in r) return r.resposta

    if (novaEtapa) {
      const canal = canalDaOrigem(upd.origem ?? lead.origem)
      await registrarMovimento(db, params.id, lead.status_funil, novaEtapa, canal.usuario_id,
        novaEtapa === 'agendado' ? `Reunião agendada ${canal.por} ${upd.data_reuniao ?? ''} ${upd.hora_reuniao ?? ''}`.trim()
          : `Movido ${canal.por}`)
    }
    return ok({ id: params.id, etapa: etapaFinal, alterados: r.alterados })
  })
}
