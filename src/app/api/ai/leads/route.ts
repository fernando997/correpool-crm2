import { NextRequest } from 'next/server'
import {
  autenticar, comIdempotencia, erro, ok, lerJson, telCandidatos, telNorm, telValido,
  hojeBrasilia, registrarMovimento,
} from '@/lib/apiIa'

// POST /api/ai/leads — cria ou atualiza o lead pelo telefone (upsert).
// GET  /api/ai/leads — listagem NÃO é permitida para chaves de IA (403).

const FAIXAS = ['acima_150k', 'de_100k_a_150k', 'de_60k_a_100k', 'de_30k_a_60k', 'ate_30k', 'nao_informado'] as const
const PERFIS = ['novo_no_mercado', 'ja_conhece', 'locacao'] as const
const PRIORIDADES = ['alta', 'media', 'menor'] as const
const ORIGEM = 'whatsapp_0800'

// Etapas em que a IA ainda pode mexer no lead; daqui pra frente é com o closer
const ETAPAS_INICIAIS = ['trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3', 'declinado']

const prioridadeDaFaixa = (f: string) =>
  f === 'acima_150k' || f === 'de_100k_a_150k' ? 'alta' : f === 'de_60k_a_100k' ? 'media' : 'menor'

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)

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

    const origem = texto(body.origem, 50) ?? ORIGEM
    if (origem !== ORIGEM) return erro(403, `Esta chave só registra leads com origem "${ORIGEM}"`)

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
    const utm = Object.fromEntries(
      (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const)
        .map((k) => [k, texto(body[k], 300)])
        .filter(([, v]) => v),
    ) as Record<string, string>

    const autor = chave.usuario_id ?? 'vitor-ia'
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
        sdr_id: autor,
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
      await registrarMovimento(db, lead.id, null, lead.status_funil, autor,
        locacao ? 'Lead cadastrado pelo Vitor (IA) — locação' : 'Lead cadastrado pelo Vitor (IA)')
      return ok({ id: lead.id, acao: 'criado', etapa: lead.status_funil }, 201)
    }

    // ── Atualizar ────────────────────────────────────────────
    const etapaAtual = atual.status_funil as string
    const upd: Record<string, unknown> = { ultima_interacao_em: agora }
    if (nome) upd.nome = nome
    if (email) upd.email = email
    if (faixa) upd.faixa_capital = faixa
    if (prioridade) upd.prioridade = prioridade
    if (perfil) upd.perfil = perfil
    if (vendedorId) upd.vendedor_id = vendedorId
    if (!atual.sdr_id) upd.sdr_id = autor
    if (!atual.origem) upd.origem = origem
    // Observação: acrescenta, nunca apaga o que o time escreveu
    if (observacao) {
      const anterior = (atual.observacao as string) || ''
      upd.observacao = anterior ? `${anterior}\n\n[Vitor] ${observacao}` : observacao
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

    const { error } = await db.from('leads').update(upd).eq('id', atual.id as string)
    if (error) return erro(500, 'Falha ao atualizar lead')
    if (novaEtapa) {
      await registrarMovimento(db, atual.id as string, etapaAtual, novaEtapa, autor,
        novaEtapa === 'declinado' ? 'Motivo: locacao (Vitor IA)' : 'Reativado pelo Vitor (IA)')
    }
    return ok({ id: atual.id, acao: 'atualizado', etapa: novaEtapa ?? etapaAtual })
  })
}
