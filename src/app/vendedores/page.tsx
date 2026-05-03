'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { calcMetricasPorVendedor, calcConversaoPorEtapa, formatCurrency } from '@/lib/utils'
import {
  Users, DollarSign, Calendar, ChevronUp, ChevronDown,
  X, AlertTriangle, Target,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { Lead } from '@/types'

// ── Paleta ────────────────────────────────────────────────────────────────────
const BLUE   = '#2563eb'
const GREEN  = '#059669'
const GREEN_L = '#10b981'
const AMBER  = '#d97706'
const RED    = '#dc2626'

const STATUS_LABELS: Record<string, string> = {
  trafego_pago: 'Tráfego', primeiro_contato: '1o Contato', followup1: 'Follow-up 1',
  followup2: 'Follow-up 2', followup3: 'Follow-up 3', agendado: 'Agendado',
  reuniao_realizada: 'Reunião', contrato_enviado: 'Ctr. Env.', contrato_assinado: 'Ctr. Ass.',
  fechado: 'Fechado', declinado: 'Declinado',
}
const STATUS_COLORS: Record<string, string> = {
  trafego_pago: '#6B7C93', primeiro_contato: '#3B82F6', followup1: '#60A5FA',
  followup2: '#818CF8', followup3: '#A78BFA', agendado: '#F59E0B',
  reuniao_realizada: '#F97316', contrato_enviado: '#8B5CF6', contrato_assinado: '#7C3AED',
  fechado: '#10B981', declinado: '#EF4444',
}
const FUNIL_ORDER = [
  'trafego_pago','primeiro_contato','followup1','followup2','followup3',
  'agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado',
]

type Period = '7d' | '30d' | '90d' | 'todos'
type SortKey = 'nome' | 'total' | 'respondeu' | 'agendados' | 'reunioes' | 'reunioesSemana'
  | 'fechados' | 'receita' | 'taxaConversao' | 'ticketMedio' | 'pipeline' | 'scoreMedio' | 'leadsParados'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────
function filterByPeriod(leads: Lead[], period: Period): Lead[] {
  if (period === 'todos') return leads
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const iso = cutoff.toISOString()
  return leads.filter((l) => l.data_criacao >= iso)
}

function convColor(taxa: number) {
  if (taxa >= 10) return GREEN_L
  if (taxa >= 5) return AMBER
  return RED
}

function statusBadge(m: ReturnType<typeof calcMetricasPorVendedor>[number]) {
  if (m.fechados === 0 && m.leadsParados > 5)
    return { label: 'Parado', color: RED, bg: 'rgba(220,38,38,0.1)' }
  if (m.leadsParados > 3)
    return { label: 'Atenção', color: AMBER, bg: 'rgba(217,119,6,0.1)' }
  return { label: 'Ativo', color: GREEN_L, bg: 'rgba(16,185,129,0.1)' }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp size={11} style={{ color: '#A0AEC0' }} />
  return dir === 'asc'
    ? <ChevronUp size={11} style={{ color: BLUE }} />
    : <ChevronDown size={11} style={{ color: BLUE }} />
}

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#6B7C93] uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-[#1F2D3D] leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ── Drawer do vendedor ────────────────────────────────────────────────────────
function VendedorDrawer({ vendedorId, vendedorNome, leads, onClose }: {
  vendedorId: string
  vendedorNome: string
  leads: Lead[]
  onClose: () => void
}) {
  const vLeads = leads.filter((l) => l.vendedor_id === vendedorId)
  const total = vLeads.length
  const fechados = vLeads.filter((l) => l.status_funil === 'fechado').length
  const receita = vLeads
    .filter((l) => l.status_funil === 'fechado')
    .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
  const taxaConv = total > 0 ? (fechados / total) * 100 : 0

  // Leads por dia
  const dailyMap: Record<string, number> = {}
  for (const l of vLeads) {
    const k = l.data_criacao.slice(0, 10)
    dailyMap[k] = (dailyMap[k] ?? 0) + 1
  }
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([data, Leads]) => ({ data: data.slice(5).replace('-', '/'), Leads }))

  // Distribuição no funil
  const funilData = FUNIL_ORDER
    .map((s) => ({
      label: STATUS_LABELS[s],
      Leads: vLeads.filter((l) => l.status_funil === s).length,
      color: STATUS_COLORS[s],
    }))
    .filter((d) => d.Leads > 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex flex-col h-full overflow-y-auto"
        style={{ width: '700px', background: '#FFFFFF', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E0E6ED' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)', boxShadow: '0 2px 8px rgba(47,191,113,0.3)' }}>
              {vendedorNome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#1F2D3D] text-base leading-tight">{vendedorNome}</p>
              <p className="text-xs text-[#6B7C93]">
                {total} leads · {fechados} fechados · {formatCurrency(receita)} receita · {taxaConv.toFixed(1)}% conv.
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] transition-colors"
            style={{ color: '#6B7C93', border: '1px solid #E0E6ED' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* KPIs mini */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Leads', value: total, color: BLUE },
              { label: 'Fechados', value: fechados, color: GREEN_L },
              { label: 'Conv.', value: `${taxaConv.toFixed(1)}%`, color: convColor(taxaConv) },
              { label: 'Receita', value: formatCurrency(receita), color: GREEN },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl p-3 text-center"
                style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                <p className="text-[10px] font-semibold text-[#6B7C93] uppercase tracking-wide">{kpi.label}</p>
                <p className="text-base font-extrabold mt-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* AreaChart — leads por dia */}
          <div className="rounded-2xl p-4" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
            <p className="text-xs font-bold text-[#1F2D3D] uppercase tracking-wide mb-3">Leads por Dia (últimos 30 dias)</p>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#A0AEC0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#A0AEC0' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E0E6ED', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Leads" stroke={BLUE} fill="url(#gradLeads)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#A0AEC0] text-center py-8">Nenhum lead registrado</p>
            )}
          </div>

          {/* BarChart — distribuição funil */}
          <div className="rounded-2xl p-4" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
            <p className="text-xs font-bold text-[#1F2D3D] uppercase tracking-wide mb-3">Distribuição no Funil</p>
            {funilData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funilData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#A0AEC0' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#6B7C93' }} width={80} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E0E6ED', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Leads" radius={[0, 4, 4, 0]}>
                    {funilData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#A0AEC0] text-center py-8">Nenhum dado</p>
            )}
          </div>

          {/* Tabela de leads */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
            <div className="px-4 py-3" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
              <p className="text-xs font-bold text-[#1F2D3D] uppercase tracking-wide">Leads ({total})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                    {['Nome', 'Status', 'Temperatura', 'Valor', 'Data'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#6B7C93]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vLeads.slice(0, 50).map((l, i) => (
                    <tr key={l.id}
                      style={{ borderBottom: '1px solid #F0F4F8', background: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      <td className="px-3 py-2 font-medium text-[#1F2D3D] max-w-[140px] truncate">{l.nome}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: `${STATUS_COLORS[l.status_funil]}18`, color: STATUS_COLORS[l.status_funil] }}>
                          {STATUS_LABELS[l.status_funil] ?? l.status_funil}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#6B7C93] capitalize">{l.temperatura}</td>
                      <td className="px-3 py-2 text-[#1F2D3D] font-medium">
                        {l.valor_fechado || l.valor_contrato
                          ? formatCurrency(l.valor_fechado ?? l.valor_contrato ?? 0)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-[#A0AEC0]">{l.data_criacao.slice(0, 10).split('-').reverse().join('/')}</td>
                    </tr>
                  ))}
                  {vLeads.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-[#A0AEC0]">Nenhum lead atribuído</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VendedoresPage() {
  const { currentUser, leads, users, historico } = useApp()
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('todos')
  const [sortKey, setSortKey] = useState<SortKey>('receita')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [drawerVendedorId, setDrawerVendedorId] = useState<string | null>(null)
  const [funnelVendorId, setFunnelVendorId] = useState<string>('todos')

  const filteredLeads = useMemo(() => filterByPeriod(leads, period), [leads, period])

  const metricas = useMemo(
    () => calcMetricasPorVendedor(filteredLeads, users, historico),
    [filteredLeads, users, historico]
  )

  const funnelLeadIds = useMemo(() => {
    const base = funnelVendorId === 'todos'
      ? filteredLeads
      : filteredLeads.filter((l) => l.vendedor_id === funnelVendorId)
    return new Set(base.map((l) => l.id))
  }, [filteredLeads, funnelVendorId])

  const conversaoPorEtapa = useMemo(
    () => calcConversaoPorEtapa(historico, funnelLeadIds),
    [historico, funnelLeadIds]
  )

  const sorted = useMemo(() => {
    return [...metricas].sort((a, b) => {
      const va = a[sortKey] as number | string
      const vb = b[sortKey] as number | string
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [metricas, sortKey, sortDir])

  // Redireciona não-admins
  if (currentUser && currentUser.tipo !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  // KPIs gerais
  const totalLeads = metricas.reduce((s, m) => s + m.total, 0)
  const totalReunioesSemana = metricas.reduce((s, m) => s + m.reunioesSemana, 0)
  const totalFechados = metricas.reduce((s, m) => s + m.fechados, 0)
  const totalReceita = metricas.reduce((s, m) => s + m.receita, 0)

  const drawerVendedor = drawerVendedorId
    ? users.find((u) => u.id === drawerVendedorId)
    : null

  const PERIODS: { key: Period; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'todos', label: 'Todos' },
  ]

  const COLS: { key: SortKey; label: string; minW?: string }[] = [
    { key: 'nome', label: 'Vendedor', minW: '140px' },
    { key: 'total', label: 'Leads' },
    { key: 'respondeu', label: 'Responderam' },
    { key: 'agendados', label: 'Agendados' },
    { key: 'reunioes', label: 'Reuniões' },
    { key: 'reunioesSemana', label: 'Reun./sem.' },
    { key: 'fechados', label: 'Fechados' },
    { key: 'receita', label: 'Receita' },
    { key: 'taxaConversao', label: 'Taxa Conv.' },
    { key: 'ticketMedio', label: 'Ticket Méd.' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'scoreMedio', label: 'Score' },
    { key: 'leadsParados', label: 'Parados' },
  ]

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* ── Título + período ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F2D3D]">Vendedores</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">Desempenho individual da equipe de vendas</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: period === p.key ? 'linear-gradient(135deg,#2FBF71,#1E8E5A)' : 'transparent',
                  color: period === p.key ? '#FFFFFF' : '#6B7C93',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total de Leads" value={totalLeads.toString()} icon={Users} color={BLUE} />
          <KpiCard label="Reuniões esta semana" value={totalReunioesSemana.toString()} icon={Calendar} color={AMBER} />
          <KpiCard label="Fechamentos" value={totalFechados.toString()} icon={Target} color={GREEN_L} />
          <KpiCard label="Receita Total" value={formatCurrency(totalReceita)} icon={DollarSign} color={GREEN} />
        </div>

        {/* ── Conversão por Etapa ──────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: '1px solid #E0E6ED' }}>
            <div>
              <p className="font-bold text-[#1F2D3D]">Conversão por Etapa do Funil</p>
              <p className="text-xs text-[#6B7C93] mt-0.5">Baseado no histórico real de movimentações</p>
            </div>
            <select
              value={funnelVendorId}
              onChange={(e) => setFunnelVendorId(e.target.value)}
              className="text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              style={{ background: '#F5F7FA', border: '1px solid #E0E6ED', color: '#1F2D3D' }}>
              <option value="todos">Todos os vendedores</option>
              {metricas.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div className="p-5 space-y-2">
            {conversaoPorEtapa.map((row, idx) => {
              const isLast = idx === conversaoPorEtapa.length - 1
              const maxEntradas = Math.max(...conversaoPorEtapa.map((r) => r.entradas), 1)
              const barWidth = (row.entradas / maxEntradas) * 100
              const avPct = row.entradas > 0 ? (row.avancou / row.entradas) * 100 : 0
              const decPct = row.entradas > 0 ? (row.declinado / row.entradas) * 100 : 0
              const parPct = row.entradas > 0 ? (row.parado / row.entradas) * 100 : 0
              const rateColor = isLast ? GREEN_L : row.taxaAvanco >= 50 ? GREEN_L : row.taxaAvanco >= 25 ? AMBER : RED

              return (
                <div key={row.etapa} className="flex items-center gap-3 group">
                  {/* Label */}
                  <div className="w-[130px] flex-shrink-0 text-right">
                    <span className="text-[11px] font-semibold text-[#6B7C93]">{row.label}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative h-6 rounded-md overflow-hidden" style={{ background: '#F0F4F8' }}>
                    <div className="absolute inset-y-0 left-0 flex rounded-md overflow-hidden transition-all"
                      style={{ width: `${barWidth}%` }}>
                      {!isLast && row.entradas > 0 ? (
                        <>
                          <div style={{ width: `${avPct}%`, background: '#10B981' }} title={`Avançou: ${row.avancou}`} />
                          <div style={{ width: `${decPct}%`, background: '#EF4444' }} title={`Declinado: ${row.declinado}`} />
                          <div style={{ width: `${parPct}%`, background: '#94A3B8' }} title={`Parado: ${row.parado}`} />
                        </>
                      ) : (
                        <div style={{ width: '100%', background: GREEN_L }} />
                      )}
                    </div>
                  </div>

                  {/* Entradas */}
                  <div className="w-10 text-right flex-shrink-0">
                    <span className="text-xs font-bold text-[#1F2D3D]">{row.entradas}</span>
                  </div>

                  {/* Taxa */}
                  {!isLast ? (
                    <div className="w-14 text-right flex-shrink-0">
                      <span className="text-[11px] font-bold" style={{ color: rateColor }}>
                        {row.taxaAvanco.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <div className="w-14 text-right flex-shrink-0">
                      <span className="text-[11px] font-semibold text-[#A0AEC0]">fim</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Legenda */}
            <div className="flex items-center gap-4 pt-3 border-t border-[#F0F4F8]">
              {[
                { color: '#10B981', label: 'Avançou' },
                { color: '#EF4444', label: 'Declinado' },
                { color: '#94A3B8', label: 'Parado/Sem mov.' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#6B7C93]">{l.label}</span>
                </div>
              ))}
              <span className="text-[10px] text-[#A0AEC0] ml-auto">Barras proporcionais ao volume de entradas · % = taxa de avanço</span>
            </div>
          </div>
        </div>

        {/* ── Tabela ranking ────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
            <p className="font-bold text-[#1F2D3D]">Ranking de Vendedores</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7C93] w-8">#</th>
                  {COLS.map((col) => (
                    <th key={col.key}
                      className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7C93] cursor-pointer whitespace-nowrap select-none"
                      style={{ minWidth: col.minW }}
                      onClick={() => handleSort(col.key)}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7C93]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={COLS.length + 2} className="px-3 py-10 text-center text-[#A0AEC0]">
                      Nenhum vendedor cadastrado
                    </td>
                  </tr>
                )}
                {sorted.map((m, i) => {
                  const badge = statusBadge(m)
                  const conv = m.taxaConversao
                  const convC = convColor(conv)
                  return (
                    <tr key={m.id}
                      className="hover:bg-[#F9FBFC] transition-colors"
                      style={{ borderBottom: '1px solid #F0F4F8' }}>
                      <td className="px-3 py-2.5 text-[#A0AEC0] font-bold text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)' }}>
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#1F2D3D] whitespace-nowrap">{m.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[#1F2D3D] font-medium">{m.total}</td>
                      <td className="px-3 py-2.5 text-[#1F2D3D]">{m.respondeu}</td>
                      <td className="px-3 py-2.5 text-[#1F2D3D]">{m.agendados}</td>
                      <td className="px-3 py-2.5 text-[#1F2D3D]">{m.reunioes}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold" style={{ color: m.reunioesSemana > 0 ? GREEN_L : '#A0AEC0' }}>
                          {m.reunioesSemana}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold" style={{ color: m.fechados > 0 ? GREEN_L : '#A0AEC0' }}>
                          {m.fechados}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#1F2D3D] whitespace-nowrap">
                        {formatCurrency(m.receita)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 rounded-full h-1.5 flex-shrink-0" style={{ background: '#E0E6ED' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(conv, 100)}%`, background: convC }} />
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: convC }}>{conv.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[#1F2D3D] whitespace-nowrap">{formatCurrency(m.ticketMedio)}</td>
                      <td className="px-3 py-2.5 text-[#6B7C93] whitespace-nowrap">{formatCurrency(m.pipeline)}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium" style={{ color: m.scoreMedio >= 60 ? GREEN_L : m.scoreMedio >= 40 ? AMBER : RED }}>
                          {m.scoreMedio.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {m.leadsParados > 0 ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: m.leadsParados > 5 ? RED : AMBER }}>
                            <AlertTriangle size={11} />
                            {m.leadsParados}
                          </span>
                        ) : (
                          <span className="text-[#A0AEC0]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Cards por vendedor ───────────────────────────────────────────── */}
        {metricas.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[#1F2D3D] uppercase tracking-wide mb-4">Detalhes por Vendedor</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {metricas.map((m) => {
                const badge = statusBadge(m)
                const convC = convColor(m.taxaConversao)
                return (
                  <div key={m.id} className="rounded-2xl p-5 space-y-4"
                    style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)', boxShadow: '0 2px 8px rgba(47,191,113,0.25)' }}>
                          {m.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1F2D3D] text-sm">{m.nome}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B7C93] mt-0.5">{m.total} leads no período</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#6B7C93] uppercase tracking-wide">Receita</p>
                        <p className="text-base font-extrabold" style={{ color: GREEN }}>{formatCurrency(m.receita)}</p>
                      </div>
                    </div>

                    {/* Mini KPIs */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Leads', val: m.total },
                        { label: 'Agendados', val: m.agendados },
                        { label: 'Reuniões', val: m.reunioes },
                        { label: 'Fechados', val: m.fechados },
                      ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl p-2 text-center"
                          style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                          <p className="text-[9px] font-semibold text-[#A0AEC0] uppercase">{kpi.label}</p>
                          <p className="text-sm font-extrabold text-[#1F2D3D]">{kpi.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Taxa de Conversão */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[#6B7C93]">Taxa de Conversão</span>
                        <span className="text-[11px] font-bold" style={{ color: convC }}>{m.taxaConversao.toFixed(1)}%</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ background: '#E0E6ED' }}>
                        <div className="h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(m.taxaConversao, 100)}%`, background: convC }} />
                      </div>
                    </div>

                    {/* Reuniões esta semana */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-[#6B7C93]">
                        <Calendar size={13} style={{ color: AMBER }} />
                        <span>Reuniões esta semana</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: m.reunioesSemana > 0 ? GREEN_L : '#A0AEC0' }}>
                        {m.reunioesSemana}
                      </span>
                    </div>

                    {/* Leads parados */}
                    {m.leadsParados > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold"
                        style={{ background: m.leadsParados > 5 ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)', color: m.leadsParados > 5 ? RED : AMBER }}>
                        <AlertTriangle size={13} />
                        {m.leadsParados} lead{m.leadsParados !== 1 ? 's' : ''} parado{m.leadsParados !== 1 ? 's' : ''} (sem interação há +24h)
                      </div>
                    )}

                    {/* Botão ver leads */}
                    <button
                      onClick={() => setDrawerVendedorId(m.id)}
                      className="w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)', color: '#FFFFFF' }}>
                      Ver leads →
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {metricas.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <Users size={32} style={{ color: '#A0AEC0', margin: '0 auto 12px' }} />
            <p className="text-sm font-semibold text-[#6B7C93]">Nenhum vendedor cadastrado</p>
            <p className="text-xs text-[#A0AEC0] mt-1">Adicione vendedores em Usuários para ver as métricas aqui.</p>
          </div>
        )}
      </div>

      {/* ── Drawer lateral ────────────────────────────────────────────────── */}
      {drawerVendedorId && drawerVendedor && (
        <VendedorDrawer
          vendedorId={drawerVendedorId}
          vendedorNome={drawerVendedor.nome}
          leads={filteredLeads}
          onClose={() => setDrawerVendedorId(null)}
        />
      )}
    </AppShell>
  )
}
