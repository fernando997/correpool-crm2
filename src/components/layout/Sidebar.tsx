'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Kanban, Users, Calendar,
  LogOut, Zap, ChevronRight, Code2, Trophy,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import Image from 'next/image'
import { useApp } from '@/contexts/AppContext'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/marketing', label: 'Marketing',  icon: TrendingUp },
  { href: '/kanban',    label: 'Kanban',     icon: Kanban },
  { href: '/agenda',    label: 'Agenda',     icon: Calendar },
  { href: '/metas',     label: 'Metas',      icon: Trophy },
  { href: '/usuarios',  label: 'Usuários',   icon: Users,  adminOnly: true },
  { href: '/api-docs',  label: 'API',        icon: Code2,  adminOnly: true },
]

// Itens visíveis por perfil
function filterNav(nav: typeof NAV, tipo: string) {
  if (tipo === 'marketing') return nav.filter((n) => n.href === '/marketing')
  if (tipo === 'admin')     return nav // tudo
  return nav.filter((n) => !n.adminOnly)
}

const ROLE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  admin:     { label: 'Administrador', color: 'text-[#1E8E5A]', dot: 'bg-[#2FBF71]' },
  vendedor:  { label: 'Vendedor',      color: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
  sdr:       { label: 'SDR',           color: 'text-[#6B7C93]', dot: 'bg-[#A0AEC0]' },
  marketing: { label: 'Marketing',     color: 'text-[#7C3AED]', dot: 'bg-[#7C3AED]' },
}

export default function Sidebar() {
  const pathname     = usePathname()
  const router       = useRouter()
  const { currentUser, logout, alertas } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  // Persiste o estado no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem('sidebar_collapsed', String(!v))
      return !v
    })
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  const role    = currentUser?.tipo ?? 'sdr'
  const roleCfg = ROLE_CONFIG[role]
  const alertCount = alertas.filter((a) => !a.resolvido).length
  const initial = currentUser?.nome.charAt(0).toUpperCase() ?? '?'

  return (
    <aside
      className="h-screen flex flex-col flex-shrink-0"
      style={{
        background: '#FFFFFF',
        borderRight: '1px solid #E0E6ED',
        width: collapsed ? '64px' : '240px',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo + Toggle ───────────────────────────────────────────── */}
      <div
        className="flex items-center px-3 py-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid #E0E6ED',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '64px',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 overflow-hidden" style={{ minWidth: 0 }}>
          {collapsed ? (
            /* Ícone pequeno quando recolhido */
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}
            >
              <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
            </div>
          ) : (
            /* Logo completa quando expandido */
            <Image src="/logo.png" alt="Modo Corre" width={200} height={64} className="object-contain" style={{ maxHeight: '64px' }} />
          )}
        </div>

        {/* Toggle button */}
        {!collapsed && (
          <button
            onClick={toggle}
            title="Recolher menu"
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F5F7FA]"
            style={{ color: '#A0AEC0' }}
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-4 space-y-0.5" style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}>
        {!collapsed && (
          <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-[0.15em] px-3 mb-3 whitespace-nowrap">
            Menu Principal
          </p>
        )}

        {filterNav(NAV, role).map((item) => {
          const active = pathname.startsWith(item.href)

          return (
            <div key={item.href} className="relative group">
              <button
                onClick={() => router.push(item.href)}
                className={cn('w-full flex items-center rounded-xl transition-all duration-150', active && 'active')}
                style={{
                  gap: collapsed ? 0 : '10px',
                  padding: collapsed ? '10px' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: active
                    ? 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)'
                    : 'transparent',
                  color: active ? '#FFFFFF' : '#6B7C93',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F5F7FA' }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <item.icon size={17} style={{ flexShrink: 0 }} />

                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                    {item.href === '/dashboard' && alertCount > 0 && !active && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {alertCount}
                      </span>
                    )}
                    {active && <ChevronRight size={13} style={{ opacity: 0.6, flexShrink: 0 }} />}
                  </>
                )}

                {/* Badge de alerta no modo colapsado */}
                {collapsed && item.href === '/dashboard' && alertCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>

              {/* Tooltip ao recolher */}
              {collapsed && (
                <div
                  className="absolute left-full top-1/2 z-50 pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 group-hover:opacity-100"
                  style={{
                    transform: 'translateY(-50%)',
                    marginLeft: '10px',
                    background: '#1F2D3D',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {item.label}
                  {item.href === '/dashboard' && alertCount > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">
                      {alertCount}
                    </span>
                  )}
                  {/* seta */}
                  <span
                    className="absolute top-1/2 right-full"
                    style={{
                      transform: 'translateY(-50%)',
                      width: 0, height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderRight: '6px solid #1F2D3D',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── User / Sair ─────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid #E0E6ED',
          padding: collapsed ? '12px 8px' : '12px',
        }}
      >
        {collapsed ? (
          /* Modo mini — avatar + logout empilhados */
          <div className="flex flex-col items-center gap-2">
            {/* Avatar com tooltip */}
            <div className="relative group">
              <div
                className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-default"
                style={{ boxShadow: '0 1px 4px rgba(47,191,113,0.3)' }}
              >
                {initial}
              </div>
              {/* Tooltip do usuário */}
              <div
                className="absolute left-full top-1/2 z-50 pointer-events-none rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100"
                style={{
                  transform: 'translateY(-50%)',
                  marginLeft: '10px',
                  background: '#1F2D3D',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.15s ease',
                  minWidth: '140px',
                }}
              >
                <p className="text-xs font-semibold text-white whitespace-nowrap truncate">{currentUser?.nome}</p>
                <p className="text-[10px] text-white/60 mt-0.5 whitespace-nowrap truncate">{currentUser?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', roleCfg.dot)} />
                  <span className="text-[10px] text-white/70 font-medium">{roleCfg.label}</span>
                </div>
                <span
                  className="absolute top-1/2 right-full"
                  style={{
                    transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '6px solid #1F2D3D',
                  }}
                />
              </div>
            </div>

            {/* Botão de expandir */}
            <button
              onClick={toggle}
              title="Expandir menu"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-[#F5F7FA]"
              style={{ color: '#A0AEC0', border: '1px solid #E0E6ED' }}
            >
              <PanelLeftOpen size={15} />
            </button>

            {/* Logout */}
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50"
                style={{ color: '#A0AEC0', border: '1px solid #E0E6ED' }}
              >
                <LogOut size={15} />
              </button>
              <div
                className="absolute left-full top-1/2 z-50 pointer-events-none rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 group-hover:opacity-100"
                style={{
                  transform: 'translateY(-50%)',
                  marginLeft: '10px',
                  background: '#1F2D3D',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                Sair da conta
                <span
                  className="absolute top-1/2 right-full"
                  style={{
                    transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '6px solid #1F2D3D',
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Modo expandido — card completo */
          <div className="space-y-2">
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ boxShadow: '0 1px 4px rgba(47,191,113,0.3)' }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1F2D3D] truncate leading-tight">{currentUser?.nome}</p>
                  <p className="text-[10px] text-[#A0AEC0] truncate mt-0.5">{currentUser?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full pulse-dot', roleCfg.dot)} />
                <span className={cn('text-[10px] font-semibold', roleCfg.color)}>{roleCfg.label}</span>
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
        )}
      </div>
    </aside>
  )
}
