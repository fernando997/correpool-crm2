'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Kanban, Calendar, Trophy,
  Users, Code2, Menu, X, LogOut, BellRing, ChevronRight,
  Phone, User, Zap,
} from 'lucide-react'
import Image from 'next/image'
import { useApp } from '@/contexts/AppContext'
import Sidebar from './Sidebar'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/marketing', label: 'Marketing',  icon: TrendingUp },
  { href: '/kanban',    label: 'Kanban',     icon: Kanban },
  { href: '/agenda',    label: 'Agenda',     icon: Calendar },
  { href: '/metas',     label: 'Metas',      icon: Trophy },
  { href: '/usuarios',  label: 'Usuários',   icon: Users,  adminOnly: true },
  { href: '/api-docs',  label: 'API',        icon: Code2,  adminOnly: true },
]

const ROLE_CONFIG: Record<string, { label: string; dot: string }> = {
  admin:     { label: 'Administrador', dot: 'bg-[#2FBF71]' },
  vendedor:  { label: 'Vendedor',      dot: 'bg-[#3B82F6]' },
  sdr:       { label: 'SDR',           dot: 'bg-[#A0AEC0]' },
  marketing: { label: 'Marketing',     dot: 'bg-[#7C3AED]' },
}

const TEMP_LABEL: Record<string, string> = {
  frio: 'Frio', morno: 'Morno', quente: 'Quente',
  muito_quente: 'Muito Quente', desqualificado: 'Desqualificado',
}
const TEMP_COLOR: Record<string, string> = {
  frio: '#60a5fa', morno: '#f59e0b', quente: '#f97316',
  muito_quente: '#ef4444', desqualificado: '#6b7280',
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const freqs = [523, 659, 784]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.start(t); osc.stop(t + 0.3)
    })
  } catch { /* sem áudio */ }
}

