import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  FUNIL_LABELS, FUNIL_ORDER, MOTIVO_PERDA_LABELS, TEMPERATURA_LABELS,
} from '@/types'

// Endpoint somente-leitura para que uma IA consulte e analise todo o CRM.
// Auth: header `x-ai-key` igual a AI_API_KEY (chave própria, nunca exposta no browser).

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

// Contorna o limite de 1000 linhas do Supabase
async function fetchAll(supabase: SupabaseClient, table: string, columns = '*') {
  const PAGE = 1000
  const result: Record<string, unknown>[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    result.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return result
}

type Row = Record<string, unknown>

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 100 : 0)
const countBy = (rows: Row[], key: string) =>
  rows.reduce<Record<string, number>>((acc, r) => {
    const k = (r[key] as string) || 'nao_informado'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

// Leads que chegaram pelo menos até a etapa (inclui fechados nas etapas anteriores)
const ATINGIU = (etapa: string) => {
  const idx = FUNIL_ORDER.indexOf(etapa as never)
  return (r: Row) => {
    const s = FUNIL_ORDER.indexOf(r.status_funil as never)
    return s >= idx && r.status_funil !== 'declinado'
  }
}
const isVenda = (r: Row) => r.status_funil === 'fechado' || r.status_funil === 'contrato_assinado'

function metricasGrupo(rows: Row[]) {
  const total = rows.length
  const vendas = rows.filter(isVenda)
  const receita = vendas.reduce((s, r) => s + num(r.valor_fechado ?? r.valor_contrato), 0)
  const agendados = rows.filter((r) => r.reuniao_agendada || ATINGIU('agendado')(r)).length
  const reunioes = rows.filter(ATINGIU('reuniao_realizada')).length
  const declinadosRows = rows.filter((r) => r.status_funil === 'declinado')
  const declinados = declinadosRows.length
  const tempos = rows.map((r) => r.tempo_resposta_segundos).filter((t): t is number => typeof t === 'number')
  return {
    total_leads: total,
    agendados,
    reunioes_realizadas: reunioes,
    vendas: vendas.length,
    declinados,
    receita_total: receita,
    ticket_medio: vendas.length ? Math.round(receita / vendas.length) : 0,
    pipeline_estimado: rows
      .filter((r) => !isVenda(r) && r.status_funil !== 'declinado')
      .reduce((s, r) => s + num(r.valor_estimado), 0),
    taxa_agendamento_pct: pct(agendados, total),
    taxa_comparecimento_pct: pct(reunioes, agendados),
    taxa_conversao_pct: pct(vendas.length, total),
    taxa_declinio_pct: pct(declinados, total),
    tempo_medio_resposta_min: tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length / 60)
      : null,
    motivos_perda: countBy(declinadosRows, 'motivo_perda'),
  }
}

function agrupar(rows: Row[], key: string) {
  const grupos: Record<string, Row[]> = {}
  for (const r of rows) {
    const k = (r[key] as string) || 'nao_informado'
    ;(grupos[k] ??= []).push(r)
  }
  return Object.entries(grupos)
    .map(([k, g]) => ({ [key]: k, ...metricasGrupo(g) }) as Row & ReturnType<typeof metricasGrupo>)
    .sort((a, b) => b.total_leads - a.total_leads)
}

type Grupo = ReturnType<typeof agrupar>[number]

// Top/bottom N de um agrupamento. Ignora "nao_informado" e grupos com poucos leads
// (evita 1 lead = 100% de conversão distorcer o ranking).
function ranking(grupos: Grupo[], key: string, minLeads: number, top: number) {
  const validos = grupos.filter((g) => g[key] !== 'nao_informado' && g.total_leads >= minLeads)
  const resumir = (g: Grupo) => {
    const motivo = Object.entries(g.motivos_perda).sort(([, a], [, b]) => b - a)[0]
    return {
      [key]: g[key],
      ...('vendedor_nome' in g ? { vendedor_nome: g.vendedor_nome } : {}),
      ...('sdr_nome' in g ? { sdr_nome: g.sdr_nome } : {}),
      total_leads: g.total_leads,
      vendas: g.vendas,
      declinados: g.declinados,
      receita_total: g.receita_total,
      taxa_agendamento_pct: g.taxa_agendamento_pct,
      taxa_conversao_pct: g.taxa_conversao_pct,
      taxa_declinio_pct: g.taxa_declinio_pct,
      principal_motivo_perda: motivo ? MOTIVO_PERDA_LABELS[motivo[0] as keyof typeof MOTIVO_PERDA_LABELS] ?? motivo[0] : null,
    }
  }
  const ordenar = (f: (a: Grupo, b: Grupo) => number) => [...validos].sort(f).slice(0, top).map(resumir)
  return {
    grupos_avaliados: validos.length,
    melhores_conversao: ordenar((a, b) => b.taxa_conversao_pct - a.taxa_conversao_pct || b.receita_total - a.receita_total),
    piores_conversao: ordenar((a, b) => a.taxa_conversao_pct - b.taxa_conversao_pct || b.taxa_declinio_pct - a.taxa_declinio_pct),
    maior_receita: ordenar((a, b) => b.receita_total - a.receita_total),
    mais_declinados: ordenar((a, b) => b.taxa_declinio_pct - a.taxa_declinio_pct || b.declinados - a.declinados),
    melhor_agendamento: ordenar((a, b) => b.taxa_agendamento_pct - a.taxa_agendamento_pct),
    pior_agendamento: ordenar((a, b) => a.taxa_agendamento_pct - b.taxa_agendamento_pct),
  }
}

const UTM_CAMPOS = {
  utm_source: 'Origem do tráfego (ex.: facebook, google, instagram)',
  utm_medium: 'Meio/tipo de mídia (ex.: cpc, organico)',
  utm_campaign: 'Campanha de anúncio',
  utm_content: 'Criativo (peça/vídeo/imagem do anúncio)',
  utm_term: 'Termo/palavra-chave ou público',
  utm_anuncio: 'Identificador do anúncio',
  utm_posicionamento: 'Posicionamento do anúncio (ex.: feed, stories, reels)',
} as const

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const key = req.headers.get('x-ai-key')
  if (!process.env.AI_API_KEY || key !== process.env.AI_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: x-ai-key inválida ou ausente' },
      { status: 401 }
    )
  }

  // ── Parâmetros ───────────────────────────────────────────────
  const sp = req.nextUrl.searchParams
  const inicio = sp.get('inicio')            // YYYY-MM-DD (data_criacao >=)
  const fim = sp.get('fim')                  // YYYY-MM-DD (data_criacao <=)
  const vendedorId = sp.get('vendedor_id')
  const incluir = new Set((sp.get('incluir') ?? 'leads,anotacoes,historico,metas').split(','))
  const incluirContato = sp.get('incluir_contato') === 'true'
  const minLeads = Math.max(1, parseInt(sp.get('min_leads') ?? '5', 10) || 5)  // mínimo de leads p/ entrar nos rankings
  const top = Math.max(1, parseInt(sp.get('top') ?? '5', 10) || 5)             // itens por ranking

  let users: Row[], leads: Row[], anotacoes: Row[], historico: Row[], metas: Row[], alertas: Row[]
  try {
    const supabase = getSupabaseAdmin()
    // Nunca seleciona senha nem tokens do Google
    ;[users, leads, anotacoes, historico, metas, alertas] = await Promise.all([
      fetchAll(supabase, 'users', 'id, nome, email, tipo, vendedor_vinculado, ativo'),
      fetchAll(supabase, 'leads'),
      incluir.has('anotacoes') ? fetchAll(supabase, 'anotacoes') : Promise.resolve([]),
      incluir.has('historico') ? fetchAll(supabase, 'historico_movimentacoes') : Promise.resolve([]),
      incluir.has('metas') ? fetchAll(supabase, 'metas') : Promise.resolve([]),
      fetchAll(supabase, 'alertas'),
    ])
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }

  // ── Filtros ──────────────────────────────────────────────────
  leads = leads.filter((l) => {
    const d = String(l.data_criacao ?? '')
    if (inicio && d < inicio) return false
    if (fim && d > fim) return false
    if (vendedorId && l.vendedor_id !== vendedorId) return false
    return true
  })
  const leadIds = new Set(leads.map((l) => l.id))
  anotacoes = anotacoes.filter((a) => leadIds.has(a.lead_id))
  historico = historico.filter((h) => leadIds.has(h.lead_id))
  alertas = alertas.filter((a) => leadIds.has(a.lead_id) && !a.resolvido)

  const nomeUsuario = Object.fromEntries(users.map((u) => [u.id, u.nome]))

  // ── Agregados ────────────────────────────────────────────────
  const funil = FUNIL_ORDER.map((etapa) => {
    const atual = leads.filter((l) => l.status_funil === etapa).length
    const atingiu = etapa === 'declinado' ? atual : leads.filter(ATINGIU(etapa)).length
    return { etapa, label: FUNIL_LABELS[etapa], leads_na_etapa: atual, leads_que_atingiram: atingiu }
  })

  const porVendedor = agrupar(leads, 'vendedor_id').map((v) => ({
    ...v, vendedor_nome: nomeUsuario[v.vendedor_id as string] ?? null,
  }))

  const porDia = Object.entries(countBy(leads, 'data_criacao'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, total]) => ({ data, total }))

  const agora = Date.now()
  const parados = leads
    .filter((l) => !isVenda(l) && l.status_funil !== 'declinado' && l.ultima_interacao_em)
    .map((l) => ({
      id: l.id, nome: l.nome, status_funil: l.status_funil, temperatura: l.temperatura,
      vendedor_nome: nomeUsuario[l.vendedor_id as string] ?? null,
      dias_sem_interacao: Math.floor((agora - new Date(l.ultima_interacao_em as string).getTime()) / 86400000),
    }))
    .filter((l) => l.dias_sem_interacao >= 3)
    .sort((a, b) => b.dias_sem_interacao - a.dias_sem_interacao)

  const porSdr = agrupar(leads.filter((l) => l.sdr_id), 'sdr_id').map((s) => ({
    ...s, sdr_nome: nomeUsuario[s.sdr_id as string] ?? null,
  }))
  const marketing = {
    por_source: agrupar(leads, 'utm_source'),
    por_medium: agrupar(leads, 'utm_medium'),
    por_campanha: agrupar(leads, 'utm_campaign'),
    por_criativo: agrupar(leads, 'utm_content'),
    por_termo: agrupar(leads, 'utm_term'),
    por_anuncio: agrupar(leads, 'utm_anuncio'),
    por_posicionamento: agrupar(leads, 'utm_posicionamento'),
  }

  const resumo = {
    geral: metricasGrupo(leads),
    funil,
    por_vendedor: porVendedor,
    por_sdr: porSdr,
    por_temperatura: countBy(leads, 'temperatura'),
    motivos_perda: countBy(leads.filter((l) => l.status_funil === 'declinado'), 'motivo_perda'),
    marketing,
    rankings: {
      criterio: `Só entram grupos com pelo menos ${minLeads} leads (param min_leads) e com valor informado; top ${top} por lista (param top).`,
      criativos: ranking(marketing.por_criativo, 'utm_content', minLeads, top),
      campanhas: ranking(marketing.por_campanha, 'utm_campaign', minLeads, top),
      sources: ranking(marketing.por_source, 'utm_source', minLeads, top),
      anuncios: ranking(marketing.por_anuncio, 'utm_anuncio', minLeads, top),
      posicionamentos: ranking(marketing.por_posicionamento, 'utm_posicionamento', minLeads, top),
      termos: ranking(marketing.por_termo, 'utm_term', minLeads, top),
      vendedores: ranking(porVendedor, 'vendedor_id', minLeads, top),
      sdrs: ranking(porSdr, 'sdr_id', minLeads, top),
    },
    leads_por_dia: porDia,
    leads_parados_3d_ou_mais: parados,
    alertas_abertos: alertas.length,
  }

  // ── Dados brutos (sem contato por padrão — LGPD) ─────────────
  const leadsSaida = leads.map((l) => {
    const { telefone, email, ...resto } = l
    return {
      ...resto,
      ...(incluirContato ? { telefone, email } : {}),
      vendedor_nome: nomeUsuario[l.vendedor_id as string] ?? null,
      sdr_nome: l.sdr_id ? nomeUsuario[l.sdr_id as string] ?? null : null,
    }
  })

  return NextResponse.json({
    success: true,
    gerado_em: new Date().toISOString(),
    filtros: { inicio, fim, vendedor_id: vendedorId, incluir: Array.from(incluir), incluir_contato: incluirContato, min_leads: minLeads, top },
    dicionario: {
      descricao: 'CRM de vendas. Cada lead percorre o funil (status_funil). "fechado" e "contrato_assinado" contam como venda; "declinado" é perda (ver motivo_perda). Receita = valor_fechado (ou valor_contrato). valor_estimado é a expectativa antes do fechamento.',
      como_analisar: 'Use resumo.rankings para saber melhores/piores criativos, campanhas, sources, anúncios, posicionamentos, vendedores e SDRs (conversão, receita, declínio, agendamento e principal motivo de perda). resumo.marketing traz as métricas completas de cada valor de UTM. Valores "nao_informado" = campo vazio no lead.',
      etapas_funil: FUNIL_LABELS,
      temperaturas: TEMPERATURA_LABELS,
      motivos_perda: MOTIVO_PERDA_LABELS,
      papeis_usuario: { admin: 'Administrador', vendedor: 'Closer/vendedor', sdr: 'Pré-vendas', marketing: 'Marketing' },
      vendedores: Object.fromEntries(users.filter((u) => u.tipo === 'vendedor').map((u) => [u.id, u.nome])),
      sdrs: Object.fromEntries(users.filter((u) => u.tipo === 'sdr').map((u) => [u.id, u.nome])),
      utm_campos: UTM_CAMPOS,
      // Valores distintos de cada UTM no período, com a quantidade de leads
      utm_valores: Object.fromEntries(
        Object.keys(UTM_CAMPOS).map((campo) => [campo, countBy(leads, campo)])
      ),
      metricas: {
        total_leads: 'Leads no grupo',
        agendados: 'Leads com reunião agendada (ou que passaram dessa etapa)',
        reunioes_realizadas: 'Leads que chegaram a reunião realizada',
        vendas: 'Leads em fechado/contrato_assinado',
        declinados: 'Leads perdidos (status declinado)',
        taxa_agendamento_pct: 'agendados / total_leads',
        taxa_comparecimento_pct: 'reunioes_realizadas / agendados',
        taxa_conversao_pct: 'vendas / total_leads',
        taxa_declinio_pct: 'declinados / total_leads',
        ticket_medio: 'receita_total / vendas',
        pipeline_estimado: 'Soma de valor_estimado dos leads ainda abertos',
        tempo_medio_resposta_min: 'Tempo médio até a primeira resposta, em minutos',
        motivos_perda: 'Contagem de motivo_perda entre os declinados do grupo',
      },
    },
    resumo,
    usuarios: users,
    ...(incluir.has('leads') ? { leads: leadsSaida } : {}),
    ...(incluir.has('anotacoes') ? { anotacoes } : {}),
    ...(incluir.has('historico') ? { historico_movimentacoes: historico } : {}),
    ...(incluir.has('metas') ? { metas } : {}),
  })
}
