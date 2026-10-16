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
  const declinados = rows.filter((r) => r.status_funil === 'declinado').length
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

  const resumo = {
    geral: metricasGrupo(leads),
    funil,
    por_vendedor: porVendedor,
    por_sdr: agrupar(leads.filter((l) => l.sdr_id), 'sdr_id').map((s) => ({
      ...s, sdr_nome: nomeUsuario[s.sdr_id as string] ?? null,
    })),
    por_temperatura: countBy(leads, 'temperatura'),
    motivos_perda: countBy(leads.filter((l) => l.status_funil === 'declinado'), 'motivo_perda'),
    marketing: {
      por_source: agrupar(leads, 'utm_source'),
      por_campanha: agrupar(leads, 'utm_campaign'),
      por_criativo: agrupar(leads, 'utm_content'),
      por_posicionamento: agrupar(leads, 'utm_posicionamento'),
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
    filtros: { inicio, fim, vendedor_id: vendedorId, incluir: Array.from(incluir), incluir_contato: incluirContato },
    dicionario: {
      descricao: 'CRM de vendas. Cada lead percorre o funil (status_funil). "fechado" e "contrato_assinado" contam como venda; "declinado" é perda (ver motivo_perda). Receita = valor_fechado (ou valor_contrato). valor_estimado é a expectativa antes do fechamento.',
      etapas_funil: FUNIL_LABELS,
      temperaturas: TEMPERATURA_LABELS,
      motivos_perda: MOTIVO_PERDA_LABELS,
      papeis_usuario: { admin: 'Administrador', vendedor: 'Closer/vendedor', sdr: 'Pré-vendas', marketing: 'Marketing' },
    },
    resumo,
    usuarios: users,
    ...(incluir.has('leads') ? { leads: leadsSaida } : {}),
    ...(incluir.has('anotacoes') ? { anotacoes } : {}),
    ...(incluir.has('historico') ? { historico_movimentacoes: historico } : {}),
    ...(incluir.has('metas') ? { metas } : {}),
  })
}
