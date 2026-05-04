'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { cn, formatDate } from '@/lib/utils'
import {
  Calendar, Clock, Video, User, ChevronLeft, ChevronRight,
  Phone, Filter, ExternalLink, CalendarClock, AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TEMPERATURA_COLORS, FUNIL_LABELS, type StatusFunil } from '@/types'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

const FOLLOWUP_STAGES: StatusFunil[] = ['primeiro_contato', 'followup1', 'followup2', 'followup3']

export default function AgendaPage() {
  const { leads, users, currentUser } = useApp()
  const router = useRouter()

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [activeTab, setActiveTab] = useState<'reunioes' | 'followups'>('followups')
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [filterVendedor, setFilterVendedor] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const sdrVendedores = currentUser?.tipo === 'sdr' && currentUser.vendedorVinculado
    ? currentUser.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  function visibleFilter(l: typeof leads[0]) {
    if (currentUser?.tipo === 'vendedor') return l.vendedor_id === currentUser.id
    if (currentUser?.tipo === 'sdr') return l.sdr_id === currentUser.id || sdrVendedores.includes(l.vendedor_id)
    if (filterVendedor) return l.vendedor_id === filterVendedor
    return true
  }

  // ── Reuniões ──────────────────────────────────────────────────
  const filteredReunioes = leads.filter((l) => l.reuniao_agendada && l.data_reuniao && visibleFilter(l))
  const vendedores = users.filter((u) => u.tipo === 'vendedor')

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const reunioesByDay: Record<number, typeof filteredReunioes> = {}
  filteredReunioes.forEach((l) => {
    if (!l.data_reuniao) return
    const [y, m, d] = l.data_reuniao.split('-').map(Number)
    if (m - 1 === viewMonth && y === viewYear) {
      if (!reunioesByDay[d]) reunioesByDay[d] = []
      reunioesByDay[d].push(l)
    }
  })

  const upcoming = [...filteredReunioes]
    .filter((l) => l.data_reuniao)
    .sort((a, b) => (a.data_reuniao! + (a.hora_reuniao || '')).localeCompare(b.data_reuniao! + (b.hora_reuniao || '')))

  const selectedDayReunioes = selectedDay ? (reunioesByDay[selectedDay] || []) : []

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  // ── Follow-ups ────────────────────────────────────────────────
  const followupLeads = leads
    .filter((l) => l.proximo_contato && FOLLOWUP_STAGES.includes(l.status_funil) && visibleFilter(l))
    .sort((a, b) => a.proximo_contato!.localeCompare(b.proximo_contato!))

  const fuAtrasados  = followupLeads.filter((l) => l.proximo_contato! < todayStr)
  const fuHoje       = followupLeads.filter((l) => l.proximo_contato === todayStr)
  const fuProximos   = followupLeads.filter((l) => l.proximo_contato! > todayStr)

  const STATUS_BADGE: Record<string, string> = {
    agendado: 'bg-amber-600/20 text-amber-400',
    reuniao_realizada: 'bg-violet-600/20 text-violet-400',
    contrato_enviado: 'bg-sky-600/20 text-sky-400',
    contrato_assinado: 'bg-teal-600/20 text-teal-400',
    fechado: 'bg-emerald-600/20 text-emerald-400',
  }

  function FollowupCard({ lead, highlight }: { lead: typeof leads[0]; highlight?: 'today' | 'late' }) {
    const vendedor = users.find((u) => u.id === lead.vendedor_id)
    return (
      <div
        className={cn(
          'p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm',
          highlight === 'today'
            ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
            : highlight === 'late'
            ? 'bg-red-50 border-red-200 hover:border-red-300'
            : 'bg-[#F5F7FA] border-[#E0E6ED] hover:bg-[#EEF1F5]'
        )}
        onClick={() => router.push(`/leads/${lead.id}`)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-semibold truncate',
              highlight === 'today' ? 'text-orange-700' : highlight === 'late' ? 'text-red-600' : 'text-[#1F2D3D]'
            )}>
              {lead.nome}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[#E0E6ED] text-[#6B7C93]">
              {FUNIL_LABELS[lead.status_funil]}
            </span>
          </div>
          <div className={cn(
            'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0',
            highlight === 'today'
              ? 'bg-orange-100 text-orange-600'
              : highlight === 'late'
              ? 'bg-red-100 text-red-500'
              : 'bg-[#E0E6ED] text-[#6B7C93]'
          )}>
            <CalendarClock size={10} />
            {highlight === 'today' ? 'Hoje' : lead.proximo_contato!.split('-').reverse().join('/')}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B7C93]">
          <span className="flex items-center gap-1"><Phone size={10} />{lead.telefone}</span>
          {vendedor && <span className="flex items-center gap-1"><User size={10} />{vendedor.nome.split(' ')[0]}</span>}
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1F2D3D]">Agenda</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">
              {activeTab === 'reunioes'
                ? `${filteredReunioes.length} reunioes agendadas`
                : `${fuHoje.length} follow-ups para hoje · ${fuAtrasados.length} atrasados`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.tipo === 'admin' && (
              <select
                className="input !w-44 text-sm"
                value={filterVendedor}
                onChange={(e) => setFilterVendedor(e.target.value)}
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#E0E6ED' }}>
          <button
            onClick={() => setActiveTab('followups')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              activeTab === 'followups'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-[#6B7C93] hover:text-[#1F2D3D]'
            )}
          >
            <CalendarClock size={15} />
            Follow-ups
            {fuHoje.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {fuHoje.length}
              </span>
            )}
            {fuAtrasados.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {fuAtrasados.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reunioes')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              activeTab === 'reunioes'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-[#6B7C93] hover:text-[#1F2D3D]'
            )}
          >
            <Calendar size={15} />
            Reunioes
          </button>
        </div>

        {/* ── Follow-ups tab ───────────────────────────────── */}
        {activeTab === 'followups' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Atrasados */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={15} className="text-red-400" />
                <h3 className="text-sm font-semibold text-red-500">Atrasados ({fuAtrasados.length})</h3>
              </div>
              {fuAtrasados.length === 0 && (
                <p className="text-xs text-[#A0AEC0] text-center py-4">Nenhum follow-up atrasado.</p>
              )}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {fuAtrasados.map((l) => <FollowupCard key={l.id} lead={l} highlight="late" />)}
              </div>
            </div>

            {/* Hoje */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock size={15} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-orange-600">Contatar Hoje ({fuHoje.length})</h3>
              </div>
              {fuHoje.length === 0 && (
                <p className="text-xs text-[#A0AEC0] text-center py-4">Nenhum follow-up para hoje.</p>
              )}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {fuHoje.map((l) => <FollowupCard key={l.id} lead={l} highlight="today" />)}
              </div>
            </div>

            {/* Próximos */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={15} className="text-[#6B7C93]" />
                <h3 className="text-sm font-semibold text-[#374151]">Proximos ({fuProximos.length})</h3>
              </div>
              {fuProximos.length === 0 && (
                <p className="text-xs text-[#A0AEC0] text-center py-4">Nenhum follow-up agendado.</p>
              )}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {fuProximos.map((l) => <FollowupCard key={l.id} lead={l} />)}
              </div>
            </div>
          </div>
        )}

        {/* ── Reunioes tab ─────────────────────────────────── */}
        {activeTab === 'reunioes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Calendar */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-[#E0E6ED] hover:bg-[#D1D9E6] flex items-center justify-center text-[#6B7C93] hover:text-[#1F2D3D] transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <h3 className="font-semibold text-[#1F2D3D]">
                  {MONTHS[viewMonth]} {viewYear}
                </h3>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-[#E0E6ED] hover:bg-[#D1D9E6] flex items-center justify-center text-[#6B7C93] hover:text-[#1F2D3D] transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-[#A0AEC0] py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayReunioes = reunioesByDay[day] || []
                  const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
                  const isSelected = day === selectedDay
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      className={cn(
                        'aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-sm',
                        isSelected ? 'bg-indigo-600 text-white' :
                          isToday ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-500/30' :
                            dayReunioes.length > 0 ? 'bg-[#E0E6ED] text-[#1F2D3D] hover:bg-[#D1D9E6]' :
                              'text-[#6B7C93] hover:bg-[#EEF1F5]'
                      )}
                    >
                      <span className={cn('font-medium', isToday && !isSelected && 'font-bold')}>{day}</span>
                      {dayReunioes.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayReunioes.slice(0, 3).map((_, i) => (
                            <div key={i} className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-amber-400')} />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedDay && selectedDayReunioes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
                  <p className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">
                    {selectedDay} de {MONTHS[viewMonth]}
                  </p>
                  <div className="space-y-2">
                    {selectedDayReunioes.map((l) => {
                      const vendedor = users.find((u) => u.id === l.vendedor_id)
                      return (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 p-2.5 bg-[#F5F7FA] rounded-lg hover:bg-[#EEF1F5] cursor-pointer transition-colors"
                          onClick={() => router.push(`/leads/${l.id}`)}
                        >
                          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: TEMPERATURA_COLORS[l.temperatura] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1F2D3D] truncate">{l.nome}</p>
                            <div className="flex items-center gap-2 text-xs text-[#6B7C93]">
                              <Clock size={10} /> {l.hora_reuniao || 'Horario nao definido'}
                              <span>/</span>
                              <User size={10} /> {vendedor?.nome.split(' ')[0]}
                            </div>
                          </div>
                          {l.link_meet && <Video size={14} className="text-indigo-400 flex-shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming meetings list */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#374151] mb-4">Proximas Reunioes</h3>
              <div className="space-y-3 overflow-y-auto max-h-[600px]">
                {upcoming.length === 0 && (
                  <p className="text-sm text-[#A0AEC0] text-center py-6">Nenhuma reuniao agendada.</p>
                )}
                {upcoming.map((l) => {
                  const vendedor = users.find((u) => u.id === l.vendedor_id)
                  const statusBadge = STATUS_BADGE[l.status_funil] || 'bg-slate-600/20 text-[#6B7C93]'
                  return (
                    <div
                      key={l.id}
                      className="p-3 bg-[#F5F7FA] rounded-lg hover:bg-[#EEF1F5] cursor-pointer transition-colors group"
                      onClick={() => router.push(`/leads/${l.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1F2D3D] truncate group-hover:text-indigo-600 transition-colors">{l.nome}</p>
                          <span className={cn('badge text-[10px] mt-0.5', statusBadge)}>
                            {l.status_funil.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[#6B7C93]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} />
                          <span>{formatDate(l.data_reuniao || '')} {l.hora_reuniao && `as ${l.hora_reuniao}`}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} />
                          <span>{l.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User size={11} />
                          <span>{vendedor?.nome}</span>
                        </div>
                        {l.link_meet && (
                          <a
                            href={l.link_meet}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Video size={11} />
                            <span>Abrir Meet</span>
                            <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
