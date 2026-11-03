import { NextRequest } from 'next/server'
import {
  autenticar, comIdempotencia, erro, ok, lerJson, telCandidatos, telNorm, telValido,
  hojeBrasilia, registrarMovimento, texto, atualizarLead,
  CANAIS_IA, ORIGEM_PADRAO, ORIGENS_IA, USUARIOS_IA, ehOrigemIa,
} from '@/lib/apiIa'

// POST /api/ai/leads — cria ou atualiza o lead pelo telefone (upsert).
// GET  /api/ai/leads — listagem NÃO é permitida para chaves de IA (403).

const FAIXAS = ['acima_150k', 'de_100k_a_150k', 'de_60k_a_100k', 'de_30k_a_60k', 'ate_30k', 'nao_informado'] as const
const PERFIS = ['novo_no_mercado', 'ja_conhece', 'locacao'] as const
const PRIORIDADES = ['alta', 'media', 'menor'] as const
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_anuncio'] as const

// Etapas em que a IA ainda pode mexer no lead; daqui pra frente é com o closer
const ETAPAS_INICIAIS = ['trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3', 'declinado']

const prioridadeDaFaixa = (f: string) =>
  f === 'acima_150k' || f === 'de_100k_a_150k' ? 'alta' : f === 'de_60k_a_100k' ? 'media' : 'menor'

export async function GET() {
  return erro(403, 'Listagem de leads não é permitida para chaves de IA. Use /api/ai/leads/busca?telefone=')
}

