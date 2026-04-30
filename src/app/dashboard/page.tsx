'use client'

import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import {
  calcFunnelMetrics, calcGargalos, calcReceitaPorDimensao,
  calcMetricasPorCriativo, formatCurrency, scoreBg, cn,
} from '@/lib/utils'
import {
  Users, MessageCircle, Calendar, Video, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle,
  Zap, ArrowRight, BellRing, Clock, ChevronRight,
  Star, Award, ShieldAlert, Wallet, BarChart3, Activity,
  Trophy, Crown, Phone, X as XIcon,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import type { Meta } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts'
import { useRouter } from 'next/navigation'

// ── Paleta ────────────────────────────────────────────────────────────────────
const BLUE   = '#2563eb'
const BLUE_L = '#3b82f6'
const GREEN  = '#059669'
const GREEN_L= '#10b981'
const SKY    = '#0ea5e9'
const AMBER  = '#d97706'
const RED    = '#dc2626'

const CHART_COLORS = [BLUE, GREEN, SKY, '#7c3aed', AMBER, RED]

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border shadow-2xl p-3 text-sm"
      style={{ background: '#FFFFFF', borderColor: '#E0E6ED' }}>
      <p className="font-semibold text-text-primary mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="font-bold text-text-bright">
            {typeof p.value === 'number' && p.value > 1000
              ? formatCurrency(p.value)
              : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent: string; trend?: number
}) {
  return (
    <div className="metric-card card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18` }}>
          <Icon size={19} style={{ color: accent }} />
        </div>
        {trend !== undefined && (
          <div className={cn('stat-pill')}
          style={trend >= 0
            ? { background: '#E8F8F0', color: '#1E8E5A' }
            : { background: '#FEF2F2', color: '#DC2626' }}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</p>
        <p className="text-xs font-semibold text-text-muted mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-text-dim mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Alerta types ──────────────────────────────────────────────────────────────
const ALERTA_CFG = {
  lead_parado:        { icon: Clock,         color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)',  label: 'Lead Parado' },
  followup_atrasado:  { icon: AlertTriangle, color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.25)',  label: 'Follow-up Atrasado' },
  reuniao_proxima:    { icon: Calendar,      color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.25)',  label: 'Reuniao Proxima' },
}

const CRIATIVO_LABELS: Record<string, string> = {
  video_depoimento_cliente:    'Video Depoimento',
  carrossel_beneficios:        'Carrossel Beneficios',
  video_resultado_antes_depois:'Video Antes/Depois',
  banner_desconto_30:          'Banner Desconto 30%',
  reels_duvidas_frequentes:    'Reels Duvidas',
  sem_criativo:                'Sem Criativo',
}

// ── Shared status/temp maps ───────────────────────────────────────────────────
const ST_CLR: Record<string, string> = {
  trafego_pago:'#6B7C93',primeiro_contato:'#3B82F6',followup1:'#60A5FA',
  followup2:'#818CF8',followup3:'#A78BFA',agendado:'#F59E0B',
  reuniao_realizada:'#F97316',contrato_enviado:'#8B5CF6',contrato_assinado:'#7C3AED',
  fechado:'#10B981',declinado:'#EF4444',
}
const ST_LBL: Record<string, string> = {
  trafego_pago:'Tráfego',primeiro_contato:'1o Contato',followup1:'FU1',
  followup2:'FU2',followup3:'FU3',agendado:'Agendado',
  reuniao_realizada:'Reunião',contrato_enviado:'Ctr. Env.',contrato_assinado:'Ctr. Ass.',
  fechado:'Fechado',declinado:'Declinado',
}
const TP_CLR: Record<string, string> = { frio:'#60a5fa',morno:'#f59e0b',quente:'#f97316',muito_quente:'#ef4444',desqualificado:'#9CA3AF' }
const TP_LBL: Record<string, string> = { frio:'Frio',morno:'Morno',quente:'Quente',muito_quente:'M. Quente',desqualificado:'Desq.' }
const AGENDOU = ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado']
const CONTATOU = ['primeiro_contato','followup1','followup2','followup3',...AGENDOU]

function LeadsTable({ rows, showVendedor, users }: { rows: any[]; showVendedor?: boolean; users: any[] }) {
  const router = useRouter()
  return (
    <table className="w-full">
      <thead>
        <tr style={{ background:'#F5F7FA', borderBottom:'1px solid #E0E6ED' }}>
          {['Lead','Status','Temperatura','Score', showVendedor && 'Vendedor','Data'].filter(Boolean).map((h) => (
            <th key={h as string} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((lead) => {
          const sc = ST_CLR[lead.status_funil] || '#6B7C93'
          const tc = TP_CLR[lead.temperatura]  || '#9CA3AF'
          const score = lead.score_lead ?? 0
          const valor = lead.valor_fechado || parseFloat(lead.valor_estimado||'0') || 0
          const vend = users.find((u: any) => u.id === lead.vendedor_id)
          return (
            <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}
              style={{ borderBottom:'1px solid #F5F7FA', cursor:'pointer' }}
              className="hover:bg-[#F5F7FA] transition-colors">
              <td className="px-4 py-3 text-xs font-semibold text-[#1F2D3D] max-w-[140px] truncate">{lead.nome}</td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background:`${sc}15`, color:sc }}>
                  {ST_LBL[lead.status_funil]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color:tc }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:tc }} />
                  {TP_LBL[lead.temperatura]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-bold" style={{ color: score>=70?'#16A34A':score>=40?'#B45309':'#B91C1C' }}>{score}</span>
              </td>
              {showVendedor && <td className="px-4 py-3 text-xs text-[#6B7C93]">{vend?.nome.split(' ')[0]??'—'}</td>}
              <td className="px-4 py-3 text-[10px] text-[#A0AEC0] font-mono">{lead.data_criacao}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── MetaBanner ────────────────────────────────────────────────────────────────
const MES_PT: Record<string, string> = {
  '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez',
}

function MetaBanner({ meta, leads, vendedorId, users }: { meta: Meta; leads: import('@/types').Lead[]; vendedorId: string; users: import('@/types').User[] }) {
  const [msgIdx, setMsgIdx] = useState(0)

  // receita do vendedor no mês da meta
  const receita = leads
    .filter((l) => l.vendedor_id === vendedorId && l.status_funil === 'fechado' && l.data_criacao.startsWith(meta.mes))
    .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)

  const pct = meta.meta_receita > 0 ? Math.min((receita / meta.meta_receita) * 100, 100) : 0
  const falta = Math.max(meta.meta_receita - receita, 0)
  const qualificado = receita >= meta.minimo_participar

  // ranking entre vendedores ativos no mês da meta
  const ranking = users
    .filter((u) => u.tipo === 'vendedor' && u.ativo !== false)
    .map((v) => ({
      id: v.id,
      receita: leads.filter((l) => l.vendedor_id === v.id && l.status_funil === 'fechado' && l.data_criacao.startsWith(meta.mes))
        .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0),
    }))
    .sort((a, b) => b.receita - a.receita)
  const pos = ranking.findIndex((v) => v.id === vendedorId) + 1

  const [ano, m] = meta.mes.split('-')
  const mesNome = `${MES_PT[m] ?? m}/${ano}`

  const msgs = [
    `🏆 Meta de ${mesNome}: ${meta.titulo}`,
    receita > 0 ? `📊 Você está em ${pos}° lugar com ${formatCurrency(receita)}` : `📊 Você ainda não tem vendas fechadas este mês`,
    falta > 0 ? `🎯 Faltam ${formatCurrency(falta)} para bater a meta` : `✅ Parabéns! Você bateu a meta!`,
    meta.premio_1_descricao ? `🥇 1° lugar: ${meta.premio_1_descricao}${meta.premio_1_valor > 0 ? ` + ${formatCurrency(meta.premio_1_valor)}` : ''}` : null,
    meta.premio_2_descricao ? `🥈 2° lugar: ${meta.premio_2_descricao}${meta.premio_2_valor > 0 ? ` + ${formatCurrency(meta.premio_2_valor)}` : ''}` : null,
    meta.minimo_participar > 0 ? (qualificado ? `✅ Você está qualificado para o prêmio` : `⚠️ Faltam ${formatCurrency(meta.minimo_participar - receita)} para se qualificar`) : null,
  ].filter(Boolean) as string[]

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % msgs.length), 4000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length])

  const bateu = receita >= meta.meta_receita

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #FDE68A' }}>
      {/* Top bar com progresso */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #92400E 0%, #B45309 50%, #D97706 100%)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-200" />
            <div>
              <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Meta do Mês — {mesNome}</p>
              <p className="text-base font-bold text-white">{meta.titulo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-200 font-medium">Sua posição</p>
            <p className="text-2xl font-extrabold text-white">{pos}°</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex items-center justify-between text-[11px] text-amber-200 mb-1.5">
          <span>{formatCurrency(receita)}</span>
          <span className="font-bold">{pct.toFixed(0)}%</span>
          <span>{formatCurrency(meta.meta_receita)}</span>
        </div>
        <div className="h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-3 rounded-full transition-all relative overflow-hidden"
            style={{ width: `${pct}%`, background: bateu ? '#2FBF71' : 'linear-gradient(90deg, #FCD34D, #F59E0B)' }}>
            {pct > 10 && (
              <div className="absolute inset-0 opacity-30"
                style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)' }} />
            )}
          </div>
        </div>
        {bateu && (
          <p className="text-xs text-emerald-300 font-bold mt-1.5 text-center">Meta batida!</p>
        )}
      </div>

      {/* Ticker animado */}
      <div className="flex items-center gap-3 px-4 py-2.5 overflow-hidden"
        style={{ background: '#FFFBEB', borderTop: '1px solid #FDE68A' }}>
        <Crown size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <p key={msgIdx} className="text-xs font-semibold text-amber-800 truncate animate-pulse"
          style={{ animation: 'fadeIn 0.5s ease' }}>
          {msgs[msgIdx]}
        </p>
      </div>

      {/* Prêmios footer */}
      {(meta.premio_1_descricao || meta.premio_2_descricao) && (
        <div className="flex divide-x" style={{ borderTop: '1px solid #FDE68A' }}>
          {meta.premio_1_descricao && (
            <div className="flex-1 px-4 py-2.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">🥇 1° Lugar</p>
              <p className="text-xs font-semibold text-amber-900 mt-0.5 truncate">{meta.premio_1_descricao}</p>
              {meta.premio_1_valor > 0 && <p className="text-xs font-bold" style={{ color: '#B45309' }}>{formatCurrency(meta.premio_1_valor)}</p>}
            </div>
          )}
          {meta.premio_2_descricao && (
            <div className="flex-1 px-4 py-2.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">🥈 2° Lugar</p>
              <p className="text-xs font-semibold text-amber-900 mt-0.5 truncate">{meta.premio_2_descricao}</p>
              {meta.premio_2_valor > 0 && <p className="text-xs font-bold text-amber-700">{formatCurrency(meta.premio_2_valor)}</p>}
            </div>
          )}
          {meta.minimo_participar > 0 && (
            <div className="flex-1 px-4 py-2.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Mínimo</p>
              <p className="text-xs font-semibold text-amber-900 mt-0.5">{formatCurrency(meta.minimo_participar)}</p>
              <p className="text-[10px] text-amber-700">para concorrer</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vendedor Dashboard ────────────────────────────────────────────────────────
function VendedorDashboard() {
  const { leads, users, alertas, currentUser, metas } = useApp()
  const metaAtiva = metas.find((m) => m.ativa)

  const my = leads.filter((l) => l.vendedor_id === currentUser?.id)

  const total      = my.length
  const responderam = my.filter((l) => CONTATOU.includes(l.status_funil)).length
  const agendados  = my.filter((l) => AGENDOU.includes(l.status_funil)).length
  const reunioes   = my.filter((l) => ['reuniao_realizada','contrato_enviado','contrato_assinado','fechado'].includes(l.status_funil)).length
  const fechados   = my.filter((l) => l.status_funil === 'fechado').length
  const declinados = my.filter((l) => l.status_funil === 'declinado').length
  const receita    = my.filter((l) => l.status_funil === 'fechado').reduce((s,l) => s+(l.valor_fechado??l.valor_contrato??0), 0)
  const pipeline   = my.filter((l) => !['fechado','declinado'].includes(l.status_funil)).reduce((s,l) => s+parseFloat(l.valor_estimado||'0'), 0)
  const ticketMedio = fechados>0 ? receita/fechados : 0
  const taxaConv   = total>0 ? (fechados/total)*100 : 0
  const taxaAgend  = total>0 ? (agendados/total)*100 : 0
  const taxaResp   = total>0 ? (responderam/total)*100 : 0

  const ativos    = my.filter((l) => !['fechado','declinado'].includes(l.status_funil))
  const scoreMedio = ativos.length>0 ? Math.round(ativos.reduce((s,l)=>s+(l.score_lead??0),0)/ativos.length) : 0

  const alertasAtivos = alertas.filter((a) => !a.resolvido && my.find((l) => l.id === a.lead_id))

  const funnelArea = [
    { name:'Recebidos',  v: total },
    { name:'Contatados', v: responderam },
    { name:'Agendados',  v: agendados },
    { name:'Reuniões',   v: reunioes },
    { name:'Fechados',   v: fechados },
  ]

  const tempDist = ['frio','morno','quente','muito_quente','desqualificado']
    .map((t) => ({ name: TP_LBL[t], v: my.filter((l)=>l.temperatura===t).length, color: TP_CLR[t] }))
    .filter((d) => d.v > 0)

  const recentLeads = [...my].sort((a,b)=>new Date(b.data_criacao).getTime()-new Date(a.data_criacao).getTime()).slice(0,10)

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5 min-h-screen" style={{ background:'#F5F7FA' }}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2D3D] tracking-tight">Meu Dashboard</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">
              Olá, <span className="font-semibold" style={{ color:'#2FBF71' }}>{currentUser?.nome.split(' ')[0]}</span> — resumo da sua performance
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED' }}>
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background:'#2FBF71' }} />
            <span className="text-xs text-[#6B7C93] font-medium">Tempo real</span>
          </div>
        </div>

        {/* Banner de meta ativa */}
        {metaAtiva && currentUser && (
          <MetaBanner meta={metaAtiva} leads={leads} vendedorId={currentUser.id} users={users} />
        )}

        {alertasAtivos.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background:'#FEF2F2', border:'1px solid #FECACA' }}>
            <BellRing size={15} style={{ color:'#DC2626', flexShrink:0 }} />
            <p className="text-sm font-semibold" style={{ color:'#B91C1C' }}>
              {alertasAtivos.length} alerta{alertasAtivos.length>1?'s':''} pendente{alertasAtivos.length>1?'s':''} nos seus leads
            </p>
          </div>
        )}

        {/* Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED', borderTop:'4px solid #2FBF71' }}>
            <div className="absolute right-4 top-4 opacity-[0.04]"><DollarSign size={80} style={{ color:'#2FBF71' }} /></div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#E8F8F0' }}>
                <DollarSign size={16} style={{ color:'#2FBF71' }} />
              </div>
              <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest">Receita Confirmada</p>
            </div>
            <p className="text-3xl font-extrabold text-[#1F2D3D]">{formatCurrency(receita)}</p>
            <p className="text-sm text-[#6B7C93] mt-1">{fechados} negócio{fechados!==1?'s':''} fechado{fechados!==1?'s':''}</p>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop:'1px solid #E0E6ED' }}>
              <div>
                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider font-semibold">Ticket Médio</p>
                <p className="text-base font-bold text-[#1F2D3D] mt-0.5">{formatCurrency(ticketMedio)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider font-semibold">Pipeline</p>
                <p className="text-base font-bold mt-0.5" style={{ color:'#3B82F6' }}>{formatCurrency(pipeline)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED', borderTop:'4px solid #3B82F6' }}>
            <div className="absolute right-3 top-3 opacity-[0.04]"><Target size={64} style={{ color:'#3B82F6' }} /></div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#EFF6FF' }}>
                <Target size={16} style={{ color:'#3B82F6' }} />
              </div>
              <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest">Taxa de Conversão</p>
            </div>
            <p className="text-3xl font-extrabold" style={{ color: taxaConv>=15?'#16A34A':taxaConv>=8?'#B45309':'#B91C1C' }}>{taxaConv.toFixed(1)}%</p>
            <p className="text-sm text-[#6B7C93] mt-1">{fechados} de {total} leads</p>
            <div className="mt-3 w-full rounded-full h-2" style={{ background:'#EEF1F5' }}>
              <div className="h-2 rounded-full" style={{ width:`${Math.min(taxaConv*3,100)}%`, background: taxaConv>=15?'#2FBF71':taxaConv>=8?'#F59E0B':'#EF4444' }} />
            </div>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED', borderTop:'4px solid #7C3AED' }}>
            <div className="absolute right-3 top-3 opacity-[0.04]"><Activity size={64} style={{ color:'#7C3AED' }} /></div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#FAF5FF' }}>
                <Activity size={16} style={{ color:'#7C3AED' }} />
              </div>
              <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest">Score Médio Pipeline</p>
            </div>
            <p className="text-3xl font-extrabold text-[#1F2D3D]">{scoreMedio}<span className="text-xl text-[#A0AEC0] font-normal">/100</span></p>
            <p className="text-sm text-[#6B7C93] mt-1">{ativos.length} leads ativos</p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Leads Recebidos',   v:total,      fmt:(v:number)=>String(v),           color:BLUE_L,   icon:Users },
            { label:'Responderam',       v:responderam,fmt:(v:number)=>String(v),           color:SKY,      icon:MessageCircle, sub:`${taxaResp.toFixed(0)}% do total` },
            { label:'Agendamentos',      v:agendados,  fmt:(v:number)=>String(v),           color:AMBER,    icon:Calendar,      sub:`${taxaAgend.toFixed(0)}% de agendamento` },
            { label:'Reuniões Realizadas',v:reunioes,  fmt:(v:number)=>String(v),           color:'#7C3AED',icon:Video },
            { label:'Fechados',          v:fechados,   fmt:(v:number)=>String(v),           color:GREEN_L,  icon:CheckCircle },
            { label:'Declinados',        v:declinados, fmt:(v:number)=>String(v),           color:RED,      icon:XCircle },
            { label:'Taxa Agendamento',  v:taxaAgend,  fmt:(v:number)=>`${v.toFixed(1)}%`, color:AMBER,    icon:TrendingUp },
            { label:'Taxa Conversão',    v:taxaConv,   fmt:(v:number)=>`${v.toFixed(1)}%`, color:GREEN_L,  icon:Target },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4 metric-card" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`${k.color}15` }}>
                  <k.icon size={13} style={{ color:k.color }} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0] leading-tight">{k.label}</p>
              </div>
              <p className="text-2xl font-extrabold" style={{ color:k.color }}>{k.fmt(k.v)}</p>
              {'sub' in k && k.sub && <p className="text-[10px] text-[#A0AEC0] mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Funil + Temperatura */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="card p-5 lg:col-span-3">
            <h3 className="section-title mb-1">Meu Funil de Conversão</h3>
            <p className="text-xs text-text-muted mb-4">Do recebimento ao fechamento</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={funnelArea} margin={{ left:-10 }}>
                <defs>
                  <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2FBF71" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2FBF71" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:'#A0AEC0', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#A0AEC0', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="v" name="Leads" stroke="#2FBF71" strokeWidth={2.5}
                  fill="url(#gGrad)" dot={{ fill:'#2FBF71', r:4, strokeWidth:0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5 lg:col-span-2">
            <h3 className="section-title mb-1">Temperatura dos Leads</h3>
            <p className="text-xs text-text-muted mb-4">Distribuição por interesse</p>
            {tempDist.length > 0 ? (
              <div className="space-y-3">
                {tempDist.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background:t.color }} />
                        <span className="text-xs font-medium text-[#374151]">{t.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color:t.color }}>{t.v}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background:'#EEF1F5' }}>
                      <div className="h-1.5 rounded-full" style={{ width:`${total>0?(t.v/total)*100:0}%`, background:t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#A0AEC0]">Sem leads ainda.</p>}
          </div>
        </div>

        {/* Leads recentes */}
        <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #E0E6ED' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background:'#F5F7FA', borderBottom:'1px solid #E0E6ED' }}>
            <div>
              <h3 className="text-sm font-bold text-[#1F2D3D]">Meus Leads Recentes</h3>
              <p className="text-[10px] text-[#A0AEC0] mt-0.5">Clique para abrir o lead</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background:'#FFFFFF', color:'#6B7C93', border:'1px solid #E0E6ED' }}>{my.length} total</span>
          </div>
          <div style={{ background:'#FFFFFF' }}>
            {recentLeads.length === 0
              ? <p className="text-sm text-[#A0AEC0] text-center py-8">Nenhum lead atribuído ainda.</p>
              : <LeadsTable rows={recentLeads} users={users} />}
          </div>
        </div>

      </div>
    </AppShell>
  )
}

// ── Notificação de novo lead (SDR) ────────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.15].forEach((delay) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.4)
    })
  } catch { /* sem permissão de áudio — silencioso */ }
}

