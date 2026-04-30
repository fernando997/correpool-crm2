'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import { cn } from '@/lib/utils'
import {
  Plus, Shield, Briefcase, Headphones, X, Check, Mail, User,
  Code2, Copy, Lock, Pencil, UserX, UserCheck, BarChart2,
} from 'lucide-react'
import type { UserRole, User as UserType } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-indigo-400',
    bg: 'bg-indigo-600/10 border-indigo-600/20',
  },
  vendedor: {
    label: 'Vendedor',
    icon: Briefcase,
    color: 'text-emerald-400',
    bg: 'bg-emerald-600/10 border-emerald-600/20',
  },
  sdr: {
    label: 'SDR',
    icon: Headphones,
    color: 'text-amber-400',
    bg: 'bg-amber-600/10 border-amber-600/20',
  },
  marketing: {
    label: 'Marketing',
    icon: BarChart2,
    color: 'text-purple-400',
    bg: 'bg-purple-600/10 border-purple-600/20',
  },
}

// ── Modal de Integração ──────────────────────────────────────────────────────
function IntegracaoModal({ user, onClose }: { user: UserType; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const fieldKey = user.tipo === 'sdr' ? 'sdr_id' : 'vendedor_id'
  const shortKey = ANON_KEY.slice(0, 30) + '…'

  function buildCurl(full = false) {
    const key = full ? ANON_KEY : shortKey
    return `curl -X POST '${SUPABASE_URL}/rest/v1/leads' \\
  -H 'apikey: ${key}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -H 'Prefer: return=representation' \\
  -d '{
  "nome": "Nome do Lead",
  "telefone": "(11) 99999-0000",
  "${fieldKey}": "${user.id}",
  "valor_estimado": "De R$100 a R$200 mil",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "campanha",
  "utm_content": "criativo",
  "utm_term": "palavra-chave",
  "utm_anuncio": "AD-001",
  "utm_posicionamento": "feed",
  "temperatura": "frio",
  "status_funil": "trafego_pago",
  "data_criacao": "${new Date().toISOString().split('T')[0]}",
  "reuniao_agendada": false,
  "email": ""
}'`
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-blue-400" />
            <h2 className="text-base font-semibold text-[#1F2D3D]">Informacoes de Integracao</h2>
          </div>
          <button onClick={onClose} className="text-[#6B7C93] hover:text-[#374151] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center text-white font-bold">
              {user.nome.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-[#1F2D3D] text-sm">{user.nome}</p>
              <p className="text-xs text-[#6B7C93]">{user.email}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#6B7C93] mb-1.5">
              ID do {user.tipo === 'sdr' ? 'SDR' : 'Vendedor'} — use como <code className="text-blue-400 bg-blue-400/10 px-1 rounded">{fieldKey}</code>
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E0E6ED' }}>
              <code className="flex-1 text-emerald-400 font-bold font-mono text-sm">{user.id}</code>
              <button
                onClick={() => copy(user.id, 'id')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{ background: copied === 'id' ? '#05966920' : '#EEF1F5', border: '1px solid #E0E6ED', color: copied === 'id' ? '#34d399' : '#94a3b8' }}
              >
                {copied === 'id' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'id' ? 'Copiado!' : 'Copiar ID'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-[#6B7C93]">Exemplo cURL pronto para usar</p>
              <button
                onClick={() => copy(buildCurl(true), 'curl')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{ background: copied === 'curl' ? '#05966920' : '#EEF1F5', border: '1px solid #E0E6ED', color: copied === 'curl' ? '#34d399' : '#94a3b8' }}
              >
                {copied === 'curl' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'curl' ? 'Copiado!' : 'Copiar cURL'}
              </button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
              <pre className="p-3 text-[10px] font-mono text-[#6B7C93] overflow-x-auto max-h-52 leading-relaxed whitespace-pre-wrap">
                {buildCurl()}
              </pre>
            </div>
            <p className="text-[10px] text-[#A0AEC0] mt-1.5">* A chave está truncada na exibicao. Ao copiar, a chave completa e usada.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared form fields ────────────────────────────────────────────────────────
interface UserFormState {
  nome: string
  email: string
  senha: string
  tipo: UserRole
  vendedoresVinculados: string[] // multi-select IDs
}

function UserFormFields({
  form,
  setForm,
  vendedores,
  showSenhaPlaceholder,
}: {
  form: UserFormState
  setForm: (f: UserFormState) => void
  vendedores: UserType[]
  showSenhaPlaceholder?: boolean
}) {
  function toggleVendedor(id: string) {
    setForm({
      ...form,
      vendedoresVinculados: form.vendedoresVinculados.includes(id)
        ? form.vendedoresVinculados.filter((v) => v !== id)
        : [...form.vendedoresVinculados, id],
    })
  }

  return (
    <>
      <div>
        <label className="label block mb-1.5">Nome Completo *</label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93]" />
          <input
            className="input pl-8"
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do usuario"
          />
        </div>
      </div>

      <div>
        <label className="label block mb-1.5">Email *</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93]" />
          <input
            type="email"
            className="input pl-8"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@empresa.com"
          />
        </div>
      </div>

      <div>
        <label className="label block mb-1.5">
          Senha {showSenhaPlaceholder ? <span className="text-[#A0AEC0] font-normal">(deixe vazio para manter)</span> : '*'}
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C93]" />
          <input
            type="password"
            className="input pl-8"
            required={!showSenhaPlaceholder}
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            placeholder={showSenhaPlaceholder ? '••••••••' : 'Senha de acesso'}
          />
        </div>
      </div>

      <div>
        <label className="label block mb-2">Tipo de Usuario *</label>
        <div className="grid grid-cols-2 gap-2">
          {(['admin', 'vendedor', 'sdr', 'marketing'] as UserRole[]).map((role) => {
            const cfg = ROLE_CONFIG[role]
            const selected = form.tipo === role
            return (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, tipo: role })}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                  selected ? `${cfg.bg} border-current ${cfg.color}` : 'bg-[#F5F7FA] border-[#E0E6ED] text-[#6B7C93] hover:border-[#D1D9E6]'
                )}
              >
                <cfg.icon size={18} />
                <span className="text-[11px] font-medium">{cfg.label}</span>
                {selected && <Check size={12} />}
              </button>
            )
          })}
        </div>
      </div>

      {form.tipo === 'sdr' && vendedores.length > 0 && (
        <div>
          <label className="label block mb-2">Vendedores Vinculados</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {vendedores.map((v) => {
              const checked = form.vendedoresVinculados.includes(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVendedor(v.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left',
                    checked
                      ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-400'
                      : 'bg-[#F5F7FA] border-[#E0E6ED] text-[#6B7C93] hover:border-[#D1D9E6]'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  )}>
                    {checked && <Check size={10} className="text-[#1F2D3D]" />}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    {v.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.nome}</p>
                    <p className="text-[10px] text-[#A0AEC0] truncate">{v.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {form.vendedoresVinculados.length > 0 && (
            <p className="text-[10px] text-[#A0AEC0] mt-1.5">
              {form.vendedoresVinculados.length} vendedor(es) selecionado(s)
            </p>
          )}
        </div>
      )}
    </>
  )
}

const EMPTY_FORM: UserFormState = {
  nome: '', email: '', senha: '', tipo: 'vendedor', vendedoresVinculados: [],
}

// ──────────────────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { users, addUser, updateUser, toggleUserAtivo, leads, currentUser } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<UserType | null>(null)
  const [integracaoUser, setIntegracaoUser] = useState<UserType | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_FORM)

  if (currentUser?.tipo !== 'admin') {
    return (
      <AppShell>
        <div className="p-6 text-center text-[#6B7C93] pt-20">
          <Shield size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-[#6B7C93] font-medium">Acesso restrito a administradores.</p>
        </div>
      </AppShell>
    )
  }

  const vendedores = users.filter((u) => u.tipo === 'vendedor')

  function openEdit(user: UserType) {
    const ids = user.vendedorVinculado
      ? user.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    setEditForm({
      nome: user.nome,
      email: user.email,
      senha: '',
      tipo: user.tipo,
      vendedoresVinculados: ids,
    })
    setEditUser(user)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await addUser(
      {
        nome: form.nome,
        email: form.email,
        tipo: form.tipo,
        vendedorVinculado: form.tipo === 'sdr' && form.vendedoresVinculados.length > 0
          ? form.vendedoresVinculados.join(',')
          : undefined,
      },
      form.senha,
    )
    setForm(EMPTY_FORM)
    setShowModal(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    await updateUser(
      editUser.id,
      {
        nome: editForm.nome,
        email: editForm.email,
        tipo: editForm.tipo,
        vendedorVinculado: editForm.tipo === 'sdr' && editForm.vendedoresVinculados.length > 0
          ? editForm.vendedoresVinculados.join(',')
          : undefined,
      },
      editForm.senha || undefined,
    )
    setEditUser(null)
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1F2D3D]">Gestao de Usuarios</h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">{users.length} usuarios cadastrados</p>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} />
            Novo Usuario
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['admin', 'vendedor', 'sdr', 'marketing'] as UserRole[]).map((role) => {
            const roleUsers = users.filter((u) => u.tipo === role)
            const cfg = ROLE_CONFIG[role]
            return (
              <div key={role} className={cn('card p-4 border', cfg.bg)}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                    <cfg.icon size={20} className={cfg.color} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1F2D3D]">{roleUsers.length}</p>
                    <p className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Users list */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => {
            const cfg = ROLE_CONFIG[user.tipo]
            const isAtivo = user.ativo !== false
            const userLeads = leads.filter((l) => l.vendedor_id === user.id || l.sdr_id === user.id)
            const fechados = leads.filter((l) => l.vendedor_id === user.id && l.status_funil === 'fechado').length
            const agendados = leads.filter((l) =>
              (l.vendedor_id === user.id || l.sdr_id === user.id) &&
              ['agendado', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado', 'fechado'].includes(l.status_funil)
            ).length

            // Multi-vendor support: split comma-separated IDs
            const vinculadoIds = user.tipo === 'sdr' && user.vendedorVinculado
              ? user.vendedorVinculado.split(',').map((s) => s.trim()).filter(Boolean)
              : []
            const vinculados = vinculadoIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as UserType[]

            return (
              <div key={user.id} className={cn('card p-5 transition-opacity', !isAtivo && 'opacity-50')}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0',
                    cfg.bg, cfg.color,
                    !isAtivo && 'grayscale'
                  )}>
                    {user.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1F2D3D] truncate">{user.nome}</p>
                      {!isAtivo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-[#6B7C93] font-medium flex-shrink-0">
                          inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7C93] truncate">{user.email}</p>
                    <div className={cn('badge border text-[10px] mt-1 font-semibold', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#F5F7FA] rounded-lg py-2">
                    <p className="text-lg font-bold text-[#1F2D3D]">{userLeads.length}</p>
                    <p className="text-[10px] text-[#A0AEC0]">Leads</p>
                  </div>
                  <div className="bg-[#F5F7FA] rounded-lg py-2">
                    <p className="text-lg font-bold text-amber-400">{agendados}</p>
                    <p className="text-[10px] text-[#A0AEC0]">Agend.</p>
                  </div>
                  <div className="bg-[#F5F7FA] rounded-lg py-2">
                    <p className="text-lg font-bold text-emerald-400">{fechados}</p>
                    <p className="text-[10px] text-[#A0AEC0]">Fechados</p>
                  </div>
                </div>

                {vinculados.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E0E6ED] space-y-1">
                    {vinculados.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-xs text-[#6B7C93]">
                        <Briefcase size={11} className="text-emerald-400 flex-shrink-0" />
                        <span>Vinculado a <span className="text-emerald-400 font-medium">{v.nome}</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {(user.tipo === 'vendedor' || user.tipo === 'sdr') && (
                    <button
                      onClick={() => setIntegracaoUser(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/8"
                      style={{ border: '1px solid #E0E6ED' }}
                    >
                      <Code2 size={12} />
                      Integração
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(user)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-[#6B7C93] hover:text-[#1F2D3D] hover:bg-white/5"
                    style={{ border: '1px solid #E0E6ED' }}
                    title="Editar perfil"
                  >
                    <Pencil size={12} />
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => toggleUserAtivo(user.id)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isAtivo
                          ? 'text-red-400/70 hover:text-red-400 hover:bg-red-400/8'
                          : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-400/8'
                      )}
                      style={{ border: '1px solid #E0E6ED' }}
                      title={isAtivo ? 'Inativar usuario' : 'Reativar usuario'}
                    >
                      {isAtivo ? <UserX size={12} /> : <UserCheck size={12} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de integração */}
      {integracaoUser && (
        <IntegracaoModal user={integracaoUser} onClose={() => setIntegracaoUser(null)} />
      )}

      {/* Modal — Criar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
              <h2 className="text-lg font-semibold text-[#1F2D3D]">Novo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6B7C93] hover:text-[#374151] transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <UserFormFields form={form} setForm={setForm} vendedores={vendedores} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Criar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Editar Usuario */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
              <h2 className="text-lg font-semibold text-[#1F2D3D]">Editar Usuario</h2>
              <button onClick={() => setEditUser(null)} className="text-[#6B7C93] hover:text-[#374151] transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <UserFormFields form={editForm} setForm={setEditForm} vendedores={vendedores} showSenhaPlaceholder />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Salvar Alteracoes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
