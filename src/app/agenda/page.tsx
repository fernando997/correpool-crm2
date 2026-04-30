'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { cn, formatDate } from '@/lib/utils'
import {
  Calendar, Clock, Video, User, ChevronLeft, ChevronRight,
  Phone, Filter, ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TEMPERATURA_COLORS } from '@/types'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export default function AgendaPage() {
  const { leads, users, currentUser } = useApp()
  const router = useRouter()

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [filterVendedor, setFilterVendedor] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const reunioes = leads.filter((l) => l.reuniao_agendada && l.data_reuniao)

  const filteredReunioes = reunioes.filter((l) => {
    if (currentUser?.tipo === 'vendedor') return l.vendedor_id === currentUser.id
    if (currentUser?.tipo === 'sdr') return l.sdr_id === currentUser.id
    if (filterVendedor) return l.vendedor_id === filterVendedor
    return true
  })

  const vendedores = users.filter((u) => u.tipo === 'vendedor')

  // Calendar logic
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const reunioesByDay: Record<number, typeof filteredReunioes> = {}
  filteredReunioes.forEach((l) => {
    if (!l.data_reuniao) return
    const d = new Date(l.data_reuniao)
    if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
      const day = d.getDate()
      if (!reunioesByDay[day]) reunioesByDay[day] = []
      reunioesByDay[day].push(l)
    }
  })

  // List view: upcoming sorted
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

  const STATUS_BADGE: Record<string, string> = {
    agendado: 'bg-amber-600/20 text-amber-400',
    reuniao_realizada: 'bg-violet-600/20 text-violet-400',
    contrato_enviado: 'bg-sky-600/20 text-sky-400',
    contrato_assinado: 'bg-teal-600/20 text-teal-400',
    fechado: 'bg-emerald-600/20 text-emerald-400',
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1F2D3D]">Agenda de Reunioes</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">{filteredReunioes.length} reunioes agendadas no total</p>
          </div>
          {currentUser?.tipo === 'admin' && (
            <select
              className="input !w-48 text-sm"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="card p-5 lg:col-span-2">
            {/* Month nav */}
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

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-[#A0AEC0] py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for first day */}
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
                      isSelected ? 'bg-indigo-600 text-[#1F2D3D]' :
                        isToday ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' :
                          dayReunioes.length > 0 ? 'bg-[#E0E6ED] text-[#1F2D3D] hover:bg-[#D1D9E6]' :
                            'text-[#6B7C93] hover:bg-[#EEF1F5]'
                    )}
                  >
                    <span className={cn('font-medium', isToday && !isSelected && 'font-bold')}>{day}</span>
                    {dayReunioes.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayReunioes.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-amber-400')}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day details */}
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
                        {l.link_meet && (
                          <Video size={14} className="text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming meetings list */}
          <div className="card p-5">
            <h3 className="section-title text-base mb-4">Proximas Reunioes</h3>
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
                        <p className="text-sm font-semibold text-[#1F2D3D] truncate group-hover:text-indigo-300 transition-colors">{l.nome}</p>
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
                          className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
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
      </div>
    </AppShell>
  )
}