function NewLeadToast({ lead, onClose }: { lead: any; onClose: () => void }) {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(onClose, 10000)
    return () => clearTimeout(t)
  }, [onClose])

  const initial = lead.nome?.charAt(0).toUpperCase() ?? '?'
  const fonte   = lead.utm_source ? ` · ${lead.utm_source}` : ''

  return (
    <div
      className="fixed top-4 right-4 z-[999] w-80 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E6ED',
        animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Barra verde de progresso (10s) */}
      <div className="h-1 w-full" style={{ background: '#E0E6ED' }}>
        <div className="h-1 rounded-full" style={{
          background: 'linear-gradient(90deg,#2FBF71,#1E8E5A)',
          animation: 'shrink 10s linear forwards',
          transformOrigin: 'left',
        }} />
        <style>{`@keyframes shrink { from{width:100%} to{width:0%} }`}</style>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ boxShadow: '0 2px 8px rgba(47,191,113,0.4)' }}>
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#E8F8F0', color: '#059669' }}>
                NOVO LEAD
              </span>
              <span className="text-[10px] text-[#A0AEC0]">{fonte}</span>
            </div>
            <p className="text-sm font-bold text-[#1F2D3D] truncate">{lead.nome}</p>
            {lead.telefone && (
              <p className="text-xs text-[#6B7C93] flex items-center gap-1 mt-0.5">
                <Phone size={11} /> {lead.telefone}
              </p>
            )}
          </div>

          <button onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F5F7FA]"
            style={{ color: '#A0AEC0' }}>
            <XIcon size={13} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { router.push('/kanban'); onClose() }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#2FBF71,#1E8E5A)' }}>
            Abrir no Kanban
          </button>
          <button onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[#F5F7FA]"
            style={{ color: '#6B7C93', border: '1px solid #E0E6ED' }}>
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SDR Dashboard ─────────────────────────────────────────────────────────────
function SDRDashboard() {
  const { leads, users, currentUser } = useApp()
  const [toastLead, setToastLead]   = useState<any | null>(null)
  const knownIds = useRef<Set<string> | null>(null)

  // Detecta novos leads atribuídos diretamente a este SDR
  useEffect(() => {
    const minhaIds = new Set(leads.filter((l) => l.sdr_id === currentUser?.id).map((l) => l.id))

    if (knownIds.current === null) {
      // Primeira carga — apenas registra IDs existentes, não notifica
      knownIds.current = minhaIds
      return
    }

    // Verifica se chegou lead novo
    for (const lead of leads) {
      if (lead.sdr_id === currentUser?.id && !knownIds.current.has(lead.id)) {
        knownIds.current.add(lead.id)
        setToastLead(lead)
        playNotifSound()
        break // mostra 1 por vez; o próximo aparece quando este fechar
      }
    }
  }, [leads, currentUser?.id])

  // SDR vê seus próprios leads (sdr_id) + todos os leads dos vendedores vinculados
  const vendedoresVinculados = currentUser?.vendedorVinculado
    ? currentUser.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const my = leads.filter((l) =>
    l.sdr_id === currentUser?.id ||
    vendedoresVinculados.includes(l.vendedor_id)
  )

  const total      = my.length
  const contatados = my.filter((l) => CONTATOU.includes(l.status_funil)).length
  const agendados  = my.filter((l) => AGENDOU.includes(l.status_funil)).length
  const declinados = my.filter((l) => l.status_funil === 'declinado').length
  const emFollowup = my.filter((l) => ['followup1','followup2','followup3'].includes(l.status_funil)).length
  const fechados   = my.filter((l) => l.status_funil === 'fechado').length

  const taxaContato = total>0 ? (contatados/total)*100 : 0
  const taxaAgend   = total>0 ? (agendados/total)*100 : 0
  const taxaDeclinio = total>0 ? (declinados/total)*100 : 0

  const comResp   = my.filter((l) => l.tempo_resposta_segundos !== undefined)
  const tempoMedio = comResp.length>0
    ? Math.round(comResp.reduce((s,l)=>s+(l.tempo_resposta_segundos??0),0)/comResp.length)
    : 0
  const rapidosCount = my.filter((l) => (l.tempo_resposta_segundos??9999) < 600).length

  const ativos    = my.filter((l) => !['fechado','declinado'].includes(l.status_funil))
  const scoreMedio = ativos.length>0 ? Math.round(ativos.reduce((s,l)=>s+(l.score_lead??0),0)/ativos.length) : 0

  const tempDist = ['frio','morno','quente','muito_quente','desqualificado']
    .map((t) => ({ name:TP_LBL[t], v:my.filter((l)=>l.temperatura===t).length, color:TP_CLR[t] }))
    .filter((d) => d.v > 0)

  const funnelBar = [
    { name:'Recebidos',  v:total,      color:BLUE_L },
    { name:'Contatados', v:contatados, color:SKY },
    { name:'Agendados',  v:agendados,  color:AMBER },
    { name:'Declinados', v:declinados, color:RED },
  ]

  const recentLeads = [...my].sort((a,b)=>new Date(b.data_criacao).getTime()-new Date(a.data_criacao).getTime()).slice(0,10)

  const fmtTempo = (s: number) => s<60 ? `${s}s` : s<3600 ? `${Math.round(s/60)}min` : `${(s/3600).toFixed(1)}h`

  return (
    <AppShell>
      {/* Toast de novo lead */}
      {toastLead && <NewLeadToast lead={toastLead} onClose={() => setToastLead(null)} />}

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5 min-h-screen" style={{ background:'#F5F7FA' }}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2D3D] tracking-tight">Meu Dashboard — SDR</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">
              Olá, <span className="font-semibold" style={{ color:'#F59E0B' }}>{currentUser?.nome.split(' ')[0]}</span> — performance de prospecção e agendamento
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED' }}>
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background:'#F59E0B' }} />
            <span className="text-xs text-[#6B7C93] font-medium">Tempo real</span>
          </div>
        </div>

        {/* 4 banners */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label:'Leads Atribuídos', v:total,      sub:undefined,                         color:BLUE_L, icon:Users,          border:BLUE_L, bg:'#EFF6FF' },
            { label:'Contatados',       v:contatados, sub:`${taxaContato.toFixed(0)}% de contato`, color:SKY,    icon:MessageCircle,  border:SKY,    bg:'#F0F9FF' },
            { label:'Agendamentos',     v:agendados,  sub:`${taxaAgend.toFixed(0)}% de agendamento`,color:AMBER, icon:Calendar,       border:AMBER,  bg:'#FFFBEB' },
            { label:'Declinados',       v:declinados, sub:`${taxaDeclinio.toFixed(0)}% do total`,  color:RED,   icon:XCircle,        border:RED,    bg:'#FEF2F2' },
          ] as const).map((k) => (
            <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background:'#FFFFFF', border:'1px solid #E0E6ED', borderTop:`4px solid ${k.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:k.bg }}>
                  <k.icon size={16} style={{ color:k.color }} />
                </div>
                <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest">{k.label}</p>
              </div>
              <p className="text-3xl font-extrabold" style={{ color:k.color }}>{k.v}</p>
              {k.sub && <p className="text-xs text-[#A0AEC0] mt-1">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Em Follow-up',        v:emFollowup,   fmt:(v:number)=>String(v),           color:'#818CF8',icon:ArrowRight },
            { label:'Fechados (pelo time)', v:fechados,     fmt:(v:number)=>String(v),           color:GREEN_L,  icon:CheckCircle },
            { label:'Taxa Agendamento',     v:taxaAgend,    fmt:(v:number)=>`${v.toFixed(1)}%`,  color:AMBER,    icon:TrendingUp },
            { label:'Score Médio Pipeline', v:scoreMedio,   fmt:(v:number)=>String(v),           color:'#7C3AED',icon:Activity },
            { label:'Leads Ativos',         v:ativos.length,fmt:(v:number)=>String(v),           color:BLUE_L,   icon:Zap },
            { label:'Resp. < 10min',        v:rapidosCount, fmt:(v:number)=>String(v),           color:GREEN_L,  icon:CheckCircle },
            { label:'Tempo Médio Resposta', v:tempoMedio,   fmt:(v:number)=>fmtTempo(v),         color:SKY,      icon:Clock },
            { label:'Taxa de Contato',      v:taxaContato,  fmt:(v:number)=>`${v.toFixed(1)}%`,  color:SKY,      icon:Target },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4 metric-card" style={{ background:'#FFFFFF', border:'1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`${k.color}15` }}>
                  <k.icon size={13} style={{ color:k.color }} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0] leading-tight">{k.label}</p>
              </div>
              <p className="text-2xl font-extrabold" style={{ color:k.color }}>{k.fmt(k.v)}</p>
            </div>
          ))}
        </div>

        {/* Funil bar + Temperatura */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="card p-5 lg:col-span-3">
            <h3 className="section-title mb-1">Funil de Prospecção</h3>
            <p className="text-xs text-text-muted mb-4">Recebidos → Contatados → Agendados</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={funnelBar} margin={{ left:-15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:'#A0AEC0', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#A0AEC0', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="v" name="Leads" radius={[6,6,0,0]}>
                  {funnelBar.map((d,i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5 lg:col-span-2">
            <h3 className="section-title mb-1">Temperatura dos Leads</h3>
            <p className="text-xs text-text-muted mb-4">Qualidade do interesse demonstrado</p>
            {tempDist.length > 0 ? (
              <div className="space-y-3">
                {tempDist.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background:t.color }} />
                        <span className="text-xs font-medium text-[#374151]">{t.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color:t.color }}>
                        {t.v} <span className="text-[#A0AEC0] font-normal">({total>0?((t.v/total)*100).toFixed(0):0}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background:'#EEF1F5' }}>
                      <div className="h-1.5 rounded-full" style={{ width:`${total>0?(t.v/total)*100:0}%`, background:t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#A0AEC0]">Sem leads ainda.</p>}
          </div>
        </div>

        {/* Leads recentes */}
        <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #E0E6ED' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background:'#F5F7FA', borderBottom:'1px solid #E0E6ED' }}>
            <div>
              <h3 className="text-sm font-bold text-[#1F2D3D]">Meus Leads Recentes</h3>
              <p className="text-[10px] text-[#A0AEC0] mt-0.5">Clique para abrir e adicionar anotações</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background:'#FFFFFF', color:'#6B7C93', border:'1px solid #E0E6ED' }}>{my.length} total</span>
          </div>
          <div style={{ background:'#FFFFFF' }}>
            {recentLeads.length === 0
              ? <p className="text-sm text-[#A0AEC0] text-center py-8">Nenhum lead atribuído ainda.</p>
              : <LeadsTable rows={recentLeads} users={users} showVendedor />}
          </div>
        </div>

      </div>
    </AppShell>
  )
}

// ── LeadHeatmap ───────────────────────────────────────────────────────────────
const DAYS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS    = Array.from({ length: 24 }, (_, i) => i)
const TZ_SP    = 'America/Sao_Paulo'

// Extrai hora no fuso de São Paulo a partir de qualquer timestamp
function getHourSP(ts: string): number {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_SP, hour: 'numeric', hour12: false,
  }).formatToParts(new Date(ts))
  const h = parts.find((p) => p.type === 'hour')
  return h ? parseInt(h.value, 10) : 9
}

// Extrai dia-da-semana no fuso de São Paulo a partir de DATE "YYYY-MM-DD"
function getDayOfWeekSP(dateStr: string): number {
  // Usa meio-dia local para evitar virada de dia por UTC midnight
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_SP, weekday: 'short',
  }).formatToParts(new Date(dateStr.substring(0, 10) + 'T12:00:00'))
  const wd = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const map: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sáb: 6, sab: 6 }
  return map[wd] ?? new Date(dateStr.substring(0, 10) + 'T12:00:00').getDay()
}

function LeadHeatmap({ leads }: { leads: any[] }) {
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; count: number; x: number; y: number } | null>(null)

  // Monta grid 7×24
  // Regra: dia-da-semana SEMPRE vem de data_criacao (mesma base do filtro de período)
  //        hora vem de data_primeiro_contato/ultima_interacao_em quando disponível, senão 09h
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))
  let maxCount = 0
  leads.forEach((l) => {
    // created_at = timestamp imutável do insert → fonte correta para "quando chegou o lead"
    // fallback: data_criacao (DATE sem hora) → plota no dia certo, hora 09h
    const tsInsert = l.created_at
    if (!tsInsert && !l.data_criacao) return

    let day: number
    let hour: number

    if (tsInsert) {
      try {
        const ts = String(tsInsert)
        day  = getDayOfWeekSP(ts.substring(0, 10))
        hour = getHourSP(ts)
      } catch { return }
    } else {
      try {
        day  = getDayOfWeekSP(String(l.data_criacao).substring(0, 10))
        hour = 9
      } catch { return }
    }

    grid[day][hour]++
    if (grid[day][hour] > maxCount) maxCount = grid[day][hour]
  })

  // Detecta se há hora precisa (created_at preenchido)
  const temHoraPrecisa = leads.some((l) => !!l.created_at)

  // Melhor célula
  let bestDay = 0, bestHour = 0, bestCount = 0
  grid.forEach((row, d) => row.forEach((count, h) => {
    if (count > bestCount) { bestCount = count; bestDay = d; bestHour = h }
  }))

  // Melhor dia (soma de todos os horários por dia)
  const totaisPorDia = grid.map((row) => row.reduce((s, v) => s + v, 0))
  const melhorDiaIdx = totaisPorDia.indexOf(Math.max(...totaisPorDia))
  const totalNoMapa  = totaisPorDia.reduce((s, v) => s + v, 0)

  function cellColor(count: number) {
    if (maxCount === 0 || count === 0) return '#F5F7FA'
    const pct = count / maxCount
    // Interpola #E8F8F0 → #2FBF71 → #059669
    if (pct < 0.5) {
      const t = pct / 0.5
      const r = Math.round(232 + (47  - 232) * t)
      const g = Math.round(248 + (191 - 248) * t)
      const b = Math.round(240 + (113 - 240) * t)
      return `rgb(${r},${g},${b})`
    } else {
      const t = (pct - 0.5) / 0.5
      const r = Math.round(47  + (5   - 47)  * t)
      const g = Math.round(191 + (150 - 191) * t)
      const b = Math.round(113 + (105 - 113) * t)
      return `rgb(${r},${g},${b})`
    }
  }

  return (
    <div className="card p-5 relative">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="section-title mb-1">Mapa de Calor — Entrada de Leads</h3>
          <p className="text-xs text-text-muted">Dia da semana × hora do dia com mais leads chegando</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
            style={{ background: '#F5F7FA', color: '#6B7C93', border: '1px solid #E0E6ED' }}>
            {totalNoMapa}/{leads.length} leads plotados
          </span>
          {!temHoraPrecisa && leads.length > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{ background: '#FFF8E1', color: '#B45309', border: '1px solid #FDE68A' }}>
              Hora estimada 09h (sem timestamp preciso)
            </span>
          )}
          {bestCount > 0 && temHoraPrecisa && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#E8F8F0', color: '#059669', border: '1px solid #2FBF71' }}>
              Melhor horário: {DAYS_PT[bestDay]} às {String(bestHour).padStart(2, '0')}h ({bestCount} leads)
            </span>
          )}
          {bestCount > 0 && !temHoraPrecisa && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#E8F8F0', color: '#059669', border: '1px solid #2FBF71' }}>
              Melhor dia: {DAYS_PT[melhorDiaIdx]} ({totaisPorDia[melhorDiaIdx]} leads)
            </span>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '640px' }}>
          {/* Cabeçalho horas */}
          <div className="flex mb-1" style={{ paddingLeft: '36px', gap: '2px' }}>
            {HOURS.map((h) => (
              <div key={h} style={{ flex: 1, minWidth: '20px', textAlign: 'center' }}
                className="text-[9px] text-text-muted font-medium">
                {h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''}
              </div>
            ))}
          </div>

          {/* Linhas */}
          {DAYS_PT.map((day, d) => (
            <div key={day} className="flex items-center mb-0.5" style={{ gap: '2px' }}>
              <div className="text-[10px] font-semibold text-text-muted text-right flex-shrink-0"
                style={{ width: '32px', marginRight: '4px' }}>
                {day}
              </div>
              {HOURS.map((h) => {
                const count = grid[d][h]
                return (
                  <div
                    key={h}
                    style={{
                      flex: 1,
                      minWidth: '20px',
                      height: '22px',
                      borderRadius: '4px',
                      background: cellColor(count),
                      cursor: count > 0 ? 'pointer' : 'default',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setTooltip({ day: d, hour: h, count, x: rect.left + rect.width / 2, y: rect.top - 8 })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}

          {/* Legenda */}
          <div className="flex items-center gap-2 mt-3" style={{ paddingLeft: '36px' }}>
            <span className="text-[10px] text-text-muted">Menos</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => (
              <div key={pct} style={{ width: '18px', height: '12px', borderRadius: '3px', background: cellColor(pct * maxCount) }} />
            ))}
            <span className="text-[10px] text-text-muted">Mais</span>
          </div>
        </div>
      </div>

      {/* Tooltip flutuante */}
      {tooltip && tooltip.count > 0 && (
        <div className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: '#1F2D3D',
          }}>
          {DAYS_PT[tooltip.day]} às {String(tooltip.hour).padStart(2, '0')}h — {tooltip.count} lead{tooltip.count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { leads, users, alertas, resolveAlerta, currentUser } = useApp()
  const router = useRouter()
  const [period, setPeriod]       = useState<string>('tudo')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  // Roteamento por perfil — hooks devem estar antes dos early returns
  if (currentUser?.tipo === 'vendedor') return <VendedorDashboard />
  if (currentUser?.tipo === 'sdr')      return <SDRDashboard />

  const isAdmin = currentUser?.tipo === 'admin'

  // ── Filtro por período ────────────────────────────────────────────────────
  function getRange(): [string, string] | null {
    const now   = new Date()
    const today = now.toISOString().split('T')[0]
    if (period === 'hoje')   return [today, today]
    if (period === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 6)
      return [d.toISOString().split('T')[0], today]
    }
    if (period === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 29)
      return [d.toISOString().split('T')[0], today]
    }
    if (period === 'mes') {
      return [`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, today]
    }
    if (period === 'ano') {
      return [`${now.getFullYear()}-01-01`, today]
    }
    if (period === 'custom' && customFrom && customTo) {
      return [customFrom, customTo]
    }
    return null // tudo
  }

  const range = getRange()
  const filteredLeads = range
    ? leads.filter((l) => l.data_criacao >= range[0] && l.data_criacao <= range[1])
    : leads

  const m        = calcFunnelMetrics(filteredLeads)
  const gargalos = calcGargalos(filteredLeads)
  const metricas = calcMetricasPorCriativo(filteredLeads)
  const receitaSource = calcReceitaPorDimensao(filteredLeads, 'utm_source')

  const alertasAtivos = alertas.filter((a) => !a.resolvido)

  // Vendedores
  const vendedores = users.filter((u) => u.tipo === 'vendedor')
  const vendedorData = vendedores.map((v) => {
    const vLeads   = filteredLeads.filter((l) => l.vendedor_id === v.id)
    const fechados = vLeads.filter((l) => l.status_funil === 'fechado')
    const receita  = fechados.reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
    return {
      nome:      v.nome.split(' ')[0],
      Leads:     vLeads.length,
      Agendados: vLeads.filter((l) => ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado'].includes(l.status_funil)).length,
      Fechados:  fechados.length,
      receita,
    }
  })

  // ── Admin rankings ────────────────────────────────────────────────────────
  const AGENDOU_STAGES = ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado']

  const vendedorRanking = vendedores.map((v) => {
    const vLeads   = filteredLeads.filter((l) => l.vendedor_id === v.id)
    const fechados = vLeads.filter((l) => l.status_funil === 'fechado').length
    const receita  = vLeads.filter((l) => l.status_funil === 'fechado').reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
    const taxa     = vLeads.length > 0 ? (fechados / vLeads.length) * 100 : 0
    const ticketM  = fechados > 0 ? receita / fechados : 0
    return { id: v.id, nome: v.nome, leads: vLeads.length, fechados, receita, taxa, ticketMedio: ticketM }
  }).sort((a, b) => b.taxa - a.taxa)

  const sdrs = users.filter((u) => u.tipo === 'sdr')
  const sdrRanking = sdrs.map((s) => {
    const sLeads    = filteredLeads.filter((l) => l.sdr_id === s.id)
    const agendados = sLeads.filter((l) => AGENDOU_STAGES.includes(l.status_funil)).length
    const taxa      = sLeads.length > 0 ? (agendados / sLeads.length) * 100 : 0
    return { id: s.id, nome: s.nome, leads: sLeads.length, agendados, taxa }
  }).sort((a, b) => b.taxa - a.taxa)

  // Score medio
  const leadsAtivos = filteredLeads.filter((l) => !['fechado','declinado'].includes(l.status_funil))
  const scoreMedio  = leadsAtivos.length > 0
    ? Math.round(leadsAtivos.reduce((s, l) => s + (l.score_lead ?? 0), 0) / leadsAtivos.length)
    : 0

  // Funil area data
  const funnelArea = [
    { name: 'Leads',    v: m.total },
    { name: 'Contato',  v: m.respondeu },
    { name: 'Agendado', v: m.agendados },
    { name: 'Reuniao',  v: m.reunioes },
    { name: 'Fechado',  v: m.fechados },
  ]

  const top3 = metricas.slice(0, 3)
  const worst = metricas[metricas.length - 1]

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 min-h-screen" style={{ background: '#F5F7FA' }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-bright tracking-tight">Dashboard</h1>
            <p className="text-sm text-text-muted mt-0.5">Motor de decisao baseado em dados de marketing e vendas</p>
          </div>
          <div className="flex items-center gap-3">
            {alertasAtivos.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <BellRing size={14} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">{alertasAtivos.length} alertas</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xs text-text-muted font-medium">Dados em tempo real</span>
            </div>
          </div>
        </div>

        {/* ── Filtro de período ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
          style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest mr-1">Período:</span>
          {([
            { key: 'hoje', label: 'Hoje' },
            { key: '7d',   label: '7 dias' },
            { key: '30d',  label: '30 dias' },
            { key: 'mes',  label: 'Este mês' },
            { key: 'ano',  label: 'Este ano' },
            { key: 'tudo', label: 'Tudo' },
            { key: 'custom', label: 'Personalizado' },
          ] as { key: string; label: string }[]).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                background: period === p.key ? 'linear-gradient(135deg,#2FBF71,#1E8E5A)' : '#F5F7FA',
                color:      period === p.key ? '#FFFFFF' : '#6B7C93',
                border:     period === p.key ? '1px solid #2FBF71' : '1px solid #E0E6ED',
              }}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border outline-none"
                style={{ border: '1px solid #E0E6ED', background: '#F5F7FA', color: '#1F2D3D' }} />
              <span className="text-xs text-text-muted">até</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border outline-none"
                style={{ border: '1px solid #E0E6ED', background: '#F5F7FA', color: '#1F2D3D' }} />
            </div>
          )}
          {range && (
            <span className="ml-auto text-[11px] font-semibold px-2 py-1 rounded-lg"
              style={{ background: '#E8F8F0', color: '#059669', border: '1px solid #2FBF71' }}>
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} no período
            </span>
          )}
        </div>

        {/* ── Receita Banner ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Receita principal */}
          <div className="md:col-span-1 rounded-2xl p-6 relative overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', borderTop: '4px solid #3B82F6' }}>
            <div className="absolute right-4 top-4 opacity-5">
              <DollarSign size={80} className="text-[#3B82F6]" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                <DollarSign size={16} style={{ color: '#3B82F6' }} />
              </div>
              <p className="text-xs font-bold text-[#6B7C93] uppercase tracking-widest">Receita Confirmada</p>
            </div>
            <p className="text-3xl font-extrabold text-[#1F2D3D] tracking-tight">{formatCurrency(m.receitaTotal)}</p>
            <p className="text-sm text-[#6B7C93] mt-1">{m.fechados} contratos fechados</p>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #E0E6ED' }}>
              <div>
                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider font-semibold">Ticket Médio</p>
                <p className="text-base font-bold text-[#1F2D3D] mt-0.5">{formatCurrency(m.ticketMedio)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider font-semibold">Pipeline</p>
                <p className="text-base font-bold mt-0.5" style={{ color: '#3B82F6' }}>{formatCurrency(m.pipelineTotal)}</p>
              </div>
            </div>
          </div>

          {/* Score medio + Alertas resumo */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', borderTop: '4px solid #2FBF71' }}>
              <div className="absolute right-3 top-3 opacity-5"><Activity size={70} className="text-[#2FBF71]" /></div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E8F8F0' }}>
                  <Activity size={16} style={{ color: '#2FBF71' }} />
                </div>
                <p className="text-xs font-bold text-[#6B7C93] uppercase tracking-widest">Score Médio Pipeline</p>
              </div>
              <p className="text-3xl font-extrabold text-[#1F2D3D]">{scoreMedio}<span className="text-xl text-[#A0AEC0] font-normal">/100</span></p>
              <p className="text-sm text-[#6B7C93] mt-1">{leadsAtivos.length} leads ativos</p>
            </div>

            <div className="grid grid-rows-2 gap-3">
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.15)' }}>
                  <Target size={18} style={{ color: BLUE_L }} />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Taxa Fechamento</p>
                  <p className="text-xl font-bold text-text-bright">{m.taxa_fechamento.toFixed(1)}%</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.15)' }}>
                  <Users size={18} style={{ color: GREEN_L }} />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total Leads</p>
                  <p className="text-xl font-bold text-text-bright">{m.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs operacionais ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard label="Taxa de Resposta"      value={`${m.taxa_resposta.toFixed(0)}%`}      sub={`${m.respondeu} responderam`}  icon={MessageCircle} accent={BLUE_L} trend={5} />
          <KpiCard label="Taxa Agendamento"      value={`${m.taxa_agendamento.toFixed(0)}%`}    sub={`${m.agendados} agendados`}    icon={Calendar}      accent={SKY}    trend={-3} />
          <KpiCard label="Comparecimento"        value={`${m.taxa_comparecimento.toFixed(0)}%`} sub={`${m.reunioes} reunioes`}      icon={Video}         accent={BLUE}   trend={8} />
          <KpiCard label="Vendas Fechadas"       value={m.fechados}                             sub="contratos assinados"           icon={CheckCircle}   accent={GREEN}  trend={15} />
          <KpiCard label="Desqualificados"       value={m.declinados}                           sub={`${m.taxa_desqualificacao.toFixed(0)}% do total`} icon={XCircle} accent={RED} trend={-2} />
          <KpiCard label="Resposta < 10min"
            value={`${filteredLeads.filter((l) => (l.tempo_resposta_segundos ?? 9999) < 600).length}`}
            sub="leads com resposta rapida" icon={Zap} accent={AMBER} />
        </div>

        {/* ── Alertas ───────────────────────────────────────────────────────── */}
        {alertasAtivos.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #E0E6ED' }}>
              <h3 className="section-title flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                Alertas que precisam de acao
              </h3>
              <span className="badge text-red-400" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
                {alertasAtivos.length} ativos
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {alertasAtivos.slice(0, 6).map((alerta) => {
                const cfg = ALERTA_CFG[alerta.tipo]
                return (
                  <div key={alerta.id} className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.color}20` }}>
                      <cfg.icon size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>{cfg.label}</p>
                      <p className="text-xs text-text-primary leading-relaxed">{alerta.mensagem}</p>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => router.push(`/leads/${alerta.lead_id}`)}
                          className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                          style={{ color: cfg.color }}
                        >
                          Ver lead <ChevronRight size={11} />
                        </button>
                        <button
                          onClick={() => resolveAlerta(alerta.id)}
                          className="text-[11px] text-text-muted hover:text-emerald-400 transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Funil + Gargalos ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Area chart do funil */}
          <div className="card p-5 lg:col-span-3">
            <h3 className="section-title mb-1">Curva do Funil de Conversao</h3>
            <p className="text-xs text-text-muted mb-4">Queda de leads em cada etapa</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={funnelArea} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={BLUE} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6b8ab0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b8ab0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="v" name="Leads" stroke={BLUE_L} strokeWidth={2.5}
                  fill="url(#blueGrad)" dot={{ fill: BLUE_L, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gargalo */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="section-title mb-1">Maior Gargalo</h3>
            {gargalos.maiorGargalo ? (
              <>
                <p className="text-xs text-text-muted mb-4">Etapa com maior perda de leads</p>
                <div className="rounded-xl p-4 mb-4 text-center"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
                  <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Drop-off critico</p>
                  <p className="text-3xl font-extrabold text-red-400">
                    {gargalos.maiorGargalo.taxa_perda.toFixed(0)}%
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    {gargalos.maiorGargalo.de} → {gargalos.maiorGargalo.para}
                  </p>
                  <p className="text-xs text-red-400/70 mt-1">
                    {gargalos.maiorGargalo.perda} leads perdidos nesta etapa
                  </p>
                </div>
                <div className="space-y-2">
                  {gargalos.drops.slice(0, 4).map((drop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted truncate w-20 flex-shrink-0">{drop.de}</span>
                      <div className="flex-1 bg-elevated rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${100 - drop.taxa_perda}%`,
                            background: drop.taxa_perda >= 60 ? RED : drop.taxa_perda >= 30 ? AMBER : GREEN,
                          }} />
                      </div>
                      <span className="text-[10px] font-bold w-10 text-right"
                        style={{ color: drop.taxa_perda >= 60 ? RED : drop.taxa_perda >= 30 ? AMBER : GREEN }}>
                        -{drop.taxa_perda.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-text-muted text-sm">Sem dados suficientes.</p>
            )}
          </div>
        </div>

        {/* ── Criativos + Receita por fonte ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ranking criativos */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <Award size={17} className="text-amber-400" />
                  Criativos por Receita
                </h3>
                <p className="text-xs text-text-muted mt-0.5">Quais anuncios estao gerando dinheiro</p>
              </div>
            </div>

            <div className="space-y-3">
              {top3.map((item, idx) => {
                const medals = ['🥇', '🥈', '🥉']
                const maxR = top3[0].receita_total || 1
                const pct  = (item.receita_total / maxR) * 100
                const barColor = idx === 0 ? GREEN : idx === 1 ? BLUE_L : SKY
                return (
                  <div key={item.utm_content} className="rounded-xl p-4"
                    style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medals[idx]}</span>
                        <span className="text-sm font-semibold text-text-primary">
                          {CRIATIVO_LABELS[item.utm_content] || item.utm_content}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: GREEN_L }}>
                        {formatCurrency(item.receita_total)}
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5 mb-2" style={{ background: '#E0E6ED' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex gap-4 text-[11px] text-text-muted">
                      <span>{item.total_leads} leads</span>
                      <span>{item.vendas} vendas</span>
                      <span>{item.taxa_conversao.toFixed(0)}% conv.</span>
                      {item.ticket_medio > 0 && <span>TM: {formatCurrency(item.ticket_medio)}</span>}
                    </div>
                  </div>
                )
              })}

              {/* Pior */}
              {worst && worst.utm_content !== top3[0]?.utm_content && (
                <div className="rounded-xl p-3 flex items-start gap-3 mt-1"
                  style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-500">
                      Alerta: "{CRIATIVO_LABELS[worst.utm_content] || worst.utm_content}"
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {worst.total_leads} leads gerados — {formatCurrency(worst.receita_total)} receita — considere pausar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance vendedor */}
          <div className="card p-5">
            <h3 className="section-title mb-1">Performance por Vendedor</h3>
            <p className="text-xs text-text-muted mb-4">Leads, agendamentos e fechamentos</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendedorData} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6ED" vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: '#6b8ab0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b8ab0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Leads"     fill={BLUE}    radius={[4,4,0,0]} />
                <Bar dataKey="Agendados" fill={SKY}     radius={[4,4,0,0]} />
                <Bar dataKey="Fechados"  fill={GREEN}   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Receita por vendedor */}
            <div className="mt-4 space-y-2" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '1rem' }}>
              {vendedorData.map((v) => (
                <div key={v.nome} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">
                      {v.nome.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{v.nome}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: GREEN_L }}>{formatCurrency(v.receita)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Admin: Rankings exclusivos ────────────────────────────────────── */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Vendedores — taxa de conversão */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Award size={17} className="text-emerald-400" />
                <h3 className="section-title">Ranking de Conversao por Vendedor</h3>
              </div>
              <p className="text-xs text-text-muted mb-4">Taxa = leads fechados / total de leads</p>

              {vendedorRanking.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum vendedor cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {vendedorRanking.map((v, i) => {
                    const maxTaxa = vendedorRanking[0].taxa || 1
                    const medalColors = ['#f59e0b','#94a3b8','#cd7f32']
                    const rankColor   = i < 3 ? medalColors[i] : '#475569'
                    return (
                      <div key={v.id} className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
                            style={{ background: `${rankColor}22`, color: rankColor }}>
                            {i + 1}
                          </div>
                          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {v.nome.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-text-primary flex-1 truncate">{v.nome}</span>
                          <span className="text-base font-extrabold" style={{ color: v.taxa >= 20 ? GREEN_L : v.taxa >= 10 ? AMBER : RED }}>
                            {v.taxa.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full rounded-full h-1.5 mb-2" style={{ background: '#E0E6ED' }}>
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(v.taxa / maxTaxa) * 100}%`, background: v.taxa >= 20 ? GREEN : v.taxa >= 10 ? AMBER : RED }} />
                        </div>
                        <div className="flex gap-4 text-[11px] text-text-muted">
                          <span>{v.leads} leads</span>
                          <span>{v.fechados} fechados</span>
                          <span>{formatCurrency(v.receita)} receita</span>
                          {v.ticketMedio > 0 && <span>TM {formatCurrency(v.ticketMedio)}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SDRs — taxa de agendamento */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Star size={17} className="text-amber-400" />
                <h3 className="section-title">Ranking de Agendamento por SDR</h3>
              </div>
              <p className="text-xs text-text-muted mb-4">Taxa = leads agendados ou avancados / total de leads do SDR</p>

              {sdrRanking.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum SDR cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {sdrRanking.map((s, i) => {
                    const maxTaxa = sdrRanking[0].taxa || 1
                    const medalColors = ['#f59e0b','#94a3b8','#cd7f32']
                    const rankColor   = i < 3 ? medalColors[i] : '#475569'
                    return (
                      <div key={s.id} className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
                            style={{ background: `${rankColor}22`, color: rankColor }}>
                            {i + 1}
                          </div>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(217,119,6,0.15)' }}>
                            {s.nome.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-text-primary flex-1 truncate">{s.nome}</span>
                          <span className="text-base font-extrabold" style={{ color: s.taxa >= 30 ? GREEN_L : s.taxa >= 15 ? AMBER : RED }}>
                            {s.taxa.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full rounded-full h-1.5 mb-2" style={{ background: '#E0E6ED' }}>
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(s.taxa / maxTaxa) * 100}%`, background: s.taxa >= 30 ? GREEN : s.taxa >= 15 ? AMBER : RED }} />
                        </div>
                        <div className="flex gap-4 text-[11px] text-text-muted">
                          <span>{s.leads} leads atribuidos</span>
                          <span>{s.agendados} agendados</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Heatmap ──────────────────────────────────────────────────────── */}
        <LeadHeatmap leads={filteredLeads} />

        {/* ── Receita por fonte ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="section-title mb-1">Receita por Canal (utm_source)</h3>
          <p className="text-xs text-text-muted mb-5">Onde cada real de receita esta vindo</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {receitaSource.map((item, i) => {
              const pct = receitaSource[0]?.receita > 0 ? (item.receita / receitaSource[0].receita) * 100 : 0
              const color = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <div key={item.nome} className="rounded-xl p-4"
                  style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                  <p className="text-sm font-semibold text-text-primary capitalize mb-1">{item.nome}</p>
                  <p className="text-xl font-extrabold" style={{ color }}>{formatCurrency(item.receita)}</p>
                  <p className="text-[11px] text-text-muted mt-1">{item.vendas} vendas · {item.leads} leads</p>
                  <div className="mt-2 w-full rounded-full h-1" style={{ background: '#E0E6ED' }}>
                    <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
