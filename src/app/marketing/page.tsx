'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import {
  calcMetricasPorCriativo, calcMetricasPorCampanha,
  calcReceitaPorDimensao, formatCurrency, cn,
} from '@/lib/utils'
import {
  Trophy, AlertTriangle, ChevronUp, ChevronDown, Download,
  Star, Zap, Target, TrendingUp, TrendingDown, DollarSign, Users,
  Layers, Filter, BarChart2, Rocket, PauseCircle,
  CheckCircle, Settings2, Calendar, ArrowUpRight, X, GitCompare, Flame,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import type { Lead } from '@/types'

// ── Paleta ────────────────────────────────────────────────────────────────────
const BLUE    = '#2563eb'
const BLUE_L  = '#3b82f6'
const GREEN   = '#059669'
const GREEN_L = '#10b981'
const SKY     = '#0ea5e9'
const AMBER   = '#d97706'
const RED     = '#dc2626'
const VIOLET  = '#7c3aed'
const CHART_PALETTE = [BLUE, GREEN, SKY, VIOLET, AMBER, RED, '#ec4899', '#14b8a6']

const CAMPAIGN_LABELS: Record<string, string> = {
  lancamento_produto_q1: 'Lançamento Produto Q1',
  search_marca_q1:       'Search Marca Q1',
  remarketing_q1:        'Remarketing Q1',
  brand_awareness_q1:    'Brand Awareness Q1',
}

const CRIATIVO_LABELS: Record<string, string> = {
  video_depoimento_cliente:     'Vídeo Depoimento',
  carrossel_beneficios:         'Carrossel Benefícios',
  imagem_prova_social:          'Imagem Prova Social',
  video_resultado_antes_depois: 'Vídeo Antes/Depois',
  banner_desconto_30:           'Banner Desconto 30%',
  reels_duvidas_frequentes:     'Reels Dúvidas',
  sem_criativo:                 'Sem Criativo',
}

const SOURCE_COLORS: Record<string, string> = {
  facebook:  BLUE,
  google:    '#ea4335',
  instagram: VIOLET,
  youtube:   RED,
  linkedin:  '#0a66c2',
}

type Tab = 'campanhas' | 'criativos' | 'decisao' | 'calor'
type HeatMetric = 'leads' | 'agendamentos' | 'vendas'
type Period = 'todos' | '7d' | '30d' | '90d' | 'custom'
type SortKey =
  | 'utm_content' | 'total_leads' | 'taxa_resposta' | 'taxa_agendamento'
  | 'taxa_conversao' | 'vendas' | 'receita_total' | 'ticket_medio' | 'score'
  | 'desqualificados' | 'taxa_desqualificacao'
type SortDir = 'asc' | 'desc'
type CampSortKey = 'campanha' | 'total_leads' | 'taxa_agendamento' | 'taxa_conversao' | 'vendas' | 'receita_total' | 'ticket_medio' | 'score' | 'desqualificados' | 'taxa_desq'

// ── Helpers ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border shadow-2xl p-3 text-sm"
      style={{ background: '#FFFFFF', borderColor: '#E0E6ED' }}>
      <p className="font-semibold text-text-primary mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.color }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="font-bold text-text-bright">
            {typeof p.value === 'number' && p.name.toLowerCase().includes('receita')
              ? formatCurrency(p.value)
              : p.name.includes('%') || p.name.includes('Taxa')
                ? `${p.value}%`
                : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp size={12} style={{ color: '#3d5a7a' }} />
  return dir === 'asc'
    ? <ChevronUp size={12} style={{ color: BLUE_L }} />
    : <ChevronDown size={12} style={{ color: BLUE_L }} />
}

function PercentBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 rounded-full h-1.5 flex-shrink-0" style={{ background: '#E0E6ED' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{value.toFixed(0)}%</span>
    </div>
  )
}

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? score / max : 0
  const color = pct > 0.7 ? GREEN : pct > 0.4 ? AMBER : RED
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#E0E6ED" strokeWidth="3" />
        <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${pct * 87.96} 87.96`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold"
        style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  )
}

type Recomendacao = 'escalar' | 'manter' | 'otimizar' | 'pausar'
const REC_CONFIG: Record<Recomendacao, { label: string; icon: React.ElementType; color: string; bg: string; desc: string }> = {
  escalar:  { label: 'ESCALAR',  icon: Rocket,       color: GREEN_L, bg: 'rgba(16,185,129,0.1)', desc: 'Alta conversão e receita. Aumente o orçamento.' },
  manter:   { label: 'MANTER',   icon: CheckCircle,  color: BLUE_L,  bg: 'rgba(59,130,246,0.1)', desc: 'Performance estável. Mantenha o investimento.' },
  otimizar: { label: 'OTIMIZAR', icon: Settings2,    color: AMBER,   bg: 'rgba(217,119,6,0.1)',  desc: 'Potencial, mas precisa de ajustes criativos.' },
  pausar:   { label: 'PAUSAR',   icon: PauseCircle,  color: RED,     bg: 'rgba(220,38,38,0.1)',  desc: 'Baixo retorno. Reavalie antes de investir.' },
}

function getRecomendacao(taxa_conv: number, ticket: number, taxa_agend: number): Recomendacao {
  if (taxa_conv >= 15 && ticket >= 5000) return 'escalar'
  if (taxa_conv >= 15 || (taxa_conv >= 8 && ticket >= 3000)) return 'manter'
  if (taxa_conv >= 4 || taxa_agend >= 20) return 'otimizar'
  return 'pausar'
}

// ── Evolução de criativo por semana ───────────────────────────────────────────
const RESPONDEU_EV = ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado']
function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().slice(0, 10)
}
function calcCriativoEvolution(leads: Lead[], criativo: string) {
  const crLeads = leads.filter((l) => l.utm_content === criativo)
  const map: Record<string, { leads: number; agendou: number; vendas: number }> = {}
  for (const l of crLeads) {
    const k = getWeekKey(l.data_criacao)
    if (!map[k]) map[k] = { leads: 0, agendou: 0, vendas: 0 }
    map[k].leads++
    if (RESPONDEU_EV.includes(l.status_funil)) map[k].agendou++
    if (l.status_funil === 'fechado') map[k].vendas++
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, d]) => ({
      semana: semana.slice(5),
      Leads: d.leads,
      Agendamentos: d.agendou,
      Vendas: d.vendas,
      'Conv. (%)': d.leads > 0 ? parseFloat(((d.vendas / d.leads) * 100).toFixed(1)) : 0,
    }))
}

function calcCriativoDailyLeads(leads: Lead[], criativo: string) {
  const crLeads = leads.filter((l) => l.utm_content === criativo)
  const map: Record<string, { leads: number; agendou: number; vendas: number }> = {}
  for (const l of crLeads) {
    const k = l.data_criacao.slice(0, 10)
    if (!map[k]) map[k] = { leads: 0, agendou: 0, vendas: 0 }
    map[k].leads++
    if (RESPONDEU_EV.includes(l.status_funil)) map[k].agendou++
    if (l.status_funil === 'fechado') map[k].vendas++
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, d]) => ({
      data: data.slice(5).replace('-', '/'),
      Leads: d.leads,
      Agendamentos: d.agendou,
      Vendas: d.vendas,
    }))
}

// ── Criativo Drawer ──────────────────────────────────────────────────────────
const DRAWER_STATUS_LABELS: Record<string, string> = {
  trafego_pago: 'Tráfego', primeiro_contato: '1o Contato', followup1: 'Follow-up 1',
  followup2: 'Follow-up 2', followup3: 'Follow-up 3', agendado: 'Agendado',
  reuniao_realizada: 'Reunião', contrato_enviado: 'Ctr. Env.', contrato_assinado: 'Ctr. Ass.',
  fechado: 'Fechado', declinado: 'Declinado',
}
const DRAWER_STATUS_COLORS: Record<string, string> = {
  trafego_pago: '#6B7C93', primeiro_contato: '#3B82F6', followup1: '#60A5FA',
  followup2: '#818CF8', followup3: '#A78BFA', agendado: '#F59E0B',
  reuniao_realizada: '#F97316', contrato_enviado: '#8B5CF6', contrato_assinado: '#7C3AED',
  fechado: '#10B981', declinado: '#EF4444',
}
const DRAWER_TEMP_COLORS: Record<string, string> = {
  frio: '#60a5fa', morno: '#f59e0b', quente: '#f97316', muito_quente: '#ef4444', desqualificado: '#9CA3AF',
}
const DRAWER_TEMP_LABELS: Record<string, string> = {
  frio: 'Frio', morno: 'Morno', quente: 'Quente', muito_quente: 'M. Quente', desqualificado: 'Desq.',
}
const DRAWER_FUNIL_ORDER = [
  'trafego_pago','primeiro_contato','followup1','followup2','followup3',
  'agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado',
]
const AGENDOU_DRAWER = ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado']

function CriativoDrawer({ criativo, leads, users, onClose }: {
  criativo: string
  leads: Lead[]
  users: { id: string; nome: string }[]
  onClose: () => void
}) {
  const router = useRouter()
  const crLeads = leads.filter((l) => l.utm_content === criativo)

  const totalLeads  = crLeads.length
  const agendados   = crLeads.filter((l) => AGENDOU_DRAWER.includes(l.status_funil)).length
  const vendas      = crLeads.filter((l) => l.status_funil === 'fechado').length
  const declinados  = crLeads.filter((l) => l.status_funil === 'declinado').length
  const receita     = crLeads.filter((l) => l.status_funil === 'fechado')
                        .reduce((s, l) => s + (l.valor_fechado || 0), 0)
  const pipeline    = crLeads.filter((l) => !['fechado','declinado'].includes(l.status_funil))
                        .reduce((s, l) => {
                          const v = l.valor_contrato ?? parseFloat(l.valor_estimado || '0')
                          return s + (isNaN(v) ? 0 : v)
                        }, 0)
  const ticketMedio = vendas > 0 ? receita / vendas : 0
  const taxaConv    = totalLeads > 0 ? (vendas / totalLeads) * 100 : 0
  const taxaAgend   = totalLeads > 0 ? (agendados / totalLeads) * 100 : 0

  const funilData = DRAWER_FUNIL_ORDER
    .map((s) => ({ s, label: DRAWER_STATUS_LABELS[s], count: crLeads.filter((l) => l.status_funil === s).length, color: DRAWER_STATUS_COLORS[s] }))
    .filter((d) => d.count > 0)
  const maxFunil = Math.max(...funilData.map((d) => d.count), 1)

  const tempDist = ['frio','morno','quente','muito_quente','desqualificado']
    .map((t) => ({ t, label: DRAWER_TEMP_LABELS[t], count: crLeads.filter((l) => l.temperatura === t).length, color: DRAWER_TEMP_COLORS[t] }))
    .filter((d) => d.count > 0)

  const evData    = calcCriativoEvolution(leads, criativo)
  const dailyData = calcCriativoDailyLeads(leads, criativo)

  const campanha = crLeads[0]?.utm_campaign || ''
  const fonte    = crLeads[0]?.utm_source || ''

  const getName = (id: string) => users.find((u) => u.id === id)?.nome?.split(' ')[0] || '—'

  // Leads por vendedor (pizza)
  const vendedorMap: Record<string, number> = {}
  for (const l of crLeads) {
    const nome = getName(l.vendedor_id)
    vendedorMap[nome] = (vendedorMap[nome] || 0) + 1
  }
  const vendedorData = Object.entries(vendedorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Radar de performance
  const radarData = [
    { metric: 'Resposta',     valor: parseFloat(taxaAgend.toFixed(1)) },
    { metric: 'Agendamento',  valor: parseFloat(taxaAgend.toFixed(1)) },
    { metric: 'Conversão',    valor: parseFloat(taxaConv.toFixed(1)) },
    { metric: 'Desqual.',     valor: totalLeads > 0 ? parseFloat(((declinados / totalLeads) * 100).toFixed(1)) : 0 },
    { metric: 'Pipeline',     valor: pipeline > 0 ? Math.min(100, parseFloat((pipeline / 5000).toFixed(1))) : 0 },
  ]

  const kpis = [
    { label: 'Total Leads',    value: totalLeads,  fmt: (v: number) => String(v),           color: BLUE_L,  icon: Users      },
    { label: 'Agendamentos',   value: agendados,   fmt: (v: number) => String(v),           color: AMBER,   icon: Calendar   },
    { label: 'Vendas',         value: vendas,      fmt: (v: number) => String(v),           color: GREEN_L, icon: Trophy     },
    { label: 'Receita',        value: receita,     fmt: formatCurrency,                     color: GREEN,   icon: DollarSign },
    { label: 'Ticket Médio',   value: ticketMedio, fmt: formatCurrency,                     color: SKY,     icon: Target     },
    { label: 'Taxa Conversão', value: taxaConv,    fmt: (v: number) => `${v.toFixed(1)}%`, color: VIOLET,  icon: TrendingUp },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose}
        style={{ background: 'rgba(31,45,61,0.18)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-screen z-50 flex flex-col"
        style={{ width: 800, background: '#FFFFFF', borderLeft: '1px solid #E0E6ED', boxShadow: '-8px 0 40px rgba(31,45,61,0.12)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #E0E6ED' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                  <Layers size={14} className="text-white" />
                </div>
                <h2 className="text-base font-bold text-[#1F2D3D]">{CRIATIVO_LABELS[criativo] || criativo}</h2>
              </div>
              <div className="flex items-center gap-2 ml-10 flex-wrap">
                {fonte && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: `${SOURCE_COLORS[fonte] || BLUE}15`, color: SOURCE_COLORS[fonte] || BLUE }}>
                    {fonte}
                  </span>
                )}
                {campanha && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[180px]"
                    title={CAMPAIGN_LABELS[campanha] || campanha}
                    style={{ background: '#F5F7FA', color: '#6B7C93', border: '1px solid #E0E6ED' }}>
                    {CAMPAIGN_LABELS[campanha] || campanha}
                  </span>
                )}
                <span className="text-[10px] text-[#A0AEC0]">{totalLeads} leads no período</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] transition-colors flex-shrink-0 mt-0.5">
              <X size={16} className="text-[#6B7C93]" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: '#F5F7FA' }}>

          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${k.color}15` }}>
                    <k.icon size={12} style={{ color: k.color }} />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">{k.label}</p>
                </div>
                <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.fmt(k.value)}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats bar */}
          <div className="rounded-xl px-5 py-4 flex items-center gap-5 flex-wrap"
            style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">Taxa Agend.</p>
              <p className="text-lg font-extrabold mt-0.5" style={{ color: AMBER }}>{taxaAgend.toFixed(1)}%</p>
            </div>
            <div className="w-px h-10 flex-shrink-0" style={{ background: '#E0E6ED' }} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">Declinados</p>
              <p className="text-lg font-extrabold mt-0.5" style={{ color: RED }}>{declinados}</p>
            </div>
            <div className="w-px h-10 flex-shrink-0" style={{ background: '#E0E6ED' }} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">Pipeline</p>
              <p className="text-lg font-extrabold mt-0.5" style={{ color: SKY }}>{formatCurrency(pipeline)}</p>
            </div>
            <div className="w-px h-10 flex-shrink-0" style={{ background: '#E0E6ED' }} />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-2">Temperatura</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tempDist.map((td) => (
                  <span key={td.t} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: `${td.color}15`, color: td.color, border: `1px solid ${td.color}25` }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: td.color }} />
                    {td.label} <span className="font-extrabold">{td.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Área chart diária (onda) ─────────────────────────────────── */}
          <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0]">Entradas Diárias de Leads</p>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${BLUE_L}15`, color: BLUE_L }}>{dailyData.length} dias</span>
            </div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyData} margin={{ left: -20, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BLUE_L}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BLUE_L}  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAgend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={AMBER}   stopOpacity={0.2} />
                      <stop offset="95%" stopColor={AMBER}   stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={GREEN_L} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GREEN_L} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                  <XAxis dataKey="data" tick={{ fill: '#A0AEC0', fontSize: 9 }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(dailyData.length / 8) - 1)} />
                  <YAxis tick={{ fill: '#A0AEC0', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 9, color: '#A0AEC0' }} />
                  <Area type="monotone" dataKey="Leads"        stroke={BLUE_L}  strokeWidth={2} fill="url(#gradLeads)"  dot={false} />
                  <Area type="monotone" dataKey="Agendamentos" stroke={AMBER}   strokeWidth={2} fill="url(#gradAgend)"  dot={false} />
                  <Area type="monotone" dataKey="Vendas"       stroke={GREEN_L} strokeWidth={2} fill="url(#gradVendas)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-[#A0AEC0] text-sm">Sem dados suficientes</div>
            )}
          </div>

          {/* ── Pizza vendedor + Funil + Radar ───────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">

            {/* Pizza: leads por vendedor */}
            <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-3">Leads por Vendedor</p>
              {vendedorData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={vendedorData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={38} outerRadius={62}
                        paddingAngle={3} strokeWidth={0}>
                        {vendedorData.map((_, i) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [`${v} leads`, name]}
                        contentStyle={{ background: '#1F2D3D', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {vendedorData.map((v, i) => (
                      <div key={v.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                          <span className="text-[10px] text-[#6B7C93] truncate max-w-[80px]">{v.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#1F2D3D]">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[140px] text-[#A0AEC0] text-xs">Sem dados</div>
              )}
            </div>

            {/* Funil distribution */}
            <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-3">Distribuição no Funil</p>
              <div className="space-y-2">
                {funilData.map((d) => (
                  <div key={d.s} className="flex items-center gap-2">
                    <span className="text-[9px] font-medium text-[#6B7C93] w-20 flex-shrink-0 text-right truncate">{d.label}</span>
                    <div className="flex-1 h-4 rounded-md relative overflow-hidden" style={{ background: '#F5F7FA' }}>
                      <div className="h-full rounded-md"
                        style={{ width: `${(d.count / maxFunil) * 100}%`, background: `${d.color}25`, borderLeft: `3px solid ${d.color}` }} />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: d.color }}>{d.count}</span>
                    </div>
                    <span className="text-[9px] font-semibold w-6 text-right flex-shrink-0" style={{ color: '#A0AEC0' }}>
                      {((d.count / totalLeads) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar: performance */}
            <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-3">Performance (%)</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <PolarGrid stroke="#E0E6ED" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B7C93', fontSize: 9, fontWeight: 600 }} />
                  <Radar name="Criativo" dataKey="valor" stroke={VIOLET}
                    fill={VIOLET} fillOpacity={0.18} strokeWidth={2} dot={{ r: 3, fill: VIOLET }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`]}
                    contentStyle={{ background: '#1F2D3D', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Evolução Semanal (linha) ──────────────────────────────────── */}
          <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-4">Evolução Semanal</p>
            {evData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={evData} margin={{ left: -20, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill: '#A0AEC0', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A0AEC0', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 9, color: '#A0AEC0' }} />
                  <Line type="monotone" dataKey="Leads"        stroke={BLUE_L}  strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Agendamentos" stroke={AMBER}   strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Vendas"       stroke={GREEN_L} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-[#A0AEC0] text-sm">Sem dados suficientes</div>
            )}
          </div>

          {/* Leads table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ background: '#FFFFFF', borderBottom: '1px solid #E0E6ED' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#A0AEC0]">
                Leads Vinculados
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#F5F7FA', color: '#6B7C93', border: '1px solid #E0E6ED' }}>
                {crLeads.length} leads
              </span>
            </div>
            <div style={{ background: '#FFFFFF' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F5F7FA', background: '#F5F7FA' }}>
                    {['Nome','Status','Temp.','Vendedor','Data','Valor'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...crLeads]
                    .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())
                    .map((lead) => {
                      const sc = DRAWER_STATUS_COLORS[lead.status_funil] || '#6B7C93'
                      const tc = DRAWER_TEMP_COLORS[lead.temperatura]   || '#9CA3AF'
                      const valor = lead.valor_fechado || parseFloat(lead.valor_estimado || '0') || 0
                      return (
                        <tr key={lead.id}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          style={{ borderBottom: '1px solid #F5F7FA', cursor: 'pointer' }}
                          className="hover:bg-[#F5F7FA] transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-semibold text-[#1F2D3D] truncate max-w-[130px]">{lead.nome}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${sc}15`, color: sc }}>
                              {DRAWER_STATUS_LABELS[lead.status_funil]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: tc }}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tc }} />
                              {DRAWER_TEMP_LABELS[lead.temperatura]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-[#6B7C93]">{getName(lead.vendedor_id)}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] text-[#A0AEC0] font-mono">{lead.data_criacao}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-semibold" style={{ color: valor > 0 ? GREEN_L : '#D1D9E6' }}>
                              {valor > 0 ? formatCurrency(valor) : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function downloadXLS(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const headerRow = headers.map((h) => `<th style="background:#1E8E5A;color:#fff;font-weight:bold">${esc(h)}</th>`).join('')
  const dataRows = data.map((row) =>
    `<tr>${headers.map((h) => {
      const v = row[h]
      const isNum = typeof v === 'number'
      return `<td${isNum ? ' style="mso-number-format:General"' : ''}>${esc(v)}</td>`
    }).join('')}</tr>`
  ).join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Relatório</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table></body></html>`
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Mapa de Calor ─────────────────────────────────────────────────────────────
const HEAT_DAYS  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const HEAT_HOURS = Array.from({ length: 24 }, (_, i) => i)
const AGENDOU_HEAT = ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado']

function buildHeatMatrix(leads: Lead[], metric: HeatMetric): number[][] {
  // matrix[dayIdx 0=Seg..6=Dom][hora 0..23]
  const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const l of leads) {
    const ts = l.created_at || (l.data_criacao + 'T12:00:00')
    const d = new Date(ts)
    if (isNaN(d.getTime())) continue
    const jsDay = d.getDay() // 0=Dom..6=Sáb
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1 // 0=Seg..6=Dom
    const hour = d.getHours()
    const include =
      metric === 'leads' ? true :
      metric === 'agendamentos' ? AGENDOU_HEAT.includes(l.status_funil) :
      l.status_funil === 'fechado'
    if (include) m[dayIdx][hour]++
  }
  return m
}

function heatColor(val: number, maxVal: number): string {
  if (val === 0 || maxVal === 0) return '#F0F4F8'
  const pct = val / maxVal
  if (pct <= 0.15) return '#D1FAE5'
  if (pct <= 0.35) return '#6EE7B7'
  if (pct <= 0.60) return '#2FBF71'
  if (pct <= 0.80) return '#1E8E5A'
  return '#14532D'
}

function heatTextColor(val: number, maxVal: number): string {
  if (val === 0 || maxVal === 0) return 'transparent'
  const pct = val / maxVal
  return pct >= 0.35 ? '#fff' : '#1F2D3D'
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function MarketingPage() {
  const { leads: allLeads, users, currentUser } = useApp()

  // Filtro por perfil
  const leads = useMemo(() => {
    if (currentUser?.tipo === 'vendedor') {
      return allLeads.filter((l) => l.vendedor_id === currentUser.id)
    }
    if (currentUser?.tipo === 'sdr') {
      const vinculados = currentUser.vendedorVinculado
        ? currentUser.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      return allLeads.filter((l) => l.sdr_id === currentUser.id || vinculados.includes(l.vendedor_id))
    }
    // admin e marketing veem tudo
    return allLeads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLeads, currentUser])
  const [tab, setTab]               = useState<Tab>('campanhas')
  const [heatMetric, setHeatMetric] = useState<HeatMetric>('leads')
  const [period, setPeriod]         = useState<Period>('todos')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [compFrom, setCompFrom]     = useState('')
  const [compTo, setCompTo]         = useState('')
  const [campFiltro, setCampFiltro] = useState('todas')
  const [fonteFiltro, setFonteFiltro] = useState('todas')
  const [sortKey, setSortKey]       = useState<SortKey>('score')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')
  const [selectedCriativo, setSelectedCriativo] = useState<string | null>(null)
  const [expandedCampanhas, setExpandedCampanhas] = useState<Set<string>>(new Set())
  const [campSortKey, setCampSortKey] = useState<CampSortKey>('score')
  const [campSortDir, setCampSortDir] = useState<SortDir>('desc')
  const [crSubSortKey, setCrSubSortKey] = useState<SortKey>('score')
  const [crSubSortDir, setCrSubSortDir] = useState<SortDir>('desc')

  // ── Filtro por período ─────────────────────────────────────────────────────
  const maxDate = useMemo(() => {
    if (!leads.length) return new Date()
    return new Date(Math.max(...leads.map((l) => new Date(l.data_criacao).getTime())))
  }, [leads])

  function applyDateFilters(list: Lead[], from: string, to: string, per: Period) {
    if (from || to) {
      list = list.filter((l) => {
        if (from && l.data_criacao < from) return false
        if (to   && l.data_criacao > to)   return false
        return true
      })
    } else if (per !== 'todos' && per !== 'custom') {
      const dias = per === '7d' ? 7 : per === '30d' ? 30 : 90
      const cutoff = new Date(maxDate.getTime() - dias * 86400000)
      list = list.filter((l) => new Date(l.data_criacao) >= cutoff)
    }
    return list
  }

  const filteredLeads = useMemo(() => {
    let result = applyDateFilters(leads, dateFrom, dateTo, period)
    if (campFiltro !== 'todas') result = result.filter((l) => l.utm_campaign === campFiltro)
    if (fonteFiltro !== 'todas') result = result.filter((l) => l.utm_source === fonteFiltro)
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, period, dateFrom, dateTo, campFiltro, fonteFiltro, maxDate])

  const filteredLeadsB = useMemo(() => {
    if (!compareMode || (!compFrom && !compTo)) return [] as Lead[]
    let result = applyDateFilters(leads, compFrom, compTo, 'custom')
    if (campFiltro !== 'todas') result = result.filter((l) => l.utm_campaign === campFiltro)
    if (fonteFiltro !== 'todas') result = result.filter((l) => l.utm_source === fonteFiltro)
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, compareMode, compFrom, compTo, campFiltro, fonteFiltro])

  // ── Dados derivados ────────────────────────────────────────────────────────
  const heatMatrix   = useMemo(() => buildHeatMatrix(filteredLeads, heatMetric), [filteredLeads, heatMetric])
  const heatMax      = useMemo(() => Math.max(...heatMatrix.flat(), 1), [heatMatrix])
  const heatColTotals = useMemo(() => HEAT_HOURS.map((h) => heatMatrix.reduce((s, row) => s + row[h], 0)), [heatMatrix])
  const heatRowTotals = useMemo(() => heatMatrix.map((row) => row.reduce((s, v) => s + v, 0)), [heatMatrix])
  const peakHour     = useMemo(() => heatColTotals.indexOf(Math.max(...heatColTotals)), [heatColTotals])
  const peakDay      = useMemo(() => heatRowTotals.indexOf(Math.max(...heatRowTotals)), [heatRowTotals])

  const campanhas    = useMemo(() => calcMetricasPorCampanha(filteredLeads), [filteredLeads])
  const criativos    = useMemo(() => calcMetricasPorCriativo(filteredLeads), [filteredLeads])
  const receitaFonte = useMemo(() => calcReceitaPorDimensao(filteredLeads, 'utm_source'), [filteredLeads])

  const totalLeads    = filteredLeads.length
  const totalReceita  = campanhas.reduce((s, c) => s + c.receita_total, 0)
  const totalVendas   = campanhas.reduce((s, c) => s + c.vendas, 0)
  const totalPipeline = campanhas.reduce((s, c) => s + c.valor_estimado_pipeline, 0)
  const ticketMedio   = totalVendas > 0 ? totalReceita / totalVendas : 0
  const taxaConvGeral = totalLeads > 0 ? (totalVendas / totalLeads) * 100 : 0

  // ── Dados de comparação (Período B) ───────────────────────────────────────
  const campanhasB    = useMemo(() => calcMetricasPorCampanha(filteredLeadsB), [filteredLeadsB])
  const totalLeadsB   = filteredLeadsB.length
  const totalReceitaB = campanhasB.reduce((s, c) => s + c.receita_total, 0)
  const totalVendasB  = campanhasB.reduce((s, c) => s + c.vendas, 0)
  const ticketMedioB  = totalVendasB > 0 ? totalReceitaB / totalVendasB : 0
  const taxaConvB     = totalLeadsB > 0 ? (totalVendasB / totalLeadsB) * 100 : 0

  function delta(a: number, b: number) {
    if (b === 0) return null
    return ((a - b) / b) * 100
  }

  // Listas únicas para filtros
  const allCamps   = [...new Set(leads.map((l) => l.utm_campaign).filter(Boolean))] as string[]
  const allSources = [...new Set(leads.map((l) => l.utm_source).filter(Boolean))] as string[]

  // Sort criativos
  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortedCriativos = [...criativos].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey]
    if (typeof va === 'string' && typeof vb === 'string')
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })
  const maxScore     = Math.max(...criativos.map((m) => m.score), 1)
  const maxScoreCamp = Math.max(...campanhas.map((c) => c.score), 1)

  function toggleCampanha(camp: string) {
    setExpandedCampanhas((prev) => {
      const next = new Set(prev)
      if (next.has(camp)) next.delete(camp)
      else next.add(camp)
      return next
    })
  }

  const sortedCampanhas = useMemo(() => {
    return [...campanhas].sort((a, b) => {
      if (campSortKey === 'campanha') {
        const la = CAMPAIGN_LABELS[a.campanha] || a.campanha
        const lb = CAMPAIGN_LABELS[b.campanha] || b.campanha
        return campSortDir === 'asc' ? la.localeCompare(lb) : lb.localeCompare(la)
      }
      if (campSortKey === 'taxa_desq') {
        const va = a.total_leads > 0 ? (a.desqualificados / a.total_leads) * 100 : 0
        const vb = b.total_leads > 0 ? (b.desqualificados / b.total_leads) * 100 : 0
        return campSortDir === 'asc' ? va - vb : vb - va
      }
      const va = (a as unknown as Record<string, number>)[campSortKey] ?? 0
      const vb = (b as unknown as Record<string, number>)[campSortKey] ?? 0
      return campSortDir === 'asc' ? va - vb : vb - va
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhas, campSortKey, campSortDir])

  function handleCampSort(key: CampSortKey) {
    if (key === campSortKey) setCampSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setCampSortKey(key); setCampSortDir('desc') }
  }
  function handleCrSubSort(key: SortKey) {
    if (key === crSubSortKey) setCrSubSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setCrSubSortKey(key); setCrSubSortDir('desc') }
  }

  // ── Download CSVs ──────────────────────────────────────────────────────────
  function exportCampanhas() {
    const rows = campanhas.map((c) => ({
      Campanha: CAMPAIGN_LABELS[c.campanha] || c.campanha,
      Leads: c.total_leads,
      'Taxa Resposta (%)': c.taxa_resposta.toFixed(1),
      'Taxa Agendamento (%)': c.taxa_agendamento.toFixed(1),
      'Taxa Conversao (%)': c.taxa_conversao.toFixed(1),
      Vendas: c.vendas,
      'Receita (R$)': c.receita_total,
      'Ticket Medio (R$)': c.ticket_medio,
      'Pipeline (R$)': c.valor_estimado_pipeline,
    }))
    downloadXLS(rows, 'relatorio-campanhas.xls')
  }

  function exportCriativos() {
    const rows = sortedCriativos.map((m) => ({
      Criativo: CRIATIVO_LABELS[m.utm_content] || m.utm_content,
      Campanha: m.utm_campaign || '',
      Fonte: m.utm_source || '',
      Leads: m.total_leads,
      'Taxa Resposta (%)': m.taxa_resposta.toFixed(1),
      'Taxa Agendamento (%)': m.taxa_agendamento.toFixed(1),
      'Taxa Conversao (%)': m.taxa_conversao.toFixed(1),
      Vendas: m.vendas,
      'Receita (R$)': m.receita_total,
      'Ticket Medio (R$)': m.ticket_medio,
      Score: m.score.toFixed(1),
    }))
    downloadXLS(rows, 'relatorio-criativos.xls')
  }

  function exportDecisao() {
    const rows = campanhas.map((c) => {
      const rec = getRecomendacao(c.taxa_conversao, c.ticket_medio, c.taxa_agendamento)
      return {
        Campanha: CAMPAIGN_LABELS[c.campanha] || c.campanha,
        Recomendacao: REC_CONFIG[rec].label,
        'Taxa Conversao (%)': c.taxa_conversao.toFixed(1),
        'Ticket Medio (R$)': c.ticket_medio,
        'Receita por Lead (R$)': c.receita_por_lead.toFixed(2),
        'Receita Total (R$)': c.receita_total,
        Justificativa: REC_CONFIG[rec].desc,
      }
    })
    downloadXLS(rows, 'relatorio-decisao-investimento.xls')
  }

  const chartCampanhas = campanhas.map((c) => ({
    name: (CAMPAIGN_LABELS[c.campanha] || c.campanha).replace(' Q1', ''),
    Leads: c.total_leads,
    Vendas: c.vendas,
    'Taxa Conv. (%)': parseFloat(c.taxa_conversao.toFixed(1)),
    'Receita': c.receita_total,
  }))

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5" style={{ background: '#F5F7FA', minHeight: '100vh' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-bright tracking-tight">Marketing & Campanhas</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Analise performance, compare campanhas e decida onde investir
            </p>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-text-muted">
              <Filter size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Filtros</span>
            </div>

            {/* Período rápido */}
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#EEF1F5', border: '1px solid #E0E6ED' }}>
              {([
                { v: 'todos', l: 'Todos' },
                { v: '7d',   l: '7d' },
                { v: '30d',  l: '30d' },
                { v: '90d',  l: '90d' },
              ] as { v: Period; l: string }[]).map(({ v, l }) => (
                <button key={v}
                  onClick={() => { setPeriod(v); setDateFrom(''); setDateTo('') }}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    period === v && !dateFrom && !dateTo ? 'text-white' : 'text-[#6B7C93] hover:text-[#1F2D3D]')}
                  style={period === v && !dateFrom && !dateTo
                    ? { background: 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)' }
                    : {}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Data customizada */}
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-text-muted flex-shrink-0" />
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPeriod('custom') }}
                className="input text-xs py-1.5 !w-36" />
              <span className="text-text-dim text-xs">até</span>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPeriod('custom') }}
                className="input text-xs py-1.5 !w-36" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setPeriod('todos') }}
                  className="text-text-muted hover:text-text-primary transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Campanha */}
            <select value={campFiltro} onChange={(e) => setCampFiltro(e.target.value)}
              className="input text-xs py-1.5 w-auto min-w-[160px]">
              <option value="todas">Todas as Campanhas</option>
              {allCamps.map((c) => <option key={c} value={c}>{CAMPAIGN_LABELS[c] || c}</option>)}
            </select>

            {/* Fonte */}
            <select value={fonteFiltro} onChange={(e) => setFonteFiltro(e.target.value)}
              className="input text-xs py-1.5 w-auto min-w-[120px]">
              <option value="todas">Todas as Fontes</option>
              {allSources.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>

            {/* Comparar */}
            <button
              onClick={() => setCompareMode((v) => !v)}
              className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                compareMode
                  ? 'border-violet-500/50 text-violet-300' : 'border-[#E0E6ED] text-text-muted hover:text-text-primary')}
              style={compareMode ? { background: 'rgba(124,58,237,0.15)' } : {}}>
              <GitCompare size={13} />
              Comparar Períodos
            </button>

            <div className="ml-auto text-xs text-text-dim">
              <span className="font-bold text-text-primary">{filteredLeads.length}</span> leads
              {compareMode && filteredLeadsB.length > 0 && (
                <span className="ml-2 text-violet-400 font-bold">vs {filteredLeadsB.length} (B)</span>
              )}
            </div>
          </div>

          {/* Linha de comparação */}
          {compareMode && (
            <div className="flex flex-wrap gap-3 items-center pt-2 border-t" style={{ borderColor: '#E0E6ED' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                  style={{ background: 'rgba(59,130,246,0.15)', color: BLUE_L }}>Período A</span>
                <span className="text-[10px] text-text-dim">
                  {dateFrom || 'início'} → {dateTo || 'agora'}
                </span>
              </div>
              <span className="text-text-dim text-xs">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>Período B</span>
                <input type="date" value={compFrom} onChange={(e) => setCompFrom(e.target.value)}
                  className="input text-xs py-1 !w-32" />
                <span className="text-text-dim text-xs">até</span>
                <input type="date" value={compTo} onChange={(e) => setCompTo(e.target.value)}
                  className="input text-xs py-1 !w-32" />
                {(compFrom || compTo) && (
                  <button onClick={() => { setCompFrom(''); setCompTo('') }}
                    className="text-text-muted hover:text-text-primary">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Leads',     a: totalLeads,   b: totalLeadsB,   color: BLUE_L,  icon: Users,      fmt: (v: number) => String(v) },
            { label: 'Receita Gerada',  a: totalReceita, b: totalReceitaB, color: GREEN_L, icon: DollarSign, fmt: formatCurrency },
            { label: 'Vendas Fechadas', a: totalVendas,  b: totalVendasB,  color: GREEN,   icon: Trophy,     fmt: (v: number) => String(v) },
            { label: 'Ticket Médio',    a: ticketMedio,  b: ticketMedioB,  color: SKY,     icon: Target,     fmt: formatCurrency },
            { label: 'Taxa Conversão',  a: taxaConvGeral,b: taxaConvB,     color: VIOLET,  icon: TrendingUp, fmt: (v: number) => `${v.toFixed(1)}%` },
          ].map((item) => {
            const d = compareMode && item.b > 0 ? delta(item.a, item.b) : null
            return (
              <div key={item.label} className="metric-card card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18` }}>
                    <item.icon size={16} style={{ color: item.color }} />
                  </div>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-semibold leading-tight">{item.label}</p>
                </div>
                <p className="text-xl font-extrabold" style={{ color: item.color }}>{item.fmt(item.a)}</p>
                {compareMode && item.b > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-dim">vs {item.fmt(item.b)}</span>
                    {d !== null && (
                      <span className={cn('flex items-center gap-0.5 text-[10px] font-bold')}
                        style={{ color: d >= 0 ? GREEN_L : RED }}>
                        {d >= 0
                          ? <TrendingUp size={10} />
                          : <TrendingDown size={10} />}
                        {d >= 0 ? '+' : ''}{d.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
                {!compareMode && item.label === 'Total Leads' && (
                  <p className="text-[11px] text-text-dim mt-0.5">{taxaConvGeral.toFixed(1)}% conversão</p>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
          {([
            { id: 'campanhas', label: 'Por Campanha',     icon: BarChart2 },
            { id: 'criativos', label: 'Por Criativo',     icon: Layers },
            { id: 'decisao',   label: 'Decisão',          icon: Rocket },
            { id: 'calor',     label: 'Mapa de Calor',    icon: Flame },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 justify-center',
                tab === id ? 'text-white' : 'text-[#6B7C93] hover:text-[#1F2D3D]')}
              style={tab === id ? { background: 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)' } : {}}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CAMPANHAS                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'campanhas' && (
          <div className="space-y-5">

            {/* ── Destaques ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const best = [...campanhas].sort((a, b) => b.taxa_conversao - a.taxa_conversao)[0]
                if (!best) return null
                return (
                  <div className="card p-5" style={{ borderTop: `3px solid ${GREEN_L}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GREEN_L}18` }}>
                        <Trophy size={16} style={{ color: GREEN_L }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GREEN_L }}>Melhor Conversão</p>
                    </div>
                    <p className="text-sm font-bold text-[#1F2D3D] mb-1 truncate">{CAMPAIGN_LABELS[best.campanha] || best.campanha}</p>
                    <p className="text-2xl font-extrabold" style={{ color: GREEN_L }}>{best.taxa_conversao.toFixed(1)}%</p>
                    <p className="text-xs text-[#6B7C93] mt-2">{best.vendas} vendas · {best.total_leads} leads · {formatCurrency(best.receita_total)}</p>
                  </div>
                )
              })()}
              {(() => {
                const best = [...campanhas].sort((a, b) => b.total_leads - a.total_leads)[0]
                if (!best) return null
                return (
                  <div className="card p-5" style={{ borderTop: `3px solid ${BLUE_L}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${BLUE_L}18` }}>
                        <Users size={16} style={{ color: BLUE_L }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE_L }}>Mais Leads</p>
                    </div>
                    <p className="text-sm font-bold text-[#1F2D3D] mb-1 truncate">{CAMPAIGN_LABELS[best.campanha] || best.campanha}</p>
                    <p className="text-2xl font-extrabold" style={{ color: BLUE_L }}>{best.total_leads}</p>
                    <p className="text-xs text-[#6B7C93] mt-2">{best.taxa_agendamento.toFixed(0)}% agend. · score {best.score.toFixed(0)}</p>
                  </div>
                )
              })()}
              {(() => {
                const worst = [...campanhas]
                  .filter((c) => c.total_leads >= 3)
                  .sort((a, b) => (b.desqualificados / Math.max(b.total_leads, 1)) - (a.desqualificados / Math.max(a.total_leads, 1)))[0]
                if (!worst) return null
                const taxa = worst.total_leads > 0 ? (worst.desqualificados / worst.total_leads) * 100 : 0
                return (
                  <div className="card p-5" style={{ borderTop: `3px solid ${RED}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${RED}12` }}>
                        <AlertTriangle size={16} style={{ color: RED }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: RED }}>Mais Desqualificados</p>
                    </div>
                    <p className="text-sm font-bold text-[#1F2D3D] mb-1 truncate">{CAMPAIGN_LABELS[worst.campanha] || worst.campanha}</p>
                    <p className="text-2xl font-extrabold" style={{ color: RED }}>{taxa.toFixed(1)}%</p>
                    <p className="text-xs text-[#6B7C93] mt-2">{worst.desqualificados} desqual. de {worst.total_leads} leads</p>
                  </div>
                )
              })()}
            </div>

            {/* ── Tabela de Campanhas (expandível + ordenável) ─────────── */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
                <div>
                  <h3 className="section-title">Todas as Campanhas</h3>
                  <p className="text-xs text-text-muted mt-0.5">Clique nos cabeçalhos para ordenar · Clique na linha para ver criativos</p>
                </div>
                <button onClick={exportCampanhas} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={13} />
                  Baixar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E0E6ED', background: '#F5F7FA' }}>
                      {([
                        { key: 'campanha'         as CampSortKey, label: 'Campanha',   w: 220 },
                        { key: 'total_leads'      as CampSortKey, label: 'Leads' },
                        { key: 'taxa_agendamento' as CampSortKey, label: '% Agend.' },
                        { key: 'taxa_conversao'   as CampSortKey, label: '% Conv.' },
                        { key: 'vendas'           as CampSortKey, label: 'Vendas' },
                        { key: 'receita_total'    as CampSortKey, label: 'Receita' },
                        { key: 'ticket_medio'     as CampSortKey, label: 'Ticket' },
                        { key: 'score'            as CampSortKey, label: 'Score' },
                        { key: 'desqualificados'  as CampSortKey, label: 'Desqual.' },
                        { key: 'taxa_desq'        as CampSortKey, label: '% Desqual.' },
                      ] as { key: CampSortKey; label: string; w?: number }[]).map(({ key, label, w }) => (
                        <th key={key} style={{ width: w, padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}
                          onClick={() => handleCampSort(key)}
                          className="hover:bg-elevated transition-colors select-none">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                            {label}
                            <SortIcon active={campSortKey === key} dir={campSortDir} />
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Recom.</span>
                      </th>
                      <th style={{ width: 44 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCampanhas.flatMap((c, idx) => {
                      const isExpanded = expandedCampanhas.has(c.campanha)
                      const taxa_desq = c.total_leads > 0 ? (c.desqualificados / c.total_leads) * 100 : 0
                      const rec = getRecomendacao(c.taxa_conversao, c.ticket_medio, c.taxa_agendamento)
                      const recCfg = REC_CONFIG[rec]
                      const RecIcon = recCfg.icon
                      const color = CHART_PALETTE[idx % CHART_PALETTE.length]
                      const campCriativos = calcMetricasPorCriativo(
                        filteredLeads.filter((l) => l.utm_campaign === c.campanha)
                      )
                      const maxCrScore = Math.max(...campCriativos.map((cr) => cr.score), 1)
                      const sortedCampCriativos = [...campCriativos].sort((a, b) => {
                        if (crSubSortKey === 'utm_content') {
                          const la = CRIATIVO_LABELS[a.utm_content] || a.utm_content
                          const lb = CRIATIVO_LABELS[b.utm_content] || b.utm_content
                          return crSubSortDir === 'asc' ? la.localeCompare(lb) : lb.localeCompare(la)
                        }
                        const va = (a as unknown as Record<string, number>)[crSubSortKey] ?? 0
                        const vb = (b as unknown as Record<string, number>)[crSubSortKey] ?? 0
                        return crSubSortDir === 'asc' ? va - vb : vb - va
                      })
                      const bestConvCamp = [...campanhas].sort((a, b) => b.taxa_conversao - a.taxa_conversao)[0]?.campanha
                      const maxDesqTaxa = Math.max(
                        ...campanhas.filter((x) => x.total_leads >= 3)
                          .map((x) => x.total_leads > 0 ? (x.desqualificados / x.total_leads) * 100 : 0),
                        0
                      )
                      const isBestConv = c.campanha === bestConvCamp
                      const isMostDesq = c.total_leads >= 3 && taxa_desq > 0 && taxa_desq === maxDesqTaxa

                      const mainRow = (
                        <tr
                          key={c.campanha}
                          onClick={() => toggleCampanha(c.campanha)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #EEF1F5',
                            background: isExpanded ? 'rgba(37,99,235,0.05)' : 'transparent',
                            cursor: 'pointer',
                            borderLeft: `3px solid ${color}`,
                          }}
                          className="hover:bg-elevated transition-colors"
                        >
                          <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                            <div className="flex items-center gap-2 min-w-0">
                              {isBestConv && <Trophy size={12} style={{ color: GREEN_L, flexShrink: 0 }} />}
                              {isMostDesq && <AlertTriangle size={12} style={{ color: RED, flexShrink: 0 }} />}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">
                                  {CAMPAIGN_LABELS[c.campanha] || c.campanha}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {c.fontes.slice(0, 2).map((f) => (
                                    <span key={f} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                                      style={{ background: `${SOURCE_COLORS[f] || BLUE}15`, color: SOURCE_COLORS[f] || BLUE }}>
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold text-text-bright">{c.total_leads}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <PercentBar value={c.taxa_agendamento} color={SKY} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold"
                              style={{ color: c.taxa_conversao >= 15 ? GREEN_L : c.taxa_conversao >= 5 ? AMBER : RED }}>
                              {c.taxa_conversao.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold text-text-bright">{c.vendas}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold" style={{ color: c.receita_total > 0 ? GREEN_L : '#3d5a7a' }}>
                              {formatCurrency(c.receita_total)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-xs font-semibold" style={{ color: c.ticket_medio > 0 ? SKY : '#3d5a7a' }}>
                              {c.ticket_medio > 0 ? formatCurrency(c.ticket_medio) : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <ScoreRing score={c.score} max={maxScoreCamp} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold" style={{ color: c.desqualificados > 0 ? RED : '#3d5a7a' }}>
                              {c.desqualificados}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <PercentBar value={taxa_desq} color={taxa_desq >= 30 ? RED : taxa_desq >= 15 ? AMBER : GREEN_L} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap"
                              style={{ background: recCfg.bg, color: recCfg.color }}>
                              <RecIcon size={10} />
                              {recCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div className="flex items-center justify-center">
                              {isExpanded
                                ? <ChevronUp size={14} style={{ color: BLUE_L }} />
                                : <ChevronDown size={14} style={{ color: '#6B7C93' }} />}
                            </div>
                          </td>
                        </tr>
                      )

                      if (!isExpanded) return [mainRow]

                      const expandedRow = (
                        <tr key={`${c.campanha}-criativos`} style={{ borderBottom: '1px solid #EEF1F5' }}>
                          <td colSpan={12} style={{ padding: 0, background: '#F8FAFF' }}>
                            <div style={{ borderLeft: `4px solid ${color}40` }}>
                              {campCriativos.length === 0 ? (
                                <div className="px-8 py-4 text-xs text-text-dim italic">
                                  Nenhum criativo vinculado a esta campanha.
                                </div>
                              ) : (
                                <div className="py-4 px-6">

                                  {/* Sort + count bar */}
                                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
                                      <p className="text-xs font-bold text-text-primary">
                                        {campCriativos.length} criativo{campCriativos.length !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] text-text-dim font-semibold uppercase tracking-wide">Ordenar:</span>
                                      {([
                                        { key: 'score'                as SortKey, label: 'Score' },
                                        { key: 'total_leads'          as SortKey, label: 'Leads' },
                                        { key: 'taxa_conversao'       as SortKey, label: 'Conv.' },
                                        { key: 'receita_total'        as SortKey, label: 'Receita' },
                                        { key: 'taxa_desqualificacao' as SortKey, label: 'Desqual.' },
                                        { key: 'utm_content'          as SortKey, label: 'Nome' },
                                      ]).map(({ key, label }) => (
                                        <button
                                          key={key}
                                          onClick={(e) => { e.stopPropagation(); handleCrSubSort(key) }}
                                          className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all select-none"
                                          style={crSubSortKey === key
                                            ? { background: `${BLUE_L}20`, color: BLUE_L, border: `1px solid ${BLUE_L}40` }
                                            : { background: '#EEF1F5', color: '#6B7C93', border: '1px solid #E0E6ED' }}>
                                          {label}
                                          {crSubSortKey === key && (
                                            crSubSortDir === 'asc'
                                              ? <ChevronUp size={9} style={{ flexShrink: 0 }} />
                                              : <ChevronDown size={9} style={{ flexShrink: 0 }} />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Cards grid */}
                                  <div className={cn('grid gap-3',
                                    sortedCampCriativos.length === 1 ? 'grid-cols-1 max-w-sm' :
                                    sortedCampCriativos.length <= 4 ? 'grid-cols-2' : 'grid-cols-3')}>
                                    {sortedCampCriativos.map((cr, cIdx) => {
                                      const crTaxaDesq = cr.total_leads > 0 ? (cr.desqualificados / cr.total_leads) * 100 : 0
                                      const isCrBest  = cIdx === 0
                                      const isCrWorst = cIdx === sortedCampCriativos.length - 1 && sortedCampCriativos.length > 1
                                      const convColor = cr.taxa_conversao >= 15 ? GREEN_L : cr.taxa_conversao >= 5 ? AMBER : RED
                                      const desqColor = crTaxaDesq >= 30 ? RED : crTaxaDesq >= 15 ? AMBER : GREEN_L
                                      return (
                                        <div
                                          key={cr.utm_content}
                                          onClick={(e) => { e.stopPropagation(); setSelectedCriativo(cr.utm_content) }}
                                          className="rounded-xl p-4 cursor-pointer transition-all"
                                          style={{
                                            background: isCrBest ? 'rgba(5,150,105,0.05)' : isCrWorst ? 'rgba(220,38,38,0.03)' : '#FFFFFF',
                                            border: `1px solid ${isCrBest ? '#86EFAC' : isCrWorst ? '#FECACA' : '#E0E6ED'}`,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none' }}
                                        >
                                          {/* Card header */}
                                          <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 mb-1.5">
                                                {isCrBest  && <Trophy        size={11} style={{ color: GREEN_L, flexShrink: 0 }} />}
                                                {isCrWorst && <AlertTriangle size={11} style={{ color: RED,     flexShrink: 0 }} />}
                                                <p className="text-xs font-bold text-[#1F2D3D] truncate leading-tight">
                                                  {CRIATIVO_LABELS[cr.utm_content] || cr.utm_content}
                                                </p>
                                              </div>
                                              {cr.utm_source && (
                                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                                                  style={{ background: `${SOURCE_COLORS[cr.utm_source] || BLUE}15`, color: SOURCE_COLORS[cr.utm_source] || BLUE }}>
                                                  {cr.utm_source}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex-shrink-0">
                                              <ScoreRing score={cr.score} max={maxCrScore} />
                                            </div>
                                          </div>

                                          {/* Primary metrics */}
                                          <div className="grid grid-cols-4 gap-1 mb-3">
                                            {[
                                              { label: 'Leads',   value: String(cr.total_leads),              color: BLUE_L   },
                                              { label: 'Conv.',   value: `${cr.taxa_conversao.toFixed(0)}%`,  color: convColor },
                                              { label: 'Vendas',  value: String(cr.vendas),                  color: GREEN_L  },
                                              { label: 'Receita', value: formatCurrency(cr.receita_total),    color: GREEN    },
                                            ].map((m) => (
                                              <div key={m.label} className="rounded-lg p-1.5 text-center" style={{ background: '#F5F7FA', border: '1px solid #E8EDF5' }}>
                                                <p className="text-[8px] font-bold uppercase tracking-wide text-[#A0AEC0]">{m.label}</p>
                                                <p className="text-[11px] font-extrabold mt-0.5 truncate" style={{ color: m.color }}>{m.value}</p>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Mini progress bars */}
                                          <div className="space-y-1.5 mb-3">
                                            <div>
                                              <div className="flex justify-between text-[9px] mb-0.5">
                                                <span style={{ color: '#A0AEC0' }}>Agendamento</span>
                                                <span className="font-semibold" style={{ color: SKY }}>{cr.taxa_agendamento.toFixed(0)}%</span>
                                              </div>
                                              <div className="w-full h-1.5 rounded-full" style={{ background: '#E0E6ED' }}>
                                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(cr.taxa_agendamento, 100)}%`, background: SKY }} />
                                              </div>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-[9px] mb-0.5">
                                                <span style={{ color: '#A0AEC0' }}>Desqualif. ({cr.desqualificados})</span>
                                                <span className="font-semibold" style={{ color: desqColor }}>{crTaxaDesq.toFixed(0)}%</span>
                                              </div>
                                              <div className="w-full h-1.5 rounded-full" style={{ background: '#E0E6ED' }}>
                                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(crTaxaDesq, 100)}%`, background: desqColor }} />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Footer */}
                                          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid #E8EDF5' }}>
                                            <span className="text-[9px] text-[#A0AEC0]">
                                              Ticket: <span className="font-semibold" style={{ color: cr.ticket_medio > 0 ? SKY : '#A0AEC0' }}>
                                                {cr.ticket_medio > 0 ? formatCurrency(cr.ticket_medio) : '—'}
                                              </span>
                                            </span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                              style={{ background: `${BLUE_L}15`, color: BLUE_L }}>
                                              Ver detalhes ↗
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )

                      return [mainRow, expandedRow]
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Charts ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="section-title">Receita por Campanha</h3>
                    <p className="text-xs text-text-muted mt-0.5">Comparativo de receita gerada</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartCampanhas} margin={{ left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#6b8ab0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b8ab0', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Receita" radius={[5, 5, 0, 0]}>
                      {chartCampanhas.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="section-title">Leads vs Vendas por Campanha</h3>
                    <p className="text-xs text-text-muted mt-0.5">Volume gerado e convertido</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartCampanhas} margin={{ left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#6b8ab0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b8ab0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Leads"  fill={BLUE}  radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Vendas" fill={GREEN} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Receita por Fonte */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="section-title">Receita por Fonte de Tráfego</h3>
                  <p className="text-xs text-text-muted mt-0.5">Onde cada real de receita está vindo</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {receitaFonte.map((item, i) => {
                  const pct = receitaFonte[0]?.receita > 0 ? (item.receita / receitaFonte[0].receita) * 100 : 0
                  const color = SOURCE_COLORS[item.nome] || CHART_PALETTE[i % CHART_PALETTE.length]
                  return (
                    <div key={item.nome}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-text-primary capitalize">{item.nome}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-text-muted">{item.leads} leads · {item.vendas} vendas</span>
                          <span className="font-bold" style={{ color }}>{formatCurrency(item.receita)}</span>
                        </div>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ background: '#E0E6ED' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CRIATIVOS                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'criativos' && (
          <div className="space-y-5">

            {/* Top 3 rankings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Melhor receita */}
              <div className="card p-5" style={{ borderTop: `3px solid ${GREEN_L}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GREEN_L}18` }}>
                    <Trophy size={16} style={{ color: GREEN_L }} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GREEN_L }}>Maior Receita</p>
                </div>
                <p className="text-sm font-bold text-[#1F2D3D] mb-1">{CRIATIVO_LABELS[criativos[0]?.utm_content] || criativos[0]?.utm_content}</p>
                <p className="text-2xl font-extrabold" style={{ color: GREEN_L }}>{formatCurrency(criativos[0]?.receita_total || 0)}</p>
                <p className="text-xs text-[#6B7C93] mt-2">{criativos[0]?.vendas} vendas · {criativos[0]?.taxa_conversao.toFixed(0)}% conv.</p>
              </div>

              {/* Melhor conversão */}
              {(() => {
                const bestConv = [...criativos].sort((a, b) => b.taxa_conversao - a.taxa_conversao)[0]
                return (
                  <div className="card p-5" style={{ borderTop: `3px solid ${BLUE_L}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${BLUE_L}18` }}>
                        <Target size={16} style={{ color: BLUE_L }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE_L }}>Maior Conversão</p>
                    </div>
                    <p className="text-sm font-bold text-[#1F2D3D] mb-1">{CRIATIVO_LABELS[bestConv?.utm_content] || bestConv?.utm_content}</p>
                    <p className="text-2xl font-extrabold" style={{ color: BLUE_L }}>{bestConv?.taxa_conversao.toFixed(0)}%</p>
                    <p className="text-xs text-[#6B7C93] mt-2">{bestConv?.vendas} vendas · ticket {formatCurrency(bestConv?.ticket_medio || 0)}</p>
                  </div>
                )
              })()}

              {/* Mais Desqualificados */}
              {(() => {
                const maisDesq = [...criativos]
                  .filter((m) => m.total_leads >= 3)
                  .sort((a, b) => b.taxa_desqualificacao - a.taxa_desqualificacao)[0]
                return (
                  <div className="card p-5" style={{ borderTop: `3px solid ${RED}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${RED}12` }}>
                        <AlertTriangle size={16} style={{ color: RED }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: RED }}>Mais Desqualificados</p>
                    </div>
                    <p className="text-sm font-bold text-[#1F2D3D] mb-1">{CRIATIVO_LABELS[maisDesq?.utm_content] || maisDesq?.utm_content || '—'}</p>
                    <p className="text-2xl font-extrabold" style={{ color: RED }}>{maisDesq?.taxa_desqualificacao.toFixed(0) ?? 0}%</p>
                    <p className="text-xs mt-2 text-[#6B7C93]">
                      {maisDesq?.desqualificados ?? 0} desqual. de {maisDesq?.total_leads ?? 0} leads
                    </p>
                  </div>
                )
              })()}
            </div>

            {/* Tabela */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
                <div>
                  <h3 className="section-title">Tabela Completa por Criativo</h3>
                  <p className="text-xs text-text-muted mt-0.5">Clique nos cabeçalhos para ordenar</p>
                </div>
                <button onClick={exportCriativos}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={13} />
                  Baixar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E0E6ED', background: '#F5F7FA' }}>
                      {([
                        { key: 'utm_content'      as SortKey, label: 'Criativo',     w: 180 },
                        { key: 'total_leads'      as SortKey, label: 'Leads' },
                        { key: 'taxa_resposta'    as SortKey, label: '% Respondeu' },
                        { key: 'taxa_agendamento' as SortKey, label: '% Agendou' },
                        { key: 'taxa_conversao'   as SortKey, label: '% Vendeu' },
                        { key: 'vendas'           as SortKey, label: 'Vendas' },
                        { key: 'receita_total'    as SortKey, label: 'Receita' },
                        { key: 'ticket_medio'     as SortKey, label: 'Ticket Médio' },
                        { key: 'score'            as SortKey, label: 'Score' },
                        { key: 'desqualificados'     as SortKey, label: 'Desqual.' },
                        { key: 'taxa_desqualificacao' as SortKey, label: '% Desqual.' },
                      ]).map(({ key, label, w }) => (
                        <th key={key} style={{ width: w, padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}
                          onClick={() => handleSort(key)}
                          className="hover:bg-elevated transition-colors">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                            {label}
                            <SortIcon active={sortKey === key} dir={sortDir} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCriativos.map((m, idx) => {
                      const isBest  = idx === 0
                      const isWorst = idx === sortedCriativos.length - 1
                      const isSelected = selectedCriativo === m.utm_content
                      return (
                        <tr key={m.utm_content}
                          onClick={() => setSelectedCriativo(isSelected ? null : m.utm_content)}
                          style={{
                            borderBottom: '1px solid #EEF1F5',
                            background: isSelected ? 'rgba(37,99,235,0.08)'
                              : isBest ? 'rgba(5,150,105,0.04)'
                              : isWorst ? 'rgba(220,38,38,0.04)'
                              : 'transparent',
                            cursor: 'pointer',
                          }}
                          className="hover:bg-elevated transition-colors">
                          <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                            <div className="flex items-center gap-2 min-w-0">
                              {isBest  && <Trophy       size={12} style={{ color: GREEN_L, flexShrink: 0 }} />}
                              {isWorst && <AlertTriangle size={12} style={{ color: RED, flexShrink: 0 }} />}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate flex items-center gap-1"
                                  title={CRIATIVO_LABELS[m.utm_content] || m.utm_content}>
                                  <span className="truncate">{CRIATIVO_LABELS[m.utm_content] || m.utm_content}</span>
                                  {isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                    style={{ background: `${BLUE}20`, color: BLUE_L }}>aberto ↗</span>}
                                </p>
                                <p className="text-[10px] text-text-dim mt-0.5 capitalize truncate"
                                  title={`${m.utm_source} · ${CAMPAIGN_LABELS[m.utm_campaign || ''] || m.utm_campaign}`}>
                                  {m.utm_source} · {CAMPAIGN_LABELS[m.utm_campaign || ''] || m.utm_campaign}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold text-text-bright">{m.total_leads}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <PercentBar value={m.taxa_resposta} color={BLUE_L} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <PercentBar value={m.taxa_agendamento} color={SKY} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold"
                              style={{ color: m.taxa_conversao >= 15 ? GREEN_L : m.taxa_conversao >= 5 ? AMBER : RED }}>
                              {m.taxa_conversao.toFixed(0)}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold text-text-bright">{m.vendas}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold" style={{ color: m.receita_total > 0 ? GREEN_L : '#3d5a7a' }}>
                              {formatCurrency(m.receita_total)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-xs font-semibold" style={{ color: m.ticket_medio > 0 ? SKY : '#3d5a7a' }}>
                              {m.ticket_medio > 0 ? formatCurrency(m.ticket_medio) : '-'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <ScoreRing score={m.score} max={maxScore} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="text-sm font-bold"
                              style={{ color: m.desqualificados > 0 ? RED : '#3d5a7a' }}>
                              {m.desqualificados}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <PercentBar
                              value={m.taxa_desqualificacao}
                              color={m.taxa_desqualificacao >= 30 ? RED : m.taxa_desqualificacao >= 15 ? AMBER : GREEN_L}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>


            {/* ── Qualidade de Leads por Criativo ─────────────────────────── */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="section-title flex items-center gap-2">
                    <AlertTriangle size={15} style={{ color: RED }} />
                    Qualidade de Leads por Criativo
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Taxa de desqualificação por criativo — quanto maior, pior a qualidade dos leads captados
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  const maxTaxa = Math.max(...criativos.map((c) => c.taxa_desqualificacao), 1)
                  return [...criativos]
                    .filter((m) => m.total_leads > 0)
                    .sort((a, b) => b.taxa_desqualificacao - a.taxa_desqualificacao)
                    .map((m) => {
                      const taxa = m.taxa_desqualificacao
                      const barColor = taxa >= 30 ? RED : taxa >= 15 ? AMBER : GREEN_L
                      const barWidth = maxTaxa > 0 ? (taxa / maxTaxa) * 100 : 0
                      return (
                        <div key={m.utm_content}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {taxa >= 30 && <AlertTriangle size={11} style={{ color: RED, flexShrink: 0 }} />}
                              <span className="text-xs font-semibold text-text-primary truncate">
                                {CRIATIVO_LABELS[m.utm_content] || m.utm_content}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              <span className="text-[10px] text-text-dim">{m.desqualificados} desqual. / {m.total_leads} leads</span>
                              <span className="text-xs font-bold w-10 text-right" style={{ color: barColor }}>{taxa.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: '#E0E6ED' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${barWidth}%`, background: barColor }} />
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>

              <div className="flex items-center gap-5 mt-5 pt-4" style={{ borderTop: '1px solid #E0E6ED' }}>
                {[
                  { color: RED,     label: '≥ 30% — crítico' },
                  { color: AMBER,   label: '15–29% — atenção' },
                  { color: GREEN_L, label: '< 15% — aceitável' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                    <span className="text-[10px] text-text-muted">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights automáticos */}
            <div className="card p-5">
              <h3 className="section-title mb-4 flex items-center gap-2">
                <Zap size={16} style={{ color: BLUE_L }} />
                Insights Automáticos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criativos.filter((m) => m.total_leads > 4 && m.taxa_conversao < 6).map((m) => (
                  <div key={m.utm_content} className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <AlertTriangle size={14} style={{ color: RED, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: RED }}>
                        "{CRIATIVO_LABELS[m.utm_content] || m.utm_content}" com baixa conversão
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {m.total_leads} leads — {m.taxa_conversao.toFixed(0)}% conversão — {formatCurrency(m.receita_total)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(220,38,38,0.7)' }}>Considere pausar ou revisar este criativo</p>
                    </div>
                  </div>
                ))}
                {criativos.filter((m) => m.taxa_conversao >= 20).map((m) => (
                  <div key={m.utm_content} className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)' }}>
                    <Star size={14} style={{ color: GREEN_L, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: GREEN }}>
                        "{CRIATIVO_LABELS[m.utm_content] || m.utm_content}" está performando muito bem!
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {m.taxa_conversao.toFixed(0)}% de conversão — {formatCurrency(m.receita_total)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(5,150,105,0.8)' }}>Aumente o orçamento para escalar os resultados</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: DECISÃO DE INVESTIMENTO                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'decisao' && (
          <div className="space-y-5">

            {/* Explicação */}
            <div className="card p-5" style={{ borderLeft: `4px solid ${BLUE_L}`, background: '#F8FBFF' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.2)' }}>
                  <Rocket size={20} style={{ color: BLUE_L }} />
                </div>
                <div>
                  <h3 className="font-bold text-text-bright mb-1">Ferramenta de Decisão de Investimento</h3>
                  <p className="text-sm text-text-muted">
                    Baseado na taxa de conversão, ticket médio e receita por lead de cada campanha,
                    o sistema calcula onde seu dinheiro rende mais e emite uma recomendação estratégica.
                  </p>
                </div>
              </div>
            </div>

            {/* Recomendações por campanha */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Recomendação por Campanha</h3>
                <button onClick={exportDecisao}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={13} />
                  Baixar Relatório
                </button>
              </div>

              {campanhas.map((c, idx) => {
                const rec = getRecomendacao(c.taxa_conversao, c.ticket_medio, c.taxa_agendamento)
                const recCfg = REC_CONFIG[rec]
                const RecIcon = recCfg.icon
                const maxReceita = Math.max(...campanhas.map((x) => x.receita_total), 1)
                const barPct = (c.receita_total / maxReceita) * 100
                return (
                  <div key={c.campanha} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black text-white"
                        style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="font-bold text-text-bright">{CAMPAIGN_LABELS[c.campanha] || c.campanha}</p>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: recCfg.bg, color: recCfg.color }}>
                            <RecIcon size={13} />
                            {recCfg.label}
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mb-3">{recCfg.desc}</p>

                        {/* Métricas inline */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                          {[
                            { label: 'Leads',          v: String(c.total_leads),                    c: BLUE_L  },
                            { label: 'Conv.',           v: `${c.taxa_conversao.toFixed(0)}%`,         c: c.taxa_conversao >= 15 ? GREEN_L : c.taxa_conversao >= 8 ? AMBER : RED },
                            { label: 'Ticket Médio',   v: c.ticket_medio > 0 ? formatCurrency(c.ticket_medio) : '-', c: SKY },
                            { label: 'Receita/Lead',   v: formatCurrency(c.receita_por_lead),        c: VIOLET },
                            { label: 'Receita Total',  v: formatCurrency(c.receita_total),           c: GREEN_L },
                          ].map((m) => (
                            <div key={m.label} className="rounded-lg p-2" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                              <p className="text-[10px] text-text-dim">{m.label}</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: m.c }}>{m.v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Barra de receita relativa */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full" style={{ background: '#E0E6ED' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${barPct}%`, background: recCfg.color }} />
                          </div>
                          <span className="text-xs font-semibold flex-shrink-0" style={{ color: recCfg.color }}>
                            {barPct.toFixed(0)}% do total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Ranking criativos por decisão */}
            <div className="card p-5">
              <h3 className="section-title mb-1">Ranking de Criativos por Eficiência</h3>
              <p className="text-xs text-text-muted mb-4">Receita gerada por lead captado — quanto cada criativo rende por real investido</p>
              <div className="space-y-3">
                {[...criativos]
                  .sort((a, b) => (b.receita_total / Math.max(b.total_leads, 1)) - (a.receita_total / Math.max(a.total_leads, 1)))
                  .map((m, idx) => {
                    const rpl = m.total_leads > 0 ? m.receita_total / m.total_leads : 0
                    const maxRpl = criativos.reduce((mx, x) => Math.max(mx, x.total_leads > 0 ? x.receita_total / x.total_leads : 0), 1)
                    const pct = maxRpl > 0 ? (rpl / maxRpl) * 100 : 0
                    const rec = getRecomendacao(m.taxa_conversao, m.ticket_medio, m.taxa_agendamento)
                    const recCfg = REC_CONFIG[rec]
                    const RecIcon = recCfg.icon
                    return (
                      <div key={m.utm_content} className="flex items-center gap-4">
                        <span className="text-xs font-black text-text-dim w-4 text-right">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-text-primary">
                              {CRIATIVO_LABELS[m.utm_content] || m.utm_content}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: recCfg.bg, color: recCfg.color }}>
                                <RecIcon size={10} />{recCfg.label}
                              </span>
                              <span className="text-xs font-bold" style={{ color: GREEN_L }}>
                                {formatCurrency(rpl)}/lead
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: '#E0E6ED' }}>
                            <div className="h-1.5 rounded-full transition-all"
                              style={{ width: `${pct}%`, background: CHART_PALETTE[idx % CHART_PALETTE.length] }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(REC_CONFIG) as [Recomendacao, typeof REC_CONFIG[Recomendacao]][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <div key={key} className="card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{cfg.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: MAPA DE CALOR                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'calor' && (
          <div className="space-y-5">

            {/* Controles */}
            <div className="card p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame size={15} style={{ color: AMBER }} />
                <span className="text-sm font-semibold text-text-primary">Métrica:</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#EEF1F5', border: '1px solid #E0E6ED' }}>
                {([
                  { v: 'leads',        l: 'Leads' },
                  { v: 'agendamentos', l: 'Agendamentos' },
                  { v: 'vendas',       l: 'Vendas' },
                ] as { v: HeatMetric; l: string }[]).map(({ v, l }) => (
                  <button key={v} onClick={() => setHeatMetric(v)}
                    className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                      heatMetric === v ? 'text-white' : 'text-[#6B7C93] hover:text-[#1F2D3D]')}
                    style={heatMetric === v ? { background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)' } : {}}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-text-muted">
                <span>Horário de pico:</span>
                <span className="font-bold text-text-primary">{peakHour}h – {peakHour + 1}h</span>
                <span className="text-text-dim">·</span>
                <span>Dia de pico:</span>
                <span className="font-bold text-text-primary">{HEAT_DAYS[peakDay]}</span>
              </div>
            </div>

            {/* KPIs de pico */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {HEAT_DAYS.map((day, di) => {
                const total = heatRowTotals[di]
                const pct = heatMax > 0 ? (total / Math.max(...heatRowTotals, 1)) * 100 : 0
                const isPeak = di === peakDay
                return (
                  <div key={day} className="card p-3"
                    style={isPeak ? { borderTop: `3px solid ${GREEN}` } : {}}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-text-primary">{day}</span>
                      {isPeak && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${GREEN}18`, color: GREEN }}>PICO</span>
                      )}
                    </div>
                    <p className="text-xl font-extrabold" style={{ color: isPeak ? GREEN : BLUE_L }}>{total}</p>
                    <div className="w-full h-1 rounded-full mt-1.5" style={{ background: '#E0E6ED' }}>
                      <div className="h-1 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: isPeak ? GREEN : BLUE_L }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Grid do mapa de calor */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="section-title">Distribuição por Dia × Hora</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Volume de {heatMetric} por dia da semana e horário do dia
                  </p>
                </div>
                {/* Legenda de escala */}
                <div className="hidden md:flex items-center gap-2 text-xs text-text-muted">
                  <span>Baixo</span>
                  {['#D1FAE5','#6EE7B7','#2FBF71','#1E8E5A','#14532D'].map((c) => (
                    <div key={c} className="w-5 h-4 rounded" style={{ background: c }} />
                  ))}
                  <span>Alto</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div style={{ minWidth: '700px' }}>
                  {/* Cabeçalho das horas */}
                  <div className="flex items-center mb-1">
                    <div style={{ width: '44px', flexShrink: 0 }} />
                    {HEAT_HOURS.map((h) => (
                      <div key={h} className="flex-1 text-center"
                        style={{ minWidth: '28px' }}>
                        {h % 3 === 0 && (
                          <span className="text-[9px] font-semibold text-text-dim">{h}h</span>
                        )}
                      </div>
                    ))}
                    <div style={{ width: '40px', flexShrink: 0 }} />
                  </div>

                  {/* Linhas por dia */}
                  {HEAT_DAYS.map((day, di) => (
                    <div key={day} className="flex items-center mb-0.5">
                      {/* Label do dia */}
                      <div className="text-xs font-semibold text-text-muted text-right pr-2 flex-shrink-0"
                        style={{ width: '44px' }}>
                        {day}
                      </div>

                      {/* Células */}
                      {HEAT_HOURS.map((h) => {
                        const val = heatMatrix[di][h]
                        const bg  = heatColor(val, heatMax)
                        const fg  = heatTextColor(val, heatMax)
                        return (
                          <div key={h} title={`${day} ${h}h: ${val}`}
                            className="flex-1 rounded flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-110 cursor-default"
                            style={{
                              minWidth: '28px', height: '28px',
                              background: bg, color: fg,
                              margin: '1px',
                            }}>
                            {val > 0 ? val : ''}
                          </div>
                        )
                      })}

                      {/* Total da linha */}
                      <div className="text-xs font-bold text-text-muted text-right pl-2 flex-shrink-0"
                        style={{ width: '40px', color: di === peakDay ? GREEN : undefined }}>
                        {heatRowTotals[di]}
                      </div>
                    </div>
                  ))}

                  {/* Totais por hora (rodapé) */}
                  <div className="flex items-center mt-1 pt-1" style={{ borderTop: '1px solid #E0E6ED' }}>
                    <div className="text-[9px] font-bold text-text-dim text-right pr-2 flex-shrink-0"
                      style={{ width: '44px' }}>TOT</div>
                    {HEAT_HOURS.map((h) => {
                      const total = heatColTotals[h]
                      return (
                        <div key={h} className="flex-1 text-center"
                          style={{
                            minWidth: '28px',
                            fontSize: '9px',
                            fontWeight: 700,
                            color: h === peakHour ? GREEN : '#A0AEC0',
                            margin: '1px',
                          }}>
                          {total > 0 ? total : ''}
                        </div>
                      )
                    })}
                    <div style={{ width: '40px', flexShrink: 0 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Barras por hora (top horas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="section-title mb-4">Top Horários</h3>
                <div className="space-y-2">
                  {[...HEAT_HOURS]
                    .sort((a, b) => heatColTotals[b] - heatColTotals[a])
                    .slice(0, 8)
                    .map((h, i) => {
                      const val = heatColTotals[h]
                      const pct = heatMax > 0 ? (val / Math.max(...heatColTotals, 1)) * 100 : 0
                      return (
                        <div key={h} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-text-dim w-4 text-right">{i + 1}</span>
                          <span className="text-xs font-semibold text-text-primary w-12">{h}h – {h + 1}h</span>
                          <div className="flex-1 h-2 rounded-full" style={{ background: '#E0E6ED' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${pct}%`, background: i === 0 ? GREEN : BLUE_L }} />
                          </div>
                          <span className="text-xs font-bold w-6 text-right"
                            style={{ color: i === 0 ? GREEN : BLUE_L }}>{val}</span>
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="section-title mb-4">Top Dias da Semana</h3>
                <div className="space-y-2">
                  {[...HEAT_DAYS.map((d, i) => ({ d, total: heatRowTotals[i], i }))]
                    .sort((a, b) => b.total - a.total)
                    .map(({ d, total, i }, rank) => {
                      const pct = Math.max(...heatRowTotals, 1) > 0
                        ? (total / Math.max(...heatRowTotals, 1)) * 100 : 0
                      return (
                        <div key={d} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-text-dim w-4 text-right">{rank + 1}</span>
                          <span className="text-xs font-semibold text-text-primary w-8">{d}</span>
                          <div className="flex-1 h-2 rounded-full" style={{ background: '#E0E6ED' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${pct}%`, background: rank === 0 ? GREEN : AMBER }} />
                          </div>
                          <span className="text-xs font-bold w-6 text-right"
                            style={{ color: rank === 0 ? GREEN : AMBER }}>{total}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Criativo Drawer */}
      {selectedCriativo && (
        <CriativoDrawer
          criativo={selectedCriativo}
          leads={filteredLeads}
          users={users}
          onClose={() => setSelectedCriativo(null)}
        />
      )}
    </AppShell>
  )
}