export async function POST(req: NextRequest) {
  const auth = await autenticar(req, 'leads:escrever')
  if ('resposta' in auth) return auth.resposta
  const { chave, db } = auth

  const body = await lerJson(req)
  if (!body) return erro(400, 'Corpo inválido: esperado um objeto JSON')

  return comIdempotencia(req, db, chave, 'POST /leads', body, async () => {
    // ── Validação ────────────────────────────────────────────
    const telefone = texto(body.telefone, 30)
    if (!telefone || !telValido(telefone)) return erro(400, 'telefone inválido: use E.164 brasileiro, ex. +5511999999999')

    // A origem diz qual IA está falando: 0800 = Vitor, número novo = Camila
    const origemEnviada = texto(body.origem, 50)
    if (origemEnviada && !ehOrigemIa(origemEnviada)) return erro(400, `origem inválida. Aceitas: ${ORIGENS_IA.join(', ')}`)
    const origem = ehOrigemIa(origemEnviada) ? origemEnviada : ORIGEM_PADRAO
    const canal = CANAIS_IA[origem]

    const faixa = texto(body.faixa_capital, 30)
    if (faixa && !FAIXAS.includes(faixa as never)) return erro(400, `faixa_capital inválida. Aceitos: ${FAIXAS.join(', ')}`)
    const perfil = texto(body.perfil, 30)
    if (perfil && !PERFIS.includes(perfil as never)) return erro(400, `perfil inválido. Aceitos: ${PERFIS.join(', ')}`)
    const prioridadeEnviada = texto(body.prioridade, 10)
    if (prioridadeEnviada && !PRIORIDADES.includes(prioridadeEnviada as never)) {
      return erro(400, `prioridade inválida. Aceitos: ${PRIORIDADES.join(', ')}`)
    }
    // Com faixa, o CRM calcula a prioridade; sem faixa, aceita a enviada
    const prioridade = faixa ? prioridadeDaFaixa(faixa) : prioridadeEnviada

    const email = texto(body.email, 200)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(400, 'email inválido')
    const nome = texto(body.nome, 200)
    const observacao = texto(body.observacao, 4000)

    const vendedorId = texto(body.vendedor_id, 100)
    if (vendedorId) {
      const { data: closer } = await db.from('users').select('id')
        .eq('id', vendedorId).eq('tipo', 'vendedor').eq('closer', true).eq('ativo', true).maybeSingle()
      if (!closer) return erro(400, 'vendedor_id não é um closer ativo (veja /api/ai/vendedores?papel=closer)')
    }
    // SDR: só usuário de IA. Sem sdr_id, vale a IA do canal.
    const sdrId = texto(body.sdr_id, 100)
    if (sdrId && !USUARIOS_IA.includes(sdrId)) {
      return erro(400, `sdr_id inválido: esta chave só atribui SDR de IA (${USUARIOS_IA.join(', ')})`)
    }
    const utm = Object.fromEntries(
      UTMS.map((k) => [k, texto(body[k], 300)]).filter(([, v]) => v),
    ) as Record<string, string>

    const agora = new Date().toISOString()
    const { data: existentes, error: errBusca } = await db.rpc('api_lead_por_telefone', { p_candidatos: telCandidatos(telefone) })
    if (errBusca) return erro(500, 'Falha ao buscar lead por telefone')
    const atual = (existentes as Record<string, unknown>[] | null)?.[0]

    // ── Criar ────────────────────────────────────────────────
    if (!atual) {
      if (!nome) return erro(400, 'nome é obrigatório para criar o lead')
      const locacao = perfil === 'locacao'
      const lead = {
        id: crypto.randomUUID(),
        nome,
        telefone: '+' + telNorm(telefone),
        email: email ?? '',
        observacao: observacao ?? '',
        data_criacao: hojeBrasilia(),
        created_at: agora,
        reuniao_agendada: false,
        temperatura: locacao ? 'desqualificado' : 'frio',
        status_funil: locacao ? 'declinado' : 'primeiro_contato',
        motivo_perda: locacao ? 'locacao' : null,
        vendedor_id: vendedorId ?? null,
        sdr_id: sdrId || canal.usuario_id,
        faixa_capital: faixa ?? null,
        prioridade: prioridade ?? null,
        perfil: perfil ?? null,
        origem,
        criado_por: chave.nome,
        data_primeiro_contato: agora,
        ultima_interacao_em: agora,
        ...utm,
      }
      const { error } = await db.from('leads').insert(lead)
      if (error) return erro(500, 'Falha ao criar lead')
      await registrarMovimento(db, lead.id, null, lead.status_funil, canal.usuario_id,
        locacao ? `Lead cadastrado ${canal.por} — locação` : `Lead cadastrado ${canal.por}`)
      return ok({ id: lead.id, acao: 'criado', etapa: lead.status_funil }, 201)
    }

    // ── Atualizar ────────────────────────────────────────────
    // No POST, UTM, origem e SDR só preenchem o que está vazio; para corrigir, use PATCH.
    const etapaAtual = atual.status_funil as string
    const upd: Record<string, unknown> = { ultima_interacao_em: agora }
    if (nome) upd.nome = nome
    if (email) upd.email = email
    if (faixa) upd.faixa_capital = faixa
    if (prioridade) upd.prioridade = prioridade
    if (perfil) upd.perfil = perfil
    if (vendedorId) upd.vendedor_id = vendedorId
    if (!atual.sdr_id) upd.sdr_id = sdrId || canal.usuario_id
    if (!atual.origem) upd.origem = origem
    // Observação: acrescenta, nunca apaga o que o time escreveu
    if (observacao) {
      const anterior = (atual.observacao as string) || ''
      upd.observacao = anterior ? `${anterior}\n\n[${canal.curto}] ${observacao}` : observacao
    }
    // UTMs: preserva a atribuição original
    for (const [k, v] of Object.entries(utm)) if (!atual[k]) upd[k] = v

    // Mudança de etapa automática só nas etapas iniciais
    let novaEtapa: string | null = null
    if (ETAPAS_INICIAIS.includes(etapaAtual)) {
      if (perfil === 'locacao' && etapaAtual !== 'declinado') {
        novaEtapa = 'declinado'
        Object.assign(upd, { motivo_perda: 'locacao', temperatura: 'desqualificado' })
      } else if (perfil !== 'locacao' && etapaAtual === 'declinado') {
        // Lead declinado voltou a conversar: reativa
        novaEtapa = 'primeiro_contato'
        Object.assign(upd, { motivo_perda: null, temperatura: 'frio' })
      }
    }
    if (novaEtapa) upd.status_funil = novaEtapa

    const r = await atualizarLead(db, chave, 'POST /leads', atual, upd)
    if ('resposta' in r) return r.resposta
    if (novaEtapa) {
      await registrarMovimento(db, atual.id as string, etapaAtual, novaEtapa, canal.usuario_id,
        novaEtapa === 'declinado' ? `Motivo: locacao (${canal.curto} IA)` : `Reativado ${canal.por}`)
    }
    return ok({ id: atual.id, acao: 'atualizado', etapa: novaEtapa ?? etapaAtual })
  })
}
