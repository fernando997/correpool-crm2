'use client'

import { useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import GoogleCalendarConnect from '@/components/GoogleCalendarConnect'

function GoogleCalendarConnectCompact() {
  return (
    <Suspense>
      <GoogleCalendarConnect compact />
    </Suspense>
  )
}
import {
  FUNIL_LABELS, FUNIL_ORDER, TEMPERATURA_LABELS, TEMPERATURA_COLORS,
  MOTIVO_PERDA_LABELS, MOTIVOS_DESQUALIFICANTES,
  type StatusFunil, type Temperatura, type Lead, type MotivoPerdaType,
} from '@/types'
import {
  cn, formatDate, formatCurrency, formatDuration, scoreBg, scoreColor,
} from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, Clock, ChevronRight, Send, Thermometer, Video,
  DollarSign, CheckCircle, XCircle, Edit3, Save, X, User, Calendar,
  AlertTriangle, Bell, Zap, TrendingUp, Trash2, CalendarClock, Pencil,
} from 'lucide-react'

const TEMP_EMOJI: Record<string, string> = {
  frio: '🔵', morno: '🟡', quente: '🟠', muito_quente: '🔴', desqualificado: '⚫',
}

// Status badge styles — light theme proper colors
const STATUS_STYLES: Partial<Record<StatusFunil, { bg: string; color: string; border: string }>> = {
  trafego_pago:       { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  primeiro_contato:   { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' },
  followup1:          { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  followup2:          { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  followup3:          { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  agendado:           { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  reuniao_realizada:  { bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE' },
  contrato_enviado:   { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' },
  contrato_assinado:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  fechado:            { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
  declinado:          { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
}

const ALERTA_CONFIG = {
  lead_parado:       { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Lead Parado' },
  followup_atrasado: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', label: 'Follow-up Atrasado' },
  reuniao_proxima:   { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', label: 'Reunião Próxima' },
}

// ── Modal de temperatura ──────────────────────────────────────────────────────
function TemperaturaReuniaoModal({ onConfirm, onCancel }: {
  onConfirm: (temp: Temperatura) => void
  onCancel: () => void
}) {
  const [temp, setTemp] = useState<Temperatura | ''>('')
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <Thermometer size={18} className="text-orange-500" />
            Reunião Realizada — Defina a Temperatura
          </h2>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] text-[#6B7C93] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#6B7C93]">
            Obrigatório definir a temperatura antes de avançar para <strong className="text-[#1F2D3D]">Reunião Realizada</strong>.
          </p>
          <div className="space-y-2">
            {(['frio', 'morno', 'quente', 'muito_quente'] as Temperatura[]).map((t) => (
              <button key={t} onClick={() => setTemp(t)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all"
                style={temp === t ? {
                  borderColor: TEMPERATURA_COLORS[t],
                  background: `${TEMPERATURA_COLORS[t]}12`,
                  color: TEMPERATURA_COLORS[t],
                } : { borderColor: '#E0E6ED', background: '#F5F7FA', color: '#6B7C93' }}>
                <span className="text-base">{TEMP_EMOJI[t]}</span>
                <span className="font-semibold">{TEMPERATURA_LABELS[t]}</span>
                {temp === t && <CheckCircle size={15} className="ml-auto" style={{ color: TEMPERATURA_COLORS[t] }} />}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={() => temp && onConfirm(temp as Temperatura)} disabled={!temp}
              className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors text-white"
              style={{ background: temp ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#E0E6ED', color: temp ? '#fff' : '#A0AEC0', cursor: temp ? 'pointer' : 'not-allowed' }}>
              Confirmar Reunião
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal de declínio ─────────────────────────────────────────────────────────
function DeclineModal({ onConfirm, onCancel }: {
  onConfirm: (motivo: MotivoPerdaType) => void
  onCancel: () => void
}) {
  const [motivo, setMotivo] = useState<MotivoPerdaType | ''>('')
  const isDesq = motivo !== '' && MOTIVOS_DESQUALIFICANTES.has(motivo as MotivoPerdaType)

  const recuperaveis = (Object.entries(MOTIVO_PERDA_LABELS) as [MotivoPerdaType, string][])
    .filter(([key]) => !MOTIVOS_DESQUALIFICANTES.has(key))
  const desqualificantes = (Object.entries(MOTIVO_PERDA_LABELS) as [MotivoPerdaType, string][])
    .filter(([key]) => MOTIVOS_DESQUALIFICANTES.has(key))

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            Declinar Lead
          </h2>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] text-[#6B7C93] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#6B7C93]">
            Selecione o motivo da perda. Esta informação é <strong className="text-[#1F2D3D]">obrigatória</strong> para análise do funil.
          </p>

          {/* Motivos recuperáveis */}
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#B45309' }}>
              <Phone size={11} /> Pode tentar contato novamente
            </p>
            <div className="space-y-1.5">
              {recuperaveis.map(([key, label]) => (
                <button key={key} onClick={() => setMotivo(key)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm text-left transition-all font-medium"
                  style={motivo === key
                    ? { borderColor: '#F59E0B', background: '#FFFBEB', color: '#92400E' }
                    : { borderColor: '#E0E6ED', background: '#F5F7FA', color: '#6B7C93' }}>
                  {motivo === key && <CheckCircle size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: '#E0E6ED' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Desqualificação permanente</span>
            <div className="flex-1 h-px" style={{ background: '#E0E6ED' }} />
          </div>

          {/* Motivos desqualificantes */}
          <div>
            <div className="space-y-1.5">
              {desqualificantes.map(([key, label]) => (
                <button key={key} onClick={() => setMotivo(key)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm text-left transition-all font-medium"
                  style={motivo === key
                    ? { borderColor: '#EF4444', background: '#FEF2F2', color: '#B91C1C' }
                    : { borderColor: '#E0E6ED', background: '#F5F7FA', color: '#6B7C93' }}>
                  {motivo === key && <CheckCircle size={13} style={{ color: '#EF4444', flexShrink: 0 }} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Aviso contextual */}
          {motivo !== '' && (
            <div className="rounded-lg px-3 py-2.5 text-xs font-medium flex items-start gap-2"
              style={isDesq
                ? { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }
                : { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {isDesq
                ? 'Este lead será permanentemente desqualificado e não poderá ser reativado.'
                : 'Este lead pode ser tentado contato novamente no futuro.'}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={() => motivo && onConfirm(motivo as MotivoPerdaType)} disabled={!motivo}
              className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors"
              style={{ background: motivo ? '#DC2626' : '#E0E6ED', color: motivo ? '#fff' : '#A0AEC0', cursor: motivo ? 'pointer' : 'not-allowed' }}>
              Confirmar Declínio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Score Breakdown ───────────────────────────────────────────────────────────
function ScoreBreakdown({ lead }: { lead: Lead }) {
  const score = lead.score_lead ?? 0
  const color = score >= 70 ? '#15803D' : score >= 40 ? '#B45309' : '#B91C1C'
  const bgColor = score >= 70 ? '#F0FDF4' : score >= 40 ? '#FFFBEB' : '#FEF2F2'
  const borderColor = score >= 70 ? '#86EFAC' : score >= 40 ? '#FDE68A' : '#FECACA'

  const items = [
    { label: 'Agendou ou avançou no funil', pontos: 30,
      ativo: ['agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado'].includes(lead.status_funil) },
    { label: 'Reunião agendada', pontos: 30, ativo: lead.reuniao_agendada },
    { label: `Temperatura: ${TEMPERATURA_LABELS[lead.temperatura]}`, pontos: { frio: 5, morno: 10, quente: 20, muito_quente: 30, desqualificado: 0 }[lead.temperatura], ativo: lead.temperatura !== 'desqualificado' },
    { label: 'Criativo de alta performance', pontos: 10,
      ativo: ['video_depoimento_cliente','carrossel_beneficios','video_resultado_antes_depois'].includes(lead.utm_content ?? '') },
    { label: 'Tempo de resposta < 10min', pontos: 10, ativo: (lead.tempo_resposta_segundos ?? Infinity) < 600 },
  ]

  return (
    <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1F2D3D] flex items-center gap-2">
          <Zap size={15} style={{ color: '#7C3AED' }} />
          Score do Lead
        </h3>
        <div className="text-base font-extrabold px-3 py-1 rounded-lg" style={{ background: bgColor, color, border: `1px solid ${borderColor}` }}>
          {score}/100
        </div>
      </div>
      <div className="w-full rounded-full h-2 mb-4" style={{ background: '#E0E6ED' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: item.ativo ? '#F0FDF4' : '#F5F7FA' }}>
                {item.ativo
                  ? <CheckCircle size={11} style={{ color: '#16A34A' }} />
                  : <XCircle size={11} style={{ color: '#A0AEC0' }} />}
              </div>
              <span className="text-xs" style={{ color: item.ativo ? '#374151' : '#A0AEC0' }}>{item.label}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: item.ativo ? '#16A34A' : '#D1D9E6' }}>
              {item.ativo ? `+${item.pontos}` : '+0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { leads } = useApp()
  const lead = leads.find((l) => l.id === params.id)

  if (!lead) {
    return (
      <AppShell>
        <div className="p-6 text-center pt-20">
          <p className="text-[#6B7C93] font-medium">Lead não encontrado.</p>
          <button className="btn-primary mt-4 mx-auto block" onClick={() => router.back()}>Voltar</button>
        </div>
      </AppShell>
    )
  }
  return <LeadDetailContent lead={lead} />
}

function LeadDetailContent({ lead }: { lead: Lead }) {
  const router = useRouter()
  const { users, anotacoes, historico, alertas, resolveAlerta, updateLead, moveLead, addAnotacao, deleteAnotacao, updateAnotacao, deleteLead, currentUser } = useApp()

  const [novaAnotacao, setNovaAnotacao]         = useState('')
  const [editingAnotacaoId, setEditingAnotacaoId] = useState<string | null>(null)
  const [editingAnotacaoText, setEditingAnotacaoText] = useState('')
  const [editing, setEditing]               = useState(false)
  const [editForm, setEditForm]             = useState<Lead>(lead)
  const [showSchedule, setShowSchedule]     = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [scheduleForm, setScheduleForm]     = useState({ data: '', hora: '', link: '' })
  const [showDeclineModal, setShowDeclineModal]   = useState(false)
  const [showTempModal, setShowTempModal]         = useState(false)
  const [showFechadoModal, setShowFechadoModal]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [valorFechadoInput, setValorFechadoInput] = useState('')

  const canEdit = currentUser?.tipo === 'vendedor' || currentUser?.tipo === 'admin'

  const vendedor     = users.find((u) => u.id === lead.vendedor_id)
  const sdr          = users.find((u) => u.id === lead.sdr_id)
  const leadAnotacoes = anotacoes.filter((a) => a.lead_id === lead.id)
  const leadHistorico = historico.filter((h) => h.lead_id === lead.id).sort((a, b) => b.data.localeCompare(a.data))
  const leadAlertas   = alertas.filter((a) => a.lead_id === lead.id)
  const currentStepIdx = FUNIL_ORDER.indexOf(lead.status_funil)

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return
    addAnotacao({ lead_id: lead.id, usuario_id: currentUser?.id || 'u1', texto: novaAnotacao })
    setNovaAnotacao('')
  }

  const handleSaveEdit = () => { updateLead(lead.id, editForm); setEditing(false) }

  const handleSchedule = async () => {
    if (!scheduleForm.data) return
    updateLead(lead.id, {
      reuniao_agendada: true,
      data_reuniao: scheduleForm.data,
      hora_reuniao: scheduleForm.hora,
      link_meet: scheduleForm.link || undefined,
    })
    if (!isRescheduling) {
      moveLead(lead.id, 'agendado')
    }

    // Google Calendar integration
    if (currentUser?.google_refresh_token) {
      try {
        const res = await fetch('/api/google/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            lead_id: lead.id,
            lead_nome: lead.nome,
            lead_email: lead.email,
            data_reuniao: scheduleForm.data,
            hora_reuniao: scheduleForm.hora || '09:00',
          }),
        })
        const { meetLink } = await res.json()
        if (meetLink) {
          updateLead(lead.id, { link_meet: meetLink })
        }
      } catch {
        // falha silenciosa — reunião já salva no CRM
      }
    }

    setShowSchedule(false)
    setIsRescheduling(false)
    setScheduleForm({ data: '', hora: '', link: '' })
  }

  const startReschedule = () => {
    setScheduleForm({
      data: lead.data_reuniao || '',
      hora: lead.hora_reuniao || '',
      link: lead.link_meet || '',
    })
    setIsRescheduling(true)
    setShowSchedule(true)
  }

  const handleFechado = () => {
    const n = parseFloat(valorFechadoInput)
    if (!n || n <= 0) return
    moveLead(lead.id, 'fechado', { valor_fechado: n })
    setShowFechadoModal(false)
    setValorFechadoInput('')
  }

  const statusStyle = STATUS_STYLES[lead.status_funil] ?? { bg: '#F5F7FA', color: '#6B7C93', border: '#E0E6ED' }

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-5" style={{ background: '#F5F7FA', minHeight: '100vh' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', color: '#6B7C93' }}>
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#1F2D3D] truncate">{lead.nome}</h1>
            <p className="text-xs text-[#A0AEC0]">ID: {lead.id} — Criado em {formatDate(lead.data_criacao)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lead.score_lead !== undefined && (
              <div className="px-2.5 py-1 rounded-lg text-sm font-bold"
                style={{
                  background: lead.score_lead >= 70 ? '#F0FDF4' : lead.score_lead >= 40 ? '#FFFBEB' : '#FEF2F2',
                  color:      lead.score_lead >= 70 ? '#15803D'  : lead.score_lead >= 40 ? '#B45309'  : '#B91C1C',
                  border:     `1px solid ${lead.score_lead >= 70 ? '#86EFAC' : lead.score_lead >= 40 ? '#FDE68A' : '#FECACA'}`,
                }}>
                Score {lead.score_lead}/100
              </div>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border"
              style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}>
              {FUNIL_LABELS[lead.status_funil]}
            </span>
            <span className="text-base">{TEMP_EMOJI[lead.temperatura]}</span>
            {currentUser?.tipo === 'admin' && (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: '#EF4444', border: '1px solid #FECACA', background: '#FEF2F2' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2' }}>
                <Trash2 size={13} /> Excluir
              </button>
            )}
          </div>
        </div>

        {/* ── Alertas do lead ──────────────────────────────────────────────── */}
        {leadAlertas.filter(a => !a.resolvido).length > 0 && (
          <div className="space-y-2">
            {leadAlertas.filter(a => !a.resolvido).map((alerta) => {
              const cfg = ALERTA_CONFIG[alerta.tipo]
              return (
                <div key={alerta.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <AlertTriangle size={15} style={{ color: cfg.color, flexShrink: 0 }} />
                  <p className="text-sm flex-1 font-medium" style={{ color: cfg.color }}>{alerta.mensagem}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span>
                  <button onClick={() => resolveAlerta(alerta.id)}
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#16A34A' }}>
                    Resolver
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Funil progress ───────────────────────────────────────────────── */}
        <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-3">Etapa no Funil</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {FUNIL_ORDER.filter((s) => s !== 'declinado').map((status, idx) => {
              const isActive = status === lead.status_funil
              const isPast   = idx < currentStepIdx && lead.status_funil !== 'declinado'
              return (
                <div key={status} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => moveLead(lead.id, status)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={isActive
                      ? { background: 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(47,191,113,0.3)' }
                      : isPast
                        ? { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }
                        : { background: '#F5F7FA', color: '#6B7C93', border: '1px solid #E0E6ED' }}>
                    {FUNIL_LABELS[status]}
                  </button>
                  {idx < FUNIL_ORDER.length - 2 && (
                    <ChevronRight size={13} className="mx-0.5 flex-shrink-0"
                      style={{ color: isPast ? '#86EFAC' : '#D1D9E6' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Coluna esquerda ─────────────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-2">

            {/* Informações */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#E8F8F0' }}>
                    <User size={14} style={{ color: '#2FBF71' }} />
                  </div>
                  <h3 className="text-sm font-bold text-[#1F2D3D]">Informações do Lead</h3>
                </div>
                {!editing ? (
                  <button onClick={() => { setEditing(true); setEditForm(lead) }}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                    <Edit3 size={13} /> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                      <X size={13} /> Cancelar
                    </button>
                    <button onClick={handleSaveEdit} className="btn-success py-1.5 px-3 text-xs flex items-center gap-1.5">
                      <Save size={13} /> Salvar
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5" style={{ background: '#FFFFFF' }}>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Nome" value={editing ? editForm.nome : lead.nome} editing={editing}
                  onChange={(v) => setEditForm((f) => ({ ...f, nome: v }))} />
                <InfoField label="Telefone" value={editing ? editForm.telefone : lead.telefone}
                  icon={<Phone size={13} />} editing={editing}
                  onChange={(v) => setEditForm((f) => ({ ...f, telefone: v }))} />
                <InfoField label="Email" value={editing ? editForm.email : lead.email}
                  icon={<Mail size={13} />} editing={editing}
                  onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} />
                <div>
                  <label className="label block mb-1">Valor Estimado</label>
                  {editing ? (
                    <input type="text" className="input text-sm"
                      value={editForm.valor_estimado || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, valor_estimado: e.target.value }))}
                      placeholder="Ex: R$ 5.000 a R$ 20.000" />
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: '#B45309' }}>
                      {lead.valor_estimado ?? 'Não definido'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label block mb-1">Valor Fechado</label>
                  {editing ? (
                    <input type="number" className="input text-sm"
                      value={editForm.valor_fechado || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, valor_fechado: Number(e.target.value) }))}
                      placeholder="R$ 0" />
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: '#16A34A' }}>
                      {lead.valor_fechado ? formatCurrency(lead.valor_fechado) :
                        lead.valor_contrato ? formatCurrency(lead.valor_contrato) : 'Não fechado'}
                    </p>
                  )}
                </div>
                {lead.tempo_resposta_segundos !== undefined && (
                  <div>
                    <label className="label block mb-1">Tempo de Resposta</label>
                    <p className="text-sm font-semibold" style={{
                      color: lead.tempo_resposta_segundos < 600 ? '#16A34A' :
                             lead.tempo_resposta_segundos < 3600 ? '#B45309' : '#B91C1C',
                    }}>
                      {formatDuration(lead.tempo_resposta_segundos)}
                      {lead.tempo_resposta_segundos < 600 && <span className="text-xs ml-1 opacity-70"> Rápido!</span>}
                    </p>
                  </div>
                )}
                {lead.motivo_perda && (
                  <div>
                    <label className="label block mb-1">Motivo de Perda</label>
                    <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>{MOTIVO_PERDA_LABELS[lead.motivo_perda]}</p>
                  </div>
                )}
              </div>
              {editing ? (
                <div className="mt-4">
                  <label className="label block mb-1">Observação</label>
                  <textarea className="input resize-none min-h-[80px]"
                    value={editForm.observacao || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, observacao: e.target.value }))} />
                </div>
              ) : lead.observacao ? (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E0E6ED' }}>
                  <p className="label mb-1.5">Observação</p>
                  <p className="text-sm text-[#374151]">{lead.observacao}</p>
                </div>
              ) : null}
              </div>{/* fim p-5 informações */}
            </div>

            {/* UTM */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  <TrendingUp size={14} style={{ color: '#3B82F6' }} />
                </div>
                <h3 className="text-sm font-bold text-[#1F2D3D]">Origem (UTM)</h3>
              </div>
              <div className="p-5" style={{ background: '#FFFFFF' }}>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['utm_source', 'Fonte'],
                  ['utm_medium', 'Mídia'],
                  ['utm_campaign', 'Campanha'],
                  ['utm_content', 'Criativo'],
                  ['utm_anuncio', 'Anúncio'],
                  ['utm_posicionamento', 'Posição'],
                ] as [keyof Lead, string][]).map(([key, label]) => {
                  const val = lead[key]
                  return (
                    <div key={key} className="rounded-lg px-3 py-2.5" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#A0AEC0] mb-0.5">{label}</p>
                      <p className="text-xs font-semibold" style={{ color: val ? '#1F2D3D' : '#A0AEC0' }}>
                        {val ? String(val) : '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
              </div>{/* fim p-5 utm */}
            </div>

            {/* Anotações */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FFFBEB' }}>
                  <Bell size={14} style={{ color: '#B45309' }} />
                </div>
                <h3 className="text-sm font-bold text-[#1F2D3D]">Anotações</h3>
              </div>
              <div className="p-5" style={{ background: '#FFFFFF' }}>
              <div className="space-y-3 mb-4">
                {leadAnotacoes.length === 0 && (
                  <p className="text-sm text-[#A0AEC0] text-center py-6">Nenhuma anotação ainda.</p>
                )}
                {leadAnotacoes.map((a) => {
                  const autor = users.find((u) => u.id === a.usuario_id)
                  const tipo  = autor?.tipo
                  const avatarStyle = tipo === 'sdr'
                    ? { background: '#FFFBEB', color: '#B45309' }
                    : tipo === 'vendedor'
                    ? { background: '#F0FDF4', color: '#15803D' }
                    : { background: '#EFF6FF', color: '#1D4ED8' }
                  const badgeStyle = avatarStyle
                  const badgeLabel = tipo === 'sdr' ? 'SDR' : tipo === 'vendedor' ? 'Vendedor' : 'Admin'
                  const isOwner = a.usuario_id === currentUser?.id || currentUser?.tipo === 'admin'
                  const isEditing = editingAnotacaoId === a.id
                  return (
                    <div key={a.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={avatarStyle}>
                        {autor?.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 rounded-xl px-4 py-3" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#1F2D3D]">{autor?.nome}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={badgeStyle}>{badgeLabel}</span>
                          <span className="text-[10px] text-[#A0AEC0]">
                            {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwner && !isEditing && (
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                onClick={() => { setEditingAnotacaoId(a.id); setEditingAnotacaoText(a.texto) }}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[#E0E6ED]"
                                title="Editar anotação">
                                <Pencil size={11} style={{ color: '#6B7C93' }} />
                              </button>
                              <button
                                onClick={() => deleteAnotacao(a.id)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-50"
                                title="Excluir anotação">
                                <Trash2 size={11} style={{ color: '#EF4444' }} />
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              className="input resize-none min-h-[72px] text-sm w-full"
                              value={editingAnotacaoText}
                              onChange={(e) => setEditingAnotacaoText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingAnotacaoId(null)}
                                className="btn-secondary text-xs px-3 py-1.5">
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  if (editingAnotacaoText.trim()) {
                                    updateAnotacao(a.id, editingAnotacaoText.trim())
                                  }
                                  setEditingAnotacaoId(null)
                                }}
                                className="btn-success text-xs px-3 py-1.5 flex items-center gap-1">
                                <Save size={12} /> Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#374151]">{a.texto}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input className="input text-sm flex-1" placeholder="Adicionar anotação..."
                  value={novaAnotacao} onChange={(e) => setNovaAnotacao(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAnotacao()} />
                <button onClick={handleAddAnotacao} className="btn-success px-4">
                  <Send size={15} />
                </button>
              </div>
              </div>{/* fim p-5 anotações */}
            </div>

            {/* Histórico */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FAF5FF' }}>
                  <Clock size={14} style={{ color: '#7C3AED' }} />
                </div>
                <h3 className="text-sm font-bold text-[#1F2D3D]">Histórico de Movimentações</h3>
              </div>
              <div className="p-5" style={{ background: '#FFFFFF' }}>
              <div className="space-y-3">
                {leadHistorico.length === 0 && (
                  <p className="text-sm text-[#A0AEC0]">Nenhuma movimentação registrada.</p>
                )}
                {leadHistorico.map((h) => {
                  const autor = users.find((u) => u.id === h.usuario_id)
                  const deStyle   = h.de_status ? (STATUS_STYLES[h.de_status] ?? null) : null
                  const paraStyle = STATUS_STYLES[h.para_status] ?? { bg: '#F5F7FA', color: '#1F2D3D', border: '#E0E6ED' }
                  return (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#2FBF71' }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap text-sm">
                          {h.de_status ? (
                            <>
                              <span className="font-medium px-2 py-0.5 rounded text-xs"
                                style={deStyle ? { background: deStyle.bg, color: deStyle.color } : { color: '#6B7C93' }}>
                                {FUNIL_LABELS[h.de_status]}
                              </span>
                              <ChevronRight size={12} style={{ color: '#D1D9E6', flexShrink: 0 }} />
                              <span className="font-semibold px-2 py-0.5 rounded text-xs"
                                style={{ background: paraStyle.bg ?? '#F5F7FA', color: paraStyle.color }}>
                                {FUNIL_LABELS[h.para_status]}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-[#1F2D3D] text-xs">Lead criado em {FUNIL_LABELS[h.para_status]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A0AEC0]">
                          <Clock size={10} />
                          {new Date(h.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {autor && <span>por <span className="font-medium text-[#6B7C93]">{autor.nome}</span></span>}
                        </div>
                        {h.observacao && <p className="text-xs text-[#6B7C93] mt-0.5">{h.observacao}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
              </div>{/* fim p-5 histórico */}
            </div>
          </div>

          {/* ── Coluna direita ───────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Score */}
            <ScoreBreakdown lead={lead} />

            {/* Equipe */}
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: '#2FBF71' }} />
                <h3 className="text-sm font-bold text-[#1F2D3D]">Equipe Responsável</h3>
              </div>
              <div className="space-y-2.5">
                {vendedor && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: '#F0FDF4', color: '#15803D' }}>
                      {vendedor.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F2D3D]">{vendedor.nome}</p>
                      <p className="text-[10px] text-[#A0AEC0] font-medium uppercase tracking-wide">Vendedor</p>
                    </div>
                  </div>
                )}
                {sdr && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: '#FFFBEB', color: '#B45309' }}>
                      {sdr.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F2D3D]">{sdr.nome}</p>
                      <p className="text-[10px] text-[#A0AEC0] font-medium uppercase tracking-wide">SDR</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Próximo Follow-up */}
            {(() => {
              const pc = lead.proximo_contato
              if (!pc) return null
              const todayStr = new Date().toISOString().split('T')[0]
              const isPast  = pc < todayStr
              const isToday = pc === todayStr
              const color   = isPast ? '#B91C1C' : isToday ? '#C2410C' : '#0369A1'
              const bg      = isPast ? '#FEF2F2' : isToday ? '#FFF7ED' : '#EFF6FF'
              const border  = isPast ? '#FECACA' : isToday ? '#FED7AA' : '#BFDBFE'
              const [y, m, d] = pc.split('-')
              const formatted = `${d}/${m}/${y}`
              return (
                <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarClock size={14} style={{ color }} />
                    <h3 className="text-sm font-bold" style={{ color }}>Próximo Follow-up</h3>
                    {isPast && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FECACA', color: '#B91C1C' }}>ATRASADO</span>}
                    {isToday && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FED7AA', color: '#C2410C' }}>HOJE</span>}
                  </div>
                  <p className="text-xl font-extrabold" style={{ color }}>{formatted}</p>
                  <button
                    onClick={() => updateLead(lead.id, { proximo_contato: undefined })}
                    className="text-[10px] mt-2 font-medium transition-colors"
                    style={{ color: '#A0AEC0' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#B91C1C' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#A0AEC0' }}>
                    Remover agendamento
                  </button>
                </div>
              )
            })()}

            {/* Temperatura */}
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: '#F97316' }} />
                <h3 className="text-sm font-bold text-[#1F2D3D] flex items-center gap-1.5">
                  <Thermometer size={14} className="text-orange-500" /> Temperatura
                </h3>
              </div>
              {!canEdit ? (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm"
                    style={{ borderColor: TEMPERATURA_COLORS[lead.temperatura], background: `${TEMPERATURA_COLORS[lead.temperatura]}10`, color: TEMPERATURA_COLORS[lead.temperatura] }}>
                    <span>{TEMP_EMOJI[lead.temperatura]}</span>
                    <span className="font-semibold">{TEMPERATURA_LABELS[lead.temperatura]}</span>
                    <CheckCircle size={14} className="ml-auto" />
                  </div>
                  <p className="text-[10px] text-[#A0AEC0] text-center mt-2">Apenas vendedores e admins podem alterar</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(['frio','morno','quente','muito_quente','desqualificado'] as Temperatura[]).map((temp) => (
                    <button key={temp} onClick={() => updateLead(lead.id, { temperatura: temp })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all border-2 font-medium"
                      style={lead.temperatura === temp
                        ? { borderColor: TEMPERATURA_COLORS[temp], background: `${TEMPERATURA_COLORS[temp]}10`, color: TEMPERATURA_COLORS[temp] }
                        : { borderColor: '#E0E6ED', background: '#F5F7FA', color: '#6B7C93' }}>
                      <span>{TEMP_EMOJI[temp]}</span>
                      <span>{TEMPERATURA_LABELS[temp]}</span>
                      {lead.temperatura === temp && <CheckCircle size={13} className="ml-auto" style={{ color: TEMPERATURA_COLORS[temp] }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reunião */}
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: '#F59E0B' }} />
                <h3 className="text-sm font-bold text-[#1F2D3D] flex items-center gap-1.5">
                  <Calendar size={14} style={{ color: '#B45309' }} /> Reunião
                </h3>
              </div>
              {lead.reuniao_agendada && !showSchedule ? (
                <div className="rounded-xl p-4 space-y-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <p className="font-bold text-sm" style={{ color: '#B45309' }}>Reunião Agendada</p>
                  <p className="text-sm text-[#374151]">
                    {formatDate(lead.data_reuniao || '')} {lead.hora_reuniao && `às ${lead.hora_reuniao}`}
                  </p>
                  {lead.link_meet && (
                    <a href={lead.link_meet} target="_blank" rel="noreferrer"
                      className="text-xs flex items-center gap-1 break-all"
                      style={{ color: '#7C3AED' }}>
                      <Video size={11} /> Meet Link
                    </a>
                  )}
                  <button onClick={() => setShowTempModal(true)}
                    className="w-full py-2 rounded-lg text-xs font-semibold text-white mt-1 transition-colors"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                    Reunião Realizada
                  </button>
                  <button onClick={startReschedule}
                    className="w-full py-2 rounded-lg text-xs font-semibold transition-colors border flex items-center justify-center gap-1.5"
                    style={{ background: '#F0F9FF', color: '#0284C7', borderColor: '#BAE6FD' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#E0F2FE'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#F0F9FF'}>
                    <CalendarClock size={13} /> Reagendar Reunião
                  </button>
                </div>
              ) : !showSchedule ? (
                <button onClick={() => setShowSchedule(true)} className="btn-secondary w-full text-sm">
                  Agendar Reunião
                </button>
              ) : (
                <div className="space-y-3">
                  {isRescheduling && (
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#0284C7' }}>
                      <CalendarClock size={12} /> Reagendando reunião
                    </p>
                  )}
                  <div>
                    <label className="label block mb-1">Data</label>
                    <input type="date" className="input text-sm" value={scheduleForm.data}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, data: e.target.value })} />
                  </div>
                  <div>
                    <label className="label block mb-1">Horário</label>
                    <input type="time" className="input text-sm" value={scheduleForm.hora}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, hora: e.target.value })} />
                  </div>
                  <div>
                    <label className="label block mb-1">Link Meet</label>
                    <input className="input text-sm" placeholder="https://meet.google.com/..."
                      value={scheduleForm.link}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, link: e.target.value })} />
                  </div>
                  <GoogleCalendarConnectCompact />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowSchedule(false); setIsRescheduling(false); setScheduleForm({ data: '', hora: '', link: '' }) }}
                      className="btn-secondary flex-1 text-xs">Cancelar</button>
                    <button onClick={handleSchedule} className="btn-success flex-1 text-xs">
                      {isRescheduling ? 'Confirmar Reagendamento' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Venda */}
            <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: '#16A34A' }} />
                <h3 className="text-sm font-bold text-[#1F2D3D] flex items-center gap-1.5">
                  <DollarSign size={14} style={{ color: '#16A34A' }} /> Ações de Venda
                </h3>
              </div>
              <div className="space-y-2">
                {canEdit && (
                  <>
                    <button onClick={() => moveLead(lead.id, 'contrato_enviado')}
                      className="w-full text-xs py-2 rounded-lg font-semibold transition-colors border"
                      style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#DBEAFE'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#EFF6FF'}>
                      Enviar Contrato
                    </button>
                    <button onClick={() => moveLead(lead.id, 'contrato_assinado')}
                      className="w-full text-xs py-2 rounded-lg font-semibold transition-colors border"
                      style={{ background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#DCFCE7'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#F0FDF4'}>
                      Contrato Assinado ✓
                    </button>
                    <button
                      onClick={() => { setValorFechadoInput(lead.valor_contrato ? String(lead.valor_contrato) : ''); setShowFechadoModal(true) }}
                      className="w-full text-xs py-2.5 rounded-lg font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)', boxShadow: '0 2px 8px rgba(47,191,113,0.3)' }}>
                      Marcar como Fechado
                    </button>
                  </>
                )}
                {lead.status_funil !== 'declinado' && (
                  <button onClick={() => setShowDeclineModal(true)}
                    className="w-full text-xs py-2 rounded-lg font-semibold transition-colors border flex items-center justify-center gap-1.5"
                    style={{ background: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}>
                    <XCircle size={13} /> Declinar Lead
                  </button>
                )}
                {lead.status_funil === 'declinado' && lead.motivo_perda && !MOTIVOS_DESQUALIFICANTES.has(lead.motivo_perda) && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Confirmar tentativa de contato com ${lead.nome}? O lead voltará para Primeiro Contato.`)) {
                        moveLead(lead.id, 'primeiro_contato', { temperatura: 'frio' })
                      }
                    }}
                    className="w-full text-xs py-2 rounded-lg font-semibold transition-colors border flex items-center justify-center gap-1.5"
                    style={{ background: '#F0F9FF', color: '#0284C7', borderColor: '#BAE6FD' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#E0F2FE'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#F0F9FF'}>
                    <Phone size={13} /> Tentar contato novamente
                  </button>
                )}
                {!canEdit && (
                  <p className="text-[10px] text-[#A0AEC0] text-center pt-1">
                    Ações de venda disponíveis apenas para vendedores
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
              <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
                <Trash2 size={17} className="text-red-500" /> Excluir Lead
              </h2>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] text-[#6B7C93]">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#374151]">
                Tem certeza que deseja excluir <strong className="text-[#1F2D3D]">{lead.nome}</strong>?
              </p>
              <p className="text-xs text-[#6B7C93]">
                Esta ação é irreversível. O lead, todas as anotações e histórico serão removidos permanentemente.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={async () => { await deleteLead(lead.id); router.replace('/kanban') }}
                  className="flex-1 py-2 rounded-lg font-semibold text-sm text-white transition-colors"
                  style={{ background: '#DC2626' }}>
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTempModal && <TemperaturaReuniaoModal onConfirm={(temp) => { moveLead(lead.id, 'reuniao_realizada', { temperatura: temp }); setShowTempModal(false) }} onCancel={() => setShowTempModal(false)} />}
      {showDeclineModal && <DeclineModal onConfirm={(motivo) => {
        const temp: Temperatura = MOTIVOS_DESQUALIFICANTES.has(motivo) ? 'desqualificado' : lead.temperatura
        moveLead(lead.id, 'declinado', { temperatura: temp, motivo_perda: motivo })
        setShowDeclineModal(false)
      }} onCancel={() => setShowDeclineModal(false)} />}
      {showFechadoModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E6ED' }}>
              <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
                <DollarSign size={18} style={{ color: '#16A34A' }} /> Valor do Negócio Fechado
              </h2>
              <button onClick={() => setShowFechadoModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] text-[#6B7C93]">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#6B7C93]">
                Informe o valor real do contrato fechado com <strong className="text-[#1F2D3D]">{lead.nome}</strong>.
              </p>
              <div>
                <label className="text-xs font-semibold text-[#6B7C93] block mb-1.5">Valor Fechado (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93] text-sm font-semibold">R$</span>
                  <input type="number" min="0" step="0.01" className="input pl-9" placeholder="0,00"
                    value={valorFechadoInput} onChange={(e) => setValorFechadoInput(e.target.value)}
                    autoFocus onKeyDown={(e) => e.key === 'Enter' && handleFechado()} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowFechadoModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleFechado} disabled={!valorFechadoInput || parseFloat(valorFechadoInput) <= 0}
                  className="flex-1 py-2 rounded-lg font-semibold text-sm text-white transition-all"
                  style={{
                    background: valorFechadoInput && parseFloat(valorFechadoInput) > 0
                      ? 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)'
                      : '#E0E6ED',
                    color: valorFechadoInput && parseFloat(valorFechadoInput) > 0 ? '#fff' : '#A0AEC0',
                    cursor: valorFechadoInput && parseFloat(valorFechadoInput) > 0 ? 'pointer' : 'not-allowed',
                  }}>
                  Fechar Negócio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function InfoField({ label, value, icon, editing, onChange }: {
  label: string; value: string; icon?: React.ReactNode; editing: boolean; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label block mb-1">{label}</label>
      {editing ? (
        <input className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-[#374151]">
          {icon && <span style={{ color: '#A0AEC0' }}>{icon}</span>}
          {value || <span className="text-[#A0AEC0]">—</span>}
        </div>
      )}
    </div>
  )
}
