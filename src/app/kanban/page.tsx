'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { FUNIL_LABELS, FUNIL_ORDER, TEMPERATURA_COLORS, TEMPERATURA_LABELS, type StatusFunil, type Lead, type Temperatura } from '@/types'
import { cn, formatCurrency, formatDuration, scoreBg } from '@/lib/utils'
import {
  Phone, Calendar, ChevronDown, Plus, Search, X, Tag, GripVertical,
  Clock, AlertTriangle, DollarSign, CheckCircle, Thermometer, Download, CalendarClock, ArrowRightLeft,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import AddLeadModal from '@/components/leads/AddLeadModal'
import TransferLeadModal from '@/components/leads/TransferLeadModal'

const TEMP_EMOJI: Record<string, string> = {
  frio: '🔵', morno: '🟡', quente: '🟠', muito_quente: '🔴', desqualificado: '⚫',
}

function ConfirmTempModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (temp: Temperatura) => void
  onCancel: () => void
}) {
  const [temp, setTemp] = useState<Temperatura | ''>('')
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <Thermometer size={18} className="text-orange-400" />
            Reunião Realizada — Defina a Temperatura
          </h2>
          <button onClick={onCancel} className="text-[#6B7C93] hover:text-[#374151]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#6B7C93]">
            Obrigatorio definir a temperatura antes de avançar para <strong className="text-[#1F2D3D]">Reunião Realizada</strong>.
          </p>
          <div className="space-y-2">
            {(['frio', 'morno', 'quente', 'muito_quente'] as Temperatura[]).map((t) => (
              <button
                key={t}
                onClick={() => setTemp(t)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all',
                  temp === t ? 'border-2' : 'bg-[#F5F7FA] border-[#E0E6ED] text-[#6B7C93] hover:border-[#D1D9E6] hover:text-[#374151]'
                )}
                style={temp === t ? {
                  borderColor: TEMPERATURA_COLORS[t],
                  backgroundColor: `${TEMPERATURA_COLORS[t]}20`,
                  color: TEMPERATURA_COLORS[t],
                } : {}}
              >
                <span>{TEMP_EMOJI[t]}</span>
                <span className="font-medium">{TEMPERATURA_LABELS[t]}</span>
                {temp === t && <CheckCircle size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button
              onClick={() => temp && onConfirm(temp as Temperatura)}
              disabled={!temp}
              className={cn(
                'flex-1 text-sm px-4 py-2 rounded-lg font-medium transition-colors',
                temp ? 'bg-violet-600 hover:bg-violet-700 text-[#1F2D3D]' : 'bg-[#E0E6ED] text-[#A0AEC0] cursor-not-allowed'
              )}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmValorFechadoModal({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead
  onConfirm: (valor: number) => void
  onCancel: () => void
}) {
  const [valor, setValor] = useState(lead.valor_contrato ? String(lead.valor_contrato) : '')
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-400" />
            Valor do Negócio Fechado
          </h2>
          <button onClick={onCancel} className="text-[#6B7C93] hover:text-[#374151]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#6B7C93]">
            Informe o valor real do contrato fechado com <strong className="text-[#1F2D3D]">{lead.nome}</strong>.
          </p>
          <div>
            <label className="text-xs font-semibold text-[#6B7C93] block mb-1.5">Valor Fechado (R$) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93] text-sm font-semibold">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input pl-9"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button
              onClick={() => { const n = parseFloat(valor); if (n > 0) onConfirm(n) }}
              disabled={!valor || parseFloat(valor) <= 0}
              className={cn(
                'flex-1 text-sm px-4 py-2 rounded-lg font-medium transition-colors',
                valor && parseFloat(valor) > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-[#1F2D3D]'
                  : 'bg-[#E0E6ED] text-[#A0AEC0] cursor-not-allowed'
              )}
            >
              Fechar Negócio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AgendarContatoModal({
  lead, onConfirm, onCancel,
}: {
  lead: Lead
  onConfirm: (date: string) => void
  onCancel: () => void
}) {
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(lead.proximo_contato || '')

  const quickOptions = [
    { label: 'Amanhã', days: 1 },
    { label: '3 dias', days: 3 },
    { label: '7 dias', days: 7 },
    { label: '15 dias', days: 15 },
  ]

  function addDays(d: number) {
    const dt = new Date()
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().split('T')[0]
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <CalendarClock size={18} className="text-orange-500" />
            Agendar Próximo Contato
          </h2>
          <button onClick={onCancel} className="text-[#6B7C93] hover:text-[#374151]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#6B7C93]">
            Quando retomar contato com <strong className="text-[#1F2D3D]">{lead.nome}</strong>?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {quickOptions.map(({ label, days }) => {
              const val = addDays(days)
              return (
                <button
                  key={days}
                  onClick={() => setDate(val)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-medium border transition-all',
                    date === val
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-500'
                      : 'bg-[#F5F7FA] border-[#E0E6ED] text-[#6B7C93] hover:border-orange-400/40 hover:text-orange-500'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6B7C93] block mb-1.5">Ou escolha a data</label>
            <input
              type="date"
              className="input"
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            {lead.proximo_contato && (
              <button
                onClick={() => onConfirm('')}
                className="px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20"
              >
                Remover
              </button>
            )}
            <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button
              onClick={() => date && onConfirm(date)}
              disabled={!date}
              className={cn(
                'flex-1 text-sm px-4 py-2 rounded-lg font-semibold transition-colors',
                date
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-[#E0E6ED] text-[#A0AEC0] cursor-not-allowed'
              )}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Cores únicas por vendedor (índice estável na lista de vendedores)
const VENDOR_PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0ea5e9', '#ec4899', '#14b8a6']

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold leading-none', scoreBg(score))}>
      {score}
    </div>
  )
}

function LeadCard({
  lead, users, alertaIds, showVendorTag, canTransfer, onClick, onMoveLeft, onMoveRight, onScheduleClick, onTransferClick,
}: {
  lead: Lead
  users: ReturnType<typeof useApp>['users']
  alertaIds: Set<string>
  showVendorTag: boolean
  canTransfer: boolean
  onClick: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onScheduleClick?: () => void
  onTransferClick?: () => void
}) {
  const vendedor = users.find((u) => u.id === lead.vendedor_id)
  const tempColor = TEMPERATURA_COLORS[lead.temperatura]
  const hasAlerta = alertaIds.has(lead.id)
  const score = lead.score_lead ?? 0
  const todayStr = new Date().toISOString().split('T')[0]
  const pc = lead.proximo_contato
  const pcIsToday = pc === todayStr
  const pcIsPast = !!(pc && pc < todayStr)
  const FOLLOWUP_STAGES: StatusFunil[] = ['primeiro_contato', 'followup1', 'followup2', 'followup3']
  const isFollowupStage = FOLLOWUP_STAGES.includes(lead.status_funil)

  // Cor estável por vendedor
  const vendedores = users.filter((u) => u.tipo === 'vendedor')
  const vendedorIdx = vendedores.findIndex((u) => u.id === lead.vendedor_id)
  const vendorColor = VENDOR_PALETTE[Math.max(0, vendedorIdx) % VENDOR_PALETTE.length]

  return (
    <div
      className={cn(
        'card p-3 cursor-pointer hover:border-indigo-500/40 hover:bg-[#EEF1F5] transition-all group fade-in',
        hasAlerta && 'border-amber-500/30',
        pcIsToday && 'ring-2 ring-orange-400/60',
        pcIsPast && 'ring-2 ring-red-500/40',
      )}
      onClick={onClick}
      style={{ borderLeftColor: tempColor, borderLeftWidth: 3 }}
    >
      {/* Tag de vendedor — visível para SDR e admin */}
      {showVendorTag && vendedor && (
        <div className="flex items-center gap-1 mb-2">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: `${vendorColor}20`, color: vendorColor, border: `1px solid ${vendorColor}40` }}
          >
            {vendedor.nome.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Topo: nome + score + alerta */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {hasAlerta && <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />}
            <p className="text-sm font-semibold text-[#1F2D3D] truncate">{lead.nome}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px]">{TEMP_EMOJI[lead.temperatura]}</span>
            <span className="text-[11px] text-[#6B7C93]">{lead.temperatura.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ScoreBadge score={score} />
          <GripVertical size={13} className="text-slate-700 group-hover:text-[#6B7C93] transition-colors" />
        </div>
      </div>

      {/* Infos */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-[#6B7C93]">
          <Phone size={10} />
          {lead.telefone}
        </div>
        {lead.utm_content && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7C93]">
            <Tag size={10} />
            <span className="truncate">{lead.utm_content.replace(/_/g, ' ')}</span>
          </div>
        )}
        {lead.valor_estimado ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <DollarSign size={10} />
            {lead.valor_estimado}
          </div>
        ) : null}
        {lead.data_reuniao && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
            <Calendar size={10} />
            {lead.data_reuniao.split('-').reverse().join('/')} {lead.hora_reuniao || ''}
          </div>
        )}
        {lead.tempo_resposta_segundos !== undefined && (
          <div className={cn(
            'flex items-center gap-1.5 text-[11px]',
            lead.tempo_resposta_segundos < 600 ? 'text-emerald-400' : 'text-[#A0AEC0]'
          )}>
            <Clock size={10} />
            <span>1° resp: {formatDuration(lead.tempo_resposta_segundos)}</span>
          </div>
        )}
        {pc && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-semibold mt-0.5',
            pcIsToday ? 'text-orange-500' : pcIsPast ? 'text-red-400' : 'text-[#6B7C93]'
          )}>
            <CalendarClock size={9} />
            {pcIsToday ? 'Contatar Hoje' : pcIsPast ? `Atrasado: ${pc.split('-').reverse().join('/')}` : pc.split('-').reverse().join('/')}
          </div>
        )}
      </div>

      {/* Rodapé: avatar + quick actions */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ background: `${vendorColor}25`, color: vendorColor }}
          >
            {vendedor?.nome.charAt(0)}
          </div>
          <span className="text-[10px] text-[#A0AEC0]">{vendedor?.nome.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-1">
          {canTransfer && onTransferClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onTransferClick() }}
              className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 bg-[#D1D9E6] hover:bg-indigo-500/20 flex items-center justify-center text-[#6B7C93] hover:text-indigo-500 transition-colors"
              title="Transferir lead"
            >
              <ArrowRightLeft size={10} />
            </button>
          )}
          {isFollowupStage && onScheduleClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onScheduleClick() }}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center transition-colors',
                pc
                  ? 'bg-orange-400/20 text-orange-500'
                  : 'opacity-0 group-hover:opacity-100 bg-[#D1D9E6] text-[#6B7C93] hover:bg-orange-400/20 hover:text-orange-500'
              )}
              title="Agendar próximo contato"
            >
              <CalendarClock size={11} />
            </button>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onMoveLeft && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveLeft() }}
                className="w-5 h-5 rounded bg-[#D1D9E6] hover:bg-indigo-600/30 flex items-center justify-center text-[#6B7C93] hover:text-indigo-400 transition-colors"
              >
                <ChevronDown size={11} className="rotate-90" />
              </button>
            )}
            {onMoveRight && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveRight() }}
                className="w-5 h-5 rounded bg-[#D1D9E6] hover:bg-emerald-600/30 flex items-center justify-center text-[#6B7C93] hover:text-emerald-400 transition-colors"
              >
                <ChevronDown size={11} className="-rotate-90" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const COL_COLORS: Partial<Record<StatusFunil, string>> = {
  fechado: 'text-emerald-400',
  contrato_assinado: 'text-emerald-300',
  contrato_enviado: 'text-sky-400',
  agendado: 'text-amber-400',
  reuniao_realizada: 'text-violet-400',
  declinado: 'text-red-400',
}

