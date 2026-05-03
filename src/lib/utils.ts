import type { Lead, MetricaCriativo, StatusFunil, GargaloItem, HistoricoMovimentacao } from '@/types'
import { FUNIL_LABELS } from '@/types'
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPhone(phone: string) {
  return phone
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string) {
  if (!date) return '-'
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

// Criativos com histórico de alta performance
const CRIATIVOS_PERFORMATICOS = [
  'video_depoimento_cliente',
  'carrossel_beneficios',
  'video_resultado_antes_depois',
]

// Estágios onde o lead de fato respondeu/engajou (agendou reunião ou avançou)
const RESPONDEU_STAGES: StatusFunil[] = [
  'agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado',
]

// ─── SCORE DE LEAD (0-100) ────────────────────────────────────────────────────
export function calcLeadScore(lead: Lead): number {
  let score = 0

  // Lead respondeu de fato (agendou reunião ou avançou além dos followups)
  // primeiro_contato / followup1-3 = tentativas de contato, sem resposta confirmada
  if (RESPONDEU_STAGES.includes(lead.status_funil)) score += 30

  // Reunião agendada
  if (lead.reuniao_agendada) score += 30

  // Temperatura
  const tempScore: Record<string, number> = {
    frio: 5,
    morno: 10,
    quente: 20,
    muito_quente: 30,
    desqualificado: 0,
  }
  score += tempScore[lead.temperatura] ?? 0

  // Criativo de alta performance
  if (lead.utm_content && CRIATIVOS_PERFORMATICOS.includes(lead.utm_content)) {
    score += 10
  }

  // Tempo de resposta < 10 min (600s)
  if (
    lead.tempo_resposta_segundos !== undefined &&
    lead.tempo_resposta_segundos < 600
  ) {
    score += 10
  }

  return Math.min(100, Math.max(0, score))
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald
  if (score >= 60) return '#6366f1' // indigo
  if (score >= 40) return '#f59e0b' // amber
  return '#ef4444' // red
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-600/20 text-emerald-400'
  if (score >= 60) return 'bg-indigo-600/20 text-indigo-400'
  if (score >= 40) return 'bg-amber-600/20 text-amber-400'
  return 'bg-red-600/20 text-red-400'
}

// ─── MÉTRICAS POR CRIATIVO ────────────────────────────────────────────────────
export function calcMetricasPorCriativo(leads: Lead[]): MetricaCriativo[] {
  const organicos = leads.filter((l) => !l.importado_externo)
  const grouped: Record<string, Lead[]> = {}

  for (const lead of organicos) {
    const key = lead.utm_content || 'sem_criativo'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(lead)
  }

  return Object.entries(grouped)
    .map(([utm_content, grupo]) => {
      const total = grupo.length
      const respondeu = grupo.filter((l) => RESPONDEU_STAGES.includes(l.status_funil)).length
      const agendou = grupo.filter((l) =>
        ['agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
      ).length
      const reuniaoFeita = grupo.filter((l) =>
        ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
      ).length
      const vendas = grupo.filter((l) => l.status_funil === 'fechado').length
      const desqualificados = grupo.filter(
        (l) => l.status_funil === 'declinado' || l.temperatura === 'desqualificado'
      ).length
      const receita = grupo
        .filter((l) => l.status_funil === 'fechado')
        .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
      const pipeline = grupo
        .filter((l) => !['fechado', 'declinado', 'trafego_pago'].includes(l.status_funil))
        .reduce((s, l) => s + (l.valor_contrato ?? 0), 0)

      const taxa_resposta = total > 0 ? (respondeu / total) * 100 : 0
      const taxa_agendamento = total > 0 ? (agendou / total) * 100 : 0
      const taxa_comparecimento = agendou > 0 ? (reuniaoFeita / agendou) * 100 : 0
      const taxa_conversao = total > 0 ? (vendas / total) * 100 : 0
      const taxa_desqualificacao = total > 0 ? (desqualificados / total) * 100 : 0
      const ticket_medio = vendas > 0 ? receita / vendas : 0

      const score =
        taxa_conversao * 2 +
        taxa_agendamento * 0.5 +
        receita / 1000 -
        taxa_desqualificacao * 0.5

      const lead0 = grupo[0]
      return {
        utm_content,
        utm_campaign: lead0?.utm_campaign,
        utm_source: lead0?.utm_source,
        total_leads: total,
        respondeu,
        agendou,
        reuniao_realizada: reuniaoFeita,
        vendas,
        desqualificados,
        receita_total: receita,
        valor_estimado_pipeline: pipeline,
        taxa_resposta,
        taxa_agendamento,
        taxa_comparecimento,
        taxa_conversao,
        taxa_desqualificacao,
        score,
        ticket_medio,
      }
    })
    .sort((a, b) => b.score - a.score)
}

// ─── MÉTRICAS GERAIS DO FUNIL ─────────────────────────────────────────────────
export function calcFunnelMetrics(leads: Lead[]) {
  // Leads orgânicos excluem importados externos — usados para contagens e taxas
  const organicos = leads.filter((l) => !l.importado_externo)

  const total = organicos.length
  const respondeu = organicos.filter((l) => RESPONDEU_STAGES.includes(l.status_funil)).length
  const agendados = organicos.filter((l) =>
    ['agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
  ).length
  // Reuniões e fechamentos contam de TODOS (incluindo importados)
  const reunioes = leads.filter((l) =>
    ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
  ).length
  const fechados = leads.filter((l) => l.status_funil === 'fechado').length
  const declinados = organicos.filter((l) => l.status_funil === 'declinado').length
  const receitaTotal = leads
    .filter((l) => l.status_funil === 'fechado')
    .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
  const ticketMedio = fechados > 0 ? receitaTotal / fechados : 0
  const pipelineTotal = organicos
    .filter((l) => !['fechado', 'declinado'].includes(l.status_funil))
    .reduce((s, l) => s + (l.valor_contrato ?? 0), 0)

  return {
    total,
    taxa_resposta: total > 0 ? (respondeu / total) * 100 : 0,
    taxa_agendamento: total > 0 ? (agendados / total) * 100 : 0,
    taxa_comparecimento: agendados > 0 ? (reunioes / agendados) * 100 : 0,
    taxa_fechamento: total > 0 ? (fechados / total) * 100 : 0,
    taxa_desqualificacao: total > 0 ? (declinados / total) * 100 : 0,
    respondeu,
    agendados,
    reunioes,
    fechados,
    declinados,
    receitaTotal,
    ticketMedio,
    pipelineTotal,
  }
}

// ─── GARGALOS DO FUNIL ────────────────────────────────────────────────────────
// Cada etapa inclui leads nela OU em etapas mais avançadas (excl. declinado)
const GARGALO_STAGES: { status: StatusFunil; includes: StatusFunil[] }[] = [
  {
    status: 'trafego_pago',
    includes: ['trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3',
      'agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'],
  },
  {
    status: 'primeiro_contato',
    includes: ['primeiro_contato', 'followup1', 'followup2', 'followup3',
      'agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'],
  },
  {
    status: 'agendado',
    includes: ['agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'],
  },
  {
    status: 'reuniao_realizada',
    includes: ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'],
  },
  {
    status: 'contrato_enviado',
    includes: ['contrato_enviado', 'contrato_assinado', 'fechado'],
  },
  {
    status: 'fechado',
    includes: ['fechado'],
  },
]

export function calcGargalos(leads: Lead[]): {
  stages: { status: StatusFunil; label: string; count: number }[]
  drops: GargaloItem[]
  maiorGargalo: GargaloItem | null
} {
  const stages = GARGALO_STAGES.map(({ status, includes }) => ({
    status,
    label: FUNIL_LABELS[status],
    count: leads.filter((l) => includes.includes(l.status_funil)).length,
  }))

  const drops: GargaloItem[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]
    const to = stages[i + 1]
    const perda = from.count - to.count
    const taxa_perda = from.count > 0 ? (perda / from.count) * 100 : 0
    drops.push({
      de: from.label,
      para: to.label,
      deStatus: from.status,
      paraStatus: to.status,
      entrada: from.count,
      saida: to.count,
      perda,
      taxa_perda,
    })
  }

  const maiorGargalo =
    drops.length > 0
      ? drops.reduce((max, d) => (d.taxa_perda > max.taxa_perda ? d : max), drops[0])
      : null

  return { stages, drops, maiorGargalo }
}

// ─── RECEITA POR DIMENSÃO ─────────────────────────────────────────────────────
export function calcReceitaPorDimensao(
  leads: Lead[],
  campo: 'utm_content' | 'utm_campaign' | 'utm_source'
) {
  const organicos = leads.filter((l) => !l.importado_externo)
  const mapa: Record<string, { receita: number; leads: number; vendas: number }> = {}
  for (const l of organicos) {
    const key = (l[campo] as string) || 'Desconhecido'
    if (!mapa[key]) mapa[key] = { receita: 0, leads: 0, vendas: 0 }
    mapa[key].leads++
    if (l.status_funil === 'fechado') {
      mapa[key].receita += l.valor_fechado ?? l.valor_contrato ?? 0
      mapa[key].vendas++
    }
  }
  return Object.entries(mapa)
    .map(([nome, d]) => ({ nome, ...d }))
    .sort((a, b) => b.receita - a.receita)
}

// ─── MÉTRICAS POR CAMPANHA ────────────────────────────────────────────────────
export function calcMetricasPorCampanha(leads: Lead[]) {
  const organicos = leads.filter((l) => !l.importado_externo)
  const grouped: Record<string, Lead[]> = {}
  for (const lead of organicos) {
    const key = lead.utm_campaign || 'sem_campanha'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(lead)
  }
  return Object.entries(grouped).map(([campanha, grupo]) => {
    const total = grupo.length
    const respondeu = grupo.filter((l) => RESPONDEU_STAGES.includes(l.status_funil)).length
    const agendou = grupo.filter((l) =>
      ['agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
    ).length
    const reuniaoFeita = grupo.filter((l) =>
      ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
    ).length
    const vendas = grupo.filter((l) => l.status_funil === 'fechado').length
    const desqualificados = grupo.filter((l) => l.status_funil === 'declinado').length
    const receita = grupo
      .filter((l) => l.status_funil === 'fechado')
      .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
    const pipeline = grupo
      .filter((l) => !['fechado', 'declinado', 'trafego_pago'].includes(l.status_funil))
      .reduce((s, l) => s + (l.valor_contrato ?? 0), 0)
    const ticket_medio = vendas > 0 ? receita / vendas : 0
    const taxa_resposta = total > 0 ? (respondeu / total) * 100 : 0
    const taxa_agendamento = total > 0 ? (agendou / total) * 100 : 0
    const taxa_conversao = total > 0 ? (vendas / total) * 100 : 0
    const taxa_comparecimento = agendou > 0 ? (reuniaoFeita / agendou) * 100 : 0
    const receita_por_lead = total > 0 ? receita / total : 0
    const fontes = [...new Set(grupo.map((l) => l.utm_source).filter(Boolean))] as string[]
    const score =
      taxa_conversao * 2 + taxa_agendamento * 0.5 + receita / 1000 - (desqualificados / total) * 100 * 0.5
    return {
      campanha,
      total_leads: total,
      respondeu,
      agendou,
      reuniao_realizada: reuniaoFeita,
      vendas,
      desqualificados,
      receita_total: receita,
      valor_estimado_pipeline: pipeline,
      ticket_medio,
      taxa_resposta,
      taxa_agendamento,
      taxa_conversao,
      taxa_comparecimento,
      receita_por_lead,
      score,
      fontes,
    }
  }).sort((a, b) => b.receita_total - a.receita_total)
}

// ─── MÉTRICAS POR VENDEDOR ────────────────────────────────────────────────────
export function calcMetricasPorVendedor(
  leads: Lead[],
  users: { id: string; nome: string; tipo: string }[],
  historico: { lead_id: string; para_status: string; usuario_id: string; data: string }[]
) {
  const agora = new Date()
  const diaSemana = agora.getDay() === 0 ? 6 : agora.getDay() - 1
  const inicioSemana = new Date(agora)
  inicioSemana.setDate(agora.getDate() - diaSemana)
  inicioSemana.setHours(0, 0, 0, 0)
  const isoSemana = inicioSemana.toISOString()

  return users
    .filter((u) => u.tipo === 'vendedor')
    .map((u) => {
      const vLeads = leads.filter((l) => l.vendedor_id === u.id)
      const total = vLeads.length
      const respondeu = vLeads.filter((l) => RESPONDEU_STAGES.includes(l.status_funil)).length
      const agendados = vLeads.filter((l) =>
        ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado'].includes(l.status_funil)
      ).length
      const reunioes = vLeads.filter((l) =>
        ['reuniao_realizada','contrato_enviado','contrato_assinado','fechado'].includes(l.status_funil)
      ).length
      const fechados = vLeads.filter((l) => l.status_funil === 'fechado').length
      const declinados = vLeads.filter((l) => l.status_funil === 'declinado').length
      const receita = vLeads
        .filter((l) => l.status_funil === 'fechado')
        .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
      const pipeline = vLeads
        .filter((l) => !['fechado','declinado'].includes(l.status_funil))
        .reduce((s, l) => s + (l.valor_contrato ?? 0), 0)
      const scoreMedio = total > 0
        ? vLeads.reduce((s, l) => s + (l.score_lead ?? 0), 0) / total
        : 0
      const leadsParados = vLeads.filter(
        (l) => !['fechado','declinado'].includes(l.status_funil) && isLeadParado(l)
      ).length
      const reunioesSemana = historico.filter(
        (h) => h.para_status === 'reuniao_realizada' && h.data >= isoSemana &&
                vLeads.some((l) => l.id === h.lead_id)
      ).length

      return {
        id: u.id,
        nome: u.nome,
        total,
        respondeu,
        agendados,
        reunioes,
        reunioesSemana,
        fechados,
        declinados,
        receita,
        pipeline,
        ticketMedio: fechados > 0 ? receita / fechados : 0,
        taxaConversao: total > 0 ? (fechados / total) * 100 : 0,
        taxaAgendamento: total > 0 ? (agendados / total) * 100 : 0,
        taxaResposta: total > 0 ? (respondeu / total) * 100 : 0,
        scoreMedio,
        leadsParados,
      }
    })
    .sort((a, b) => b.receita - a.receita)
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
export function leadsPerVendedor(leads: Lead[], userId: string) {
  return leads.filter((l) => l.vendedor_id === userId)
}

const STATUS_STEPS: Record<StatusFunil, number> = {
  trafego_pago: 0,
  primeiro_contato: 1,
  followup1: 2,
  followup2: 3,
  followup3: 4,
  agendado: 5,
  reuniao_realizada: 6,
  contrato_enviado: 7,
  contrato_assinado: 8,
  fechado: 9,
  declinado: -1,
}

export function getStatusStep(s: StatusFunil) {
  return STATUS_STEPS[s]
}

// Detecta se lead está "parado" (ultima_interacao > 24h)
export function isLeadParado(lead: Lead): boolean {
  if (['fechado', 'declinado'].includes(lead.status_funil)) return false
  const ref = lead.ultima_interacao_em ?? lead.data_criacao
  const hours = (Date.now() - new Date(ref).getTime()) / 3_600_000
  return hours > 24
}

// Detecta se follow-up está atrasado (> 48h em etapa de followup)
export function isFollowupAtrasado(lead: Lead): boolean {
  if (!['followup1', 'followup2', 'followup3'].includes(lead.status_funil)) return false
  const ref = lead.ultima_interacao_em ?? lead.data_criacao
  const hours = (Date.now() - new Date(ref).getTime()) / 3_600_000
  return hours > 48
}

// ─── CONVERSÃO REAL POR ETAPA (baseada no histórico) ──────────────────────────
// Para cada transição consecutiva do funil, calcula quantos leads que entraram
// na etapa X avançaram para X+1, foram declinados, ou ficaram parados.
export interface ConversaoEtapa {
  etapa: StatusFunil
  label: string
  entradas: number
  avancou: number
  declinado: number
  parado: number
  taxaAvanco: number
}

export function calcConversaoPorEtapa(
  historico: HistoricoMovimentacao[],
  leadIds: Set<string>
): ConversaoEtapa[] {
  const ETAPAS: StatusFunil[] = [
    'trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3',
    'agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado',
  ]

  // Filtrar pelo conjunto de leads e ordenar por data
  const hist = historico
    .filter((h) => leadIds.has(h.lead_id))
    .sort((a, b) => a.data.localeCompare(b.data))

  // Agrupar por lead
  const byLead: Record<string, HistoricoMovimentacao[]> = {}
  for (const h of hist) {
    if (!byLead[h.lead_id]) byLead[h.lead_id] = []
    byLead[h.lead_id].push(h)
  }

  return ETAPAS.map((etapa, idx) => {
    const proximaEtapa = ETAPAS[idx + 1] ?? null

    // Leads que entraram nesta etapa
    const leadsEntrados = new Set<string>()
    for (const [leadId, movs] of Object.entries(byLead)) {
      if (movs.some((m) => m.para_status === etapa)) leadsEntrados.add(leadId)
    }

    let avancou = 0
    let declinado = 0

    for (const leadId of leadsEntrados) {
      const movs = byLead[leadId]
      // Última vez que o lead entrou nesta etapa
      const lastIdx = [...movs].reverse().findIndex((m) => m.para_status === etapa)
      if (lastIdx === -1) continue
      const lastEntradaData = movs[movs.length - 1 - lastIdx].data
      // Movimentações posteriores a essa entrada
      const depois = movs.filter((m) => m.data > lastEntradaData)
      if (proximaEtapa && depois.some((m) => m.para_status === proximaEtapa)) {
        avancou++
      } else if (depois.some((m) => m.para_status === 'declinado')) {
        declinado++
      }
    }

    const entradas = leadsEntrados.size
    const parado = entradas - avancou - declinado
    const taxaAvanco = entradas > 0 ? (avancou / entradas) * 100 : 0

    return { etapa, label: FUNIL_LABELS[etapa], entradas, avancou, declinado, parado, taxaAvanco }
  })
}