// ── Popup de novo lead ────────────────────────────────────────────────────────
function NewLeadPopup({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const router   = useRouter()
  const [count, setCount] = useState(15)

  useEffect(() => {
    const interval = setInterval(() => setCount((c) => c - 1), 1000)
    const timeout  = setTimeout(onClose, 15000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [onClose])

  const initial  = lead.nome?.charAt(0).toUpperCase() ?? '?'
  const tempColor = TEMP_COLOR[lead.temperatura] ?? '#6b7280'
  const tempLabel = TEMP_LABEL[lead.temperatura] ?? lead.temperatura

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay pulsante */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Card central */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: '#FFFFFF',
          animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <style>{`
          @keyframes popIn {
            from { transform: scale(0.6); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes pulse-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}</style>

        {/* Barra de contagem regressiva */}
        <div className="h-1.5 w-full" style={{ background: '#E0E6ED' }}>
          <div
            className="h-1.5"
            style={{
              background: 'linear-gradient(90deg,#2FBF71,#1E8E5A)',
              animation: 'shrinkBar 15s linear forwards',
            }}
          />
          <style>{`@keyframes shrinkBar{from{width:100%}to{width:0%}}`}</style>
        </div>

        {/* Header verde */}
        <div
          className="px-6 pt-6 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg,#2FBF71 0%,#1E8E5A 100%)' }}
        >
          {/* Ícone pulsante */}
          <div className="relative flex items-center justify-center mb-3">
            <div className="absolute w-16 h-16 rounded-full"
              style={{ background: 'rgba(255,255,255,0.3)', animation: 'pulse-ring 1.2s ease-out infinite' }} />
            <div className="relative w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap size={32} className="text-white" fill="white" />
            </div>
          </div>

          <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-1">Novo Lead Chegou!</p>
          <h2 className="text-white text-2xl font-extrabold tracking-tight">{lead.nome}</h2>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-3">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            {lead.telefone && (
              <div className="rounded-xl p-3 flex items-center gap-2.5"
                style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(47,191,113,0.15)' }}>
                  <Phone size={14} style={{ color: '#2FBF71' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-[#A0AEC0] font-semibold uppercase">Telefone</p>
                  <p className="text-xs font-bold text-[#1F2D3D] truncate">{lead.telefone}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl p-3 flex items-center gap-2.5"
              style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${tempColor}20` }}>
                <div className="w-3 h-3 rounded-full" style={{ background: tempColor }} />
              </div>
              <div>
                <p className="text-[9px] text-[#A0AEC0] font-semibold uppercase">Temperatura</p>
                <p className="text-xs font-bold" style={{ color: tempColor }}>{tempLabel}</p>
              </div>
            </div>

            {lead.utm_source && (
              <div className="rounded-xl p-3 flex items-center gap-2.5 col-span-2"
                style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <TrendingUp size={14} style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <p className="text-[9px] text-[#A0AEC0] font-semibold uppercase">Origem</p>
                  <p className="text-xs font-bold text-[#1F2D3D] capitalize">
                    {lead.utm_source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <button
            onClick={() => { router.push('/kanban'); onClose() }}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg,#2FBF71 0%,#1E8E5A 100%)',
              boxShadow: '0 4px 20px rgba(47,191,113,0.45)',
            }}
          >
            Abrir no Kanban agora →
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[#F5F7FA]"
            style={{ color: '#6B7C93' }}
          >
            Fechar ({count}s)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AppShell ─────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, logout, alertas, leads } = useApp()
  const router   = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [newLead,    setNewLead]      = useState<Lead | null>(null)
  const knownIds = useRef<Set<string> | null>(null)

  // ── Detecção de novo lead para SDR (global — funciona em qualquer página) ──
  useEffect(() => {
    if (currentUser?.tipo !== 'sdr') return

    const meuLeads = leads.filter((l) => l.sdr_id === currentUser.id)

    if (knownIds.current === null) {
      // Primeira carga — registra IDs existentes sem notificar
      knownIds.current = new Set(meuLeads.map((l) => l.id))
      return
    }

    for (const lead of meuLeads) {
      if (!knownIds.current.has(lead.id)) {
        knownIds.current.add(lead.id)
        setNewLead(lead)
        playAlertSound()
        break
      }
    }
  }, [leads, currentUser])

  useEffect(() => {
    if (!loading && !currentUser) { router.replace('/'); return }
    if (!loading && currentUser?.tipo === 'marketing' && !pathname.startsWith('/marketing')) {
      router.replace('/marketing')
    }
  }, [currentUser, loading, router, pathname])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#F5F7FA' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Carregando dados...</p>
      </div>
    </div>
  )

  if (!currentUser) return null

  const alertCount = alertas.filter((a) => !a.resolvido).length
  const roleCfg    = ROLE_CONFIG[currentUser.tipo] ?? ROLE_CONFIG.sdr
  const initial    = currentUser.nome.charAt(0).toUpperCase()
  const visibleNav = currentUser.tipo === 'marketing'
    ? NAV.filter((n) => n.href === '/marketing')
    : currentUser.tipo === 'admin'
      ? NAV
      : NAV.filter((n) => !n.adminOnly)

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Popup novo lead SDR ───────────────────────────────────────────── */}
      {newLead && <NewLeadPopup lead={newLead} onClose={() => setNewLead(null)} />}

      {/* ── Desktop: Sidebar ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#F5F7FA] lg:pb-0 pb-16">

        {/* ── Mobile: Header fixo no topo ──────────────────────────────── */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E0E6ED', height: '56px' }}
        >
          <Image src="/logo.png" alt="Modo Corre" width={130} height={44} className="object-contain" />

          <div className="flex items-center gap-3">
            {alertCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <BellRing size={13} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">{alertCount}</span>
              </div>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#F5F7FA', border: '1px solid #E0E6ED', color: '#6B7C93' }}
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {children}
      </main>

      {/* ── Mobile: Bottom Nav ───────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: '#FFFFFF', borderTop: '1px solid #E0E6ED', height: '60px' }}
      >
        {visibleNav.filter((n) => !n.adminOnly).slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
              style={{ color: active ? '#2FBF71' : '#A0AEC0' }}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: '#2FBF71' }} />
              )}
              <item.icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {item.href === '/dashboard' && alertCount > 0 && !active && (
                <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Mobile: Drawer lateral ───────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="relative flex flex-col w-72 h-full shadow-2xl"
            style={{ background: '#FFFFFF' }}
          >
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #E0E6ED' }}>
              <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#F5F7FA', border: '1px solid #E0E6ED', color: '#6B7C93' }}
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-[0.15em] px-3 mb-3">
                Menu Principal
              </p>
              {visibleNav.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                    style={{
                      background: active ? 'linear-gradient(135deg,#2FBF71,#1E8E5A)' : 'transparent',
                      color: active ? '#FFFFFF' : '#6B7C93',
                    }}
                  >
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {active && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
                    {item.href === '/dashboard' && alertCount > 0 && !active && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {alertCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="flex-shrink-0 p-4 space-y-3" style={{ borderTop: '1px solid #E0E6ED' }}>
              <div className="rounded-xl p-3" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ boxShadow: '0 1px 4px rgba(47,191,113,0.3)' }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1F2D3D] truncate">{currentUser.nome}</p>
                    <p className="text-[10px] text-[#A0AEC0] truncate mt-0.5">{currentUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full pulse-dot', roleCfg.dot)} />
                  <span className="text-[10px] font-semibold text-[#6B7C93]">{roleCfg.label}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-red-50 hover:text-red-500"
                style={{ color: '#6B7C93' }}
              >
                <LogOut size={15} style={{ color: '#A0AEC0' }} />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