export default function KanbanPage() {
  const { leads, moveLead, updateLead, transferLead, users, currentUser, alertas } = useApp()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [filterUTM, setFilterUTM] = useState('')
  const [dragLeadId, setDragLeadId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<StatusFunil | null>(null)
  const [pendingReuniaoLead, setPendingReuniaoLead] = useState<Lead | null>(null)
  const [pendingFechadoLead, setPendingFechadoLead] = useState<Lead | null>(null)
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null)
  const [filterDataDe, setFilterDataDe] = useState('')
  const [filterDataAte, setFilterDataAte] = useState('')
  const [transferingLead, setTransferingLead] = useState<Lead | null>(null)

  // IDs de leads com alertas ativos
  const alertaLeadIds = new Set(
    alertas.filter((a) => !a.resolvido).map((a) => a.lead_id)
  )

  const sdrVendedores = currentUser?.tipo === 'sdr' && currentUser.vendedorVinculado
    ? currentUser.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const visibleLeads = leads.filter((l) => {
    if (currentUser?.tipo === 'vendedor') return l.vendedor_id === currentUser.id
    if (currentUser?.tipo === 'sdr') return l.sdr_id === currentUser.id || sdrVendedores.includes(l.vendedor_id)
    return true
  })

  const filteredLeads = visibleLeads.filter((l) => {
    const matchSearch = !search ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.telefone.includes(search)
    const matchVendedor = !filterVendedor || l.vendedor_id === filterVendedor
    const matchUTM = !filterUTM || l.utm_content === filterUTM
    const leadDate = l.data_criacao ?? l.created_at?.split('T')[0] ?? ''
    const matchDataDe = !filterDataDe || leadDate >= filterDataDe
    const matchDataAte = !filterDataAte || leadDate <= filterDataAte
    return matchSearch && matchVendedor && matchUTM && matchDataDe && matchDataAte
  })

  const isVendedor = currentUser?.tipo === 'vendedor'
  const isSdr      = currentUser?.tipo === 'sdr'
  const isAdmin    = currentUser?.tipo === 'admin'
  const canTransfer = isAdmin || (isSdr && currentUser?.pode_transferir === true)

  function exportToExcel() {
    const FUNIL_PT: Record<string, string> = {
      trafego_pago: 'Trafego Pago', primeiro_contato: '1o Contato',
      followup1: 'Follow-up 1', followup2: 'Follow-up 2', followup3: 'Follow-up 3',
      agendado: 'Agendado', reuniao_realizada: 'Reuniao Realizada',
      contrato_enviado: 'Contrato Enviado', contrato_assinado: 'Contrato Assinado',
      fechado: 'Fechado', declinado: 'Declinado',
    }
    const TEMP_PT: Record<string, string> = {
      frio: 'Frio', morno: 'Morno', quente: 'Quente', muito_quente: 'Muito Quente', desqualificado: 'Desqualificado',
    }
    const headers = [
      'ID', 'Nome', 'Telefone', 'Email', 'Status', 'Temperatura', 'Data Criacao',
      'Vendedor', 'SDR', 'Valor Estimado', 'Valor Contrato', 'Valor Fechado',
      'Reuniao Data', 'Reuniao Hora', 'Score',
      'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Anuncio',
      'Observacao',
    ]
    const rows = leads.map((l) => {
      const vendedor = users.find((u) => u.id === l.vendedor_id)
      const sdr = users.find((u) => u.id === l.sdr_id)
      return [
        l.id, l.nome, l.telefone, l.email,
        FUNIL_PT[l.status_funil] || l.status_funil,
        TEMP_PT[l.temperatura] || l.temperatura,
        l.data_criacao,
        vendedor?.nome || '',
        sdr?.nome || '',
        l.valor_estimado || '',
        l.valor_contrato ?? '',
        l.valor_fechado ?? '',
        l.data_reuniao || '',
        l.hora_reuniao || '',
        l.score_lead ?? '',
        l.utm_source || '', l.utm_medium || '', l.utm_campaign || '',
        l.utm_content || '', l.utm_anuncio || '',
        l.observacao || '',
      ]
    })
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const headerRow = headers.map((h) => `<th style="background:#1E8E5A;color:#fff;font-weight:bold">${esc(h)}</th>`).join('')
    const dataRows = rows.map((r) =>
      `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`
    ).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Leads</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table></body></html>`
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Tag de vendedor aparece para SDR (vê múltiplos vendedores) e admin
  const showVendorTag = isSdr || isAdmin

  // SDR vê apenas vendedores cujos leads ele tem acesso
  const vendedores = users.filter((u) => u.tipo === 'vendedor')
  const vendedoresFiltro = isSdr
    ? vendedores.filter((v) => visibleLeads.some((l) => l.vendedor_id === v.id))
    : isAdmin
    ? vendedores
    : []  // vendedor não usa esse filtro

  const utmContents = [...new Set(visibleLeads.map((l) => l.utm_content).filter(Boolean))]

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDragLeadId(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Etapas bloqueadas para SDR
  const SDR_BLOCKED: StatusFunil[] = ['reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado']

  function sdrCanMove(newStatus: StatusFunil) {
    if (!isSdr) return true
    return !SDR_BLOCKED.includes(newStatus)
  }

  function tryMove(lead: Lead, newStatus: StatusFunil) {
    if (lead.status_funil === 'fechado') return
    if (!sdrCanMove(newStatus)) return
    if (newStatus === 'reuniao_realizada') {
      setPendingReuniaoLead(lead)
    } else if (newStatus === 'fechado') {
      setPendingFechadoLead(lead)
    } else {
      moveLead(lead.id, newStatus)
    }
  }

  function handleDrop(e: React.DragEvent, status: StatusFunil) {
    e.preventDefault()
    if (dragLeadId) {
      const lead = leads.find((l) => l.id === dragLeadId)
      if (lead) tryMove(lead, status)
    }
    setDragLeadId(null)
    setDragOverCol(null)
  }

  function handleMoveLeft(lead: Lead) {
    const idx = FUNIL_ORDER.indexOf(lead.status_funil)
    if (idx > 0) tryMove(lead, FUNIL_ORDER[idx - 1])
  }

  function handleMoveRight(lead: Lead) {
    const idx = FUNIL_ORDER.indexOf(lead.status_funil)
    const next = FUNIL_ORDER[idx + 1]
    if (idx < FUNIL_ORDER.length - 1 && next !== 'declinado' && sdrCanMove(next)) {
      tryMove(lead, next)
    }
  }

  // Valor total estimado no pipeline por coluna
  function colPipeline(status: StatusFunil) {
    return filteredLeads
      .filter((l) => l.status_funil === status)
      .reduce((s, l) => s + (l.valor_contrato ?? 0), 0)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E0E6ED] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-[#1F2D3D]">Funil de Leads</h1>
              <p className="text-sm text-[#6B7C93] mt-0.5">{filteredLeads.length} leads · Pipeline: {formatCurrency(filteredLeads.reduce((s, l) => s + (l.valor_contrato ?? 0), 0))}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-400/8 transition-colors border border-emerald-400/20"
                  title="Exportar todos os leads para Excel"
                >
                  <Download size={14} />
                  Exportar Excel
                </button>
              )}
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
                <Plus size={16} />
                Novo Lead
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93]" />
              <input
                className="input pl-8 !w-56 text-xs"
                placeholder="Buscar lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7C93]" onClick={() => setSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtro por vendedor — só para SDR e admin */}
            {!isVendedor && vendedoresFiltro.length > 1 && (
              <select className="input !w-44 text-xs" value={filterVendedor} onChange={(e) => setFilterVendedor(e.target.value)}>
                <option value="">Todos Vendedores</option>
                {vendedoresFiltro.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            )}

            <select className="input !w-44 text-xs" value={filterUTM} onChange={(e) => setFilterUTM(e.target.value)}>
              <option value="">Todos Criativos</option>
              {utmContents.map((u) => <option key={u} value={u}>{u?.replace(/_/g, ' ')}</option>)}
            </select>
            {/* Filtro por data de inserção */}
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#6B7C93] flex-shrink-0" />
              <input
                type="date"
                className="input !w-36 text-xs"
                title="Data de inserção — de"
                value={filterDataDe}
                onChange={(e) => setFilterDataDe(e.target.value)}
              />
              <span className="text-[11px] text-[#6B7C93]">até</span>
              <input
                type="date"
                className="input !w-36 text-xs"
                title="Data de inserção — até"
                value={filterDataAte}
                onChange={(e) => setFilterDataAte(e.target.value)}
              />
            </div>

            {(filterVendedor || filterUTM || filterDataDe || filterDataAte) && (
              <button className="text-xs text-[#6B7C93] hover:text-[#1F2D3D] flex items-center gap-1"
                onClick={() => { setFilterVendedor(''); setFilterUTM(''); setFilterDataDe(''); setFilterDataAte('') }}>
                <X size={12} /> Limpar
              </button>
            )}

            {/* Indicador de painel do vendedor */}
            {isVendedor && currentUser && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: `${VENDOR_PALETTE[0]}15`, color: VENDOR_PALETTE[0], border: `1px solid ${VENDOR_PALETTE[0]}30` }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: `${VENDOR_PALETTE[0]}30` }}>
                  {currentUser.nome.charAt(0)}
                </div>
                Meu CRM — {currentUser.nome.split(' ')[0]}
              </div>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full px-4 py-4" style={{ minWidth: 'max-content' }}>
            {FUNIL_ORDER.map((status, colIdx) => {
              const colLeads = filteredLeads.filter((l) => l.status_funil === status)
              const label = FUNIL_LABELS[status]
              const isDragOver = dragOverCol === status
              const colorClass = COL_COLORS[status] || 'text-[#6B7C93]'
              const pipeline = colPipeline(status)
              const colAlertCount = colLeads.filter((l) => alertaLeadIds.has(l.id)).length
              const isBlocked = isSdr && SDR_BLOCKED.includes(status)

              return (
                <div
                  key={status}
                  className="flex flex-col w-64 flex-shrink-0"
                  onDragOver={(e) => { if (!isBlocked) { e.preventDefault(); setDragOverCol(status) } }}
                  onDrop={(e) => { if (!isBlocked) handleDrop(e, status) }}
                  onDragLeave={() => setDragOverCol(null)}
                  style={{ opacity: isBlocked ? 0.6 : 1 }}
                >
                  {/* Column header */}
                  <div className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-t-lg border border-b-0 transition-colors',
                    isDragOver ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-[#EEF1F5] border-[#E0E6ED]'
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold', colorClass)}>{label}</span>
                      {isBlocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                          bloqueado
                        </span>
                      )}
                      {colAlertCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                          {colAlertCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pipeline > 0 && (
                        <span className="text-[10px] text-emerald-500/70 font-medium">
                          {formatCurrency(pipeline)}
                        </span>
                      )}
                      <span className={cn(
                        'text-[11px] font-bold px-2 py-0.5 rounded-full',
                        colLeads.length > 0 ? 'bg-[#E0E6ED] text-[#374151]' : 'bg-[#EEF1F5] text-[#A0AEC0]'
                      )}>
                        {colLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className={cn(
                    'flex-1 overflow-y-auto kanban-col rounded-b-lg border p-2 space-y-2 transition-colors min-h-32',
                    isDragOver ? 'bg-indigo-600/10 border-indigo-500/50 border-dashed' : 'bg-[#EEF1F5] border-[#E0E6ED]'
                  )}>
                    {colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable={lead.status_funil !== 'fechado'}
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={() => { setDragLeadId(null); setDragOverCol(null) }}
                        className={cn(dragLeadId === lead.id && 'opacity-50')}
                      >
                        <LeadCard
                          lead={lead}
                          users={users}
                          alertaIds={alertaLeadIds}
                          showVendorTag={showVendorTag}
                          canTransfer={canTransfer}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          onMoveLeft={colIdx > 0 && lead.status_funil !== 'fechado' ? () => handleMoveLeft(lead) : undefined}
                          onMoveRight={colIdx < FUNIL_ORDER.length - 2 && lead.status_funil !== 'fechado' ? () => handleMoveRight(lead) : undefined}
                          onScheduleClick={() => setSchedulingLead(lead)}
                          onTransferClick={canTransfer ? () => setTransferingLead(lead) : undefined}
                        />
                      </div>
                    ))}
                    {colLeads.length === 0 && !isDragOver && (
                      <div className="flex flex-col items-center justify-center py-6">
                        <p className="text-xs text-slate-700">Nenhum lead</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {schedulingLead && (
        <AgendarContatoModal
          lead={schedulingLead}
          onConfirm={(date) => {
            updateLead(schedulingLead.id, { proximo_contato: date || undefined })
            setSchedulingLead(null)
          }}
          onCancel={() => setSchedulingLead(null)}
        />
      )}
      {showModal && <AddLeadModal onClose={() => setShowModal(false)} />}
      {transferingLead && (
        <TransferLeadModal
          lead={transferingLead}
          vendedores={users}
          onConfirm={async (newVendedorId) => {
            await transferLead(transferingLead.id, newVendedorId)
            setTransferingLead(null)
          }}
          onClose={() => setTransferingLead(null)}
        />
      )}
      {pendingReuniaoLead && (
        <ConfirmTempModal
          onConfirm={(temp) => {
            moveLead(pendingReuniaoLead.id, 'reuniao_realizada', { temperatura: temp })
            setPendingReuniaoLead(null)
          }}
          onCancel={() => setPendingReuniaoLead(null)}
        />
      )}
      {pendingFechadoLead && (
        <ConfirmValorFechadoModal
          lead={pendingFechadoLead}
          onConfirm={(valor) => {
            moveLead(pendingFechadoLead.id, 'fechado', { valor_fechado: valor })
            setPendingFechadoLead(null)
          }}
          onCancel={() => setPendingFechadoLead(null)}
        />
      )}
    </AppShell>
  )
}
