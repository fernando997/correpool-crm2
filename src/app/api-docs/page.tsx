'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import {
  Code2, Send, Copy, Check, ChevronDown, ChevronRight,
  Lock, Database, Plus, List, Pencil, Trash2, FileText, History,
} from 'lucide-react'

const BASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BASE_HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── helpers ────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      className="p-1.5 rounded hover:bg-white/10 text-[#6B7C93] hover:text-[#374151] transition-colors">
      {ok ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
    POST:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    PATCH:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/25',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${colors[method]}`}>
      {method}
    </span>
  )
}

function ResponseBox({ res }: { res: { status: number; body: unknown } | null }) {
  if (!res) return null
  const ok = res.status >= 200 && res.status < 300
  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${ok ? '#05966920' : '#dc262620'}` }}>
      <div className={`px-3 py-1.5 flex items-center gap-2 text-xs font-mono font-bold ${ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}
        style={{ borderBottom: '1px solid #E0E6ED' }}>
        HTTP {res.status === 0 ? 'ERRO DE REDE' : res.status}
      </div>
      <pre className="p-3 text-[11px] font-mono text-[#374151] overflow-x-auto max-h-52 leading-relaxed"
        style={{ background: '#F5F7FA' }}>
        {JSON.stringify(res.body, null, 2)}
      </pre>
    </div>
  )
}

// ── componente de endpoint ──────────────────────────────────────────────────
interface EndpointProps {
  method: string
  path: string
  summary: string
  icon: React.ReactNode
  children: React.ReactNode
}
function Endpoint({ method, path, summary, icon, children }: EndpointProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left">
        <Badge method={method} />
        <code className="text-sm font-mono text-[#1F2D3D] flex-1 truncate">{path}</code>
        <span className="text-xs text-text-muted hidden sm:block mr-2">{summary}</span>
        {icon}
        {open ? <ChevronDown size={14} className="text-[#6B7C93] flex-shrink-0" /> : <ChevronRight size={14} className="text-[#6B7C93] flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid #E0E6ED' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function ApiDocsPage() {
  const { currentUser, users } = useApp()
  const router = useRouter()

  if (currentUser && currentUser.tipo !== 'admin') { router.replace('/dashboard'); return null }

  const vendedores = users.filter((u) => u.tipo === 'vendedor')
  const sdrs       = users.filter((u) => u.tipo === 'sdr')

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center"><Code2 size={17} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-text-bright">API Explorer — Supabase REST</h1>
            <p className="text-xs text-text-muted">Endpoints diretos do banco de dados via PostgREST</p>
          </div>
        </div>

        {/* Auth info */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Lock size={14} className="text-yellow-400" /> Autenticação
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#6B7C93] mb-1 font-medium">Base URL</p>
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg font-mono" style={{ background: '#F9FAFB', border: '1px solid #E0E6ED' }}>
                <span className="text-[#374151] flex-1 truncate text-[11px]">{BASE_URL}</span>
                <CopyBtn text={BASE_URL} />
              </div>
            </div>
            <div>
              <p className="text-[#6B7C93] mb-1 font-medium">anon key (header <code className="text-blue-400">apikey</code>)</p>
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg font-mono" style={{ background: '#F9FAFB', border: '1px solid #E0E6ED' }}>
                <span className="text-emerald-400 flex-1 truncate text-[11px]">{ANON_KEY.slice(0, 40)}…</span>
                <CopyBtn text={ANON_KEY} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-text-dim">
            Toda requisição precisa dos headers: <code className="text-blue-300">apikey: &lt;anon_key&gt;</code> e <code className="text-blue-300">Authorization: Bearer &lt;anon_key&gt;</code>
          </p>
        </div>

        {/* Endpoints */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest flex items-center gap-2">
            <Database size={11} /> Leads
          </p>

          {/* POST /leads */}
          <PostLeads BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} vendedores={vendedores} sdrs={sdrs} />

          {/* GET /leads */}
          <GetLeads BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />

          {/* PATCH /leads */}
          <PatchLead BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />

          {/* DELETE /leads */}
          <DeleteLead BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />

          <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-widest flex items-center gap-2 pt-2">
            <Database size={11} /> Outros recursos
          </p>

          {/* GET /users */}
          <GetUsers BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />

          {/* POST /anotacoes */}
          <PostAnotacao BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />

          {/* GET /historico */}
          <GetHistorico BASE_URL={BASE_URL} HEADERS={BASE_HEADERS} />
        </div>

        {/* cURL quick reference */}
        <CurlReference BASE_URL={BASE_URL} ANON_KEY={ANON_KEY} />
      </div>
    </AppShell>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// POST /rest/v1/leads
// ════════════════════════════════════════════════════════════════════════════
function PostLeads({ BASE_URL, HEADERS, vendedores, sdrs }: {
  BASE_URL: string; HEADERS: Record<string, string>
  vendedores: { id: string; nome: string }[]
  sdrs: { id: string; nome: string }[]
}) {
  const [f, setF] = useState({
    nome: '', telefone: '', email: '', observacao: '',
    vendedor_id: vendedores[0]?.id ?? '',
    sdr_id: '',
    utm_source: '', utm_medium: '', utm_campaign: '',
    utm_content: '', utm_term: '', utm_anuncio: '', utm_posicionamento: '',
    valor_estimado: '',
  })
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  const isValid = f.nome && f.telefone && f.valor_estimado && f.vendedor_id &&
    f.utm_source && f.utm_medium && f.utm_campaign &&
    f.utm_content && f.utm_term && f.utm_anuncio && f.utm_posicionamento

  async function run() {
    setLoading(true); setRes(null)
    const now = new Date()
    const body: Record<string, unknown> = {
      nome: f.nome,
      telefone: f.telefone,
      email: f.email || '',
      observacao: f.observacao || '',
      data_criacao: now.toISOString().split('T')[0],
      reuniao_agendada: false,
      temperatura: 'frio',
      status_funil: 'trafego_pago',
      vendedor_id: f.vendedor_id,
      utm_source: f.utm_source,
      utm_medium: f.utm_medium,
      utm_campaign: f.utm_campaign,
      utm_content: f.utm_content,
      utm_term: f.utm_term,
      utm_anuncio: f.utm_anuncio,
      utm_posicionamento: f.utm_posicionamento,
      valor_estimado: f.valor_estimado,
      ultima_interacao_em: now.toISOString(),
    }
    if (f.sdr_id) body.sdr_id = f.sdr_id

    try {
      const r = await fetch(`${BASE_URL}/rest/v1/leads`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
      setRes({ status: r.status, body: await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  const req = 'after:content-["*"] after:text-red-400 after:ml-0.5'

  return (
    <Endpoint method="POST" path="/rest/v1/leads" summary="Criar novo lead" icon={<Plus size={14} className="text-emerald-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-1">
        Insere um lead em <span className="text-blue-400">trafego_pago</span>.
        Temperatura é sempre <span className="text-blue-400">frio</span> por padrão.
      </p>
      <p className="text-[11px] text-red-400/70 mb-4">* campos obrigatórios</p>

      {/* Dados principais */}
      <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-wider mb-2">Dados do lead</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div><label className={`label block mb-1 ${req}`}>nome</label><input className="input" value={f.nome} onChange={e => setF({...f, nome: e.target.value})} placeholder="João Silva" /></div>
        <div><label className={`label block mb-1 ${req}`}>celular</label><input className="input" value={f.telefone} onChange={e => setF({...f, telefone: e.target.value})} placeholder="(11) 99999-0000" /></div>
        <div><label className={`label block mb-1 ${req}`}>valor_estimado (R$)</label><input className="input" type="number" value={f.valor_estimado} onChange={e => setF({...f, valor_estimado: e.target.value})} placeholder="4800" /></div>
        <div><label className={`label block mb-1 ${req}`}>vendedor_id</label>
          <select className="input" value={f.vendedor_id} onChange={e => setF({...f, vendedor_id: e.target.value})}>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.id} — {v.nome}</option>)}
          </select>
        </div>
        <div><label className="label block mb-1">email</label><input className="input" type="email" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="email@empresa.com" /></div>
        <div><label className="label block mb-1">sdr_id</label>
          <select className="input" value={f.sdr_id} onChange={e => setF({...f, sdr_id: e.target.value})}>
            <option value="">— nenhum —</option>
            {sdrs.map(s => <option key={s.id} value={s.id}>{s.id} — {s.nome}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label block mb-1">observacao</label>
          <textarea className="input resize-none text-xs" rows={2} value={f.observacao} onChange={e => setF({...f, observacao: e.target.value})} placeholder="Observações sobre o lead..." />
        </div>
      </div>

      {/* UTMs — todos obrigatórios */}
      <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-wider mb-2">UTM Parameters <span className="text-red-400">*</span> todos obrigatórios</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([
          ['utm_source','utm_source','facebook'],
          ['utm_medium','utm_medium','cpc'],
          ['utm_campaign','utm_campaign','campanha_q2'],
          ['utm_content','utm_content','video_depoimento'],
          ['utm_term','utm_term','correpool crm'],
          ['utm_anuncio','utm_anuncio','AD-VDC-001'],
          ['utm_posicionamento','utm_posicionamento','feed'],
        ] as [keyof typeof f, string, string][]).map(([key, label, ph]) => (
          <div key={key}>
            <label className={`label block mb-1 ${req}`}>{label}</label>
            <input className="input text-xs" value={f[key] as string} onChange={e => setF({...f, [key]: e.target.value})} placeholder={ph} />
          </div>
        ))}
      </div>

      <button onClick={run} disabled={loading || !isValid}
        className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-40">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Enviando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GET /rest/v1/leads
// ════════════════════════════════════════════════════════════════════════════
function GetLeads({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [status, setStatus] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [limit, setLimit] = useState('10')
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setRes(null)
    const params = new URLSearchParams({ select: '*', limit })
    if (status)   params.set('status_funil', `eq.${status}`)
    if (vendedor) params.set('vendedor_id', `eq.${vendedor}`)
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/leads?${params}`, { headers: { ...HEADERS, Prefer: 'count=exact' } })
      setRes({ status: r.status, body: await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  const STATUS_OPTIONS = ['trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado']

  return (
    <Endpoint method="GET" path="/rest/v1/leads" summary="Listar leads" icon={<List size={14} className="text-blue-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Retorna leads com filtros opcionais. Usa sintaxe PostgREST: <code className="text-blue-400">?campo=eq.valor</code></p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div><label className="label block mb-1">status_funil</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">— todos —</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="label block mb-1">vendedor_id</label><input className="input" value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="u2" /></div>
        <div><label className="label block mb-1">limit</label><input className="input" type="number" value={limit} onChange={e => setLimit(e.target.value)} /></div>
      </div>
      <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Buscando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PATCH /rest/v1/leads?id=eq.{id}
// ════════════════════════════════════════════════════════════════════════════
function PatchLead({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [id, setId] = useState('')
  const [status, setStatus] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [observacao, setObservacao] = useState('')
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setRes(null)
    const body: Record<string, string> = {}
    if (status)      body.status_funil = status
    if (temperatura) body.temperatura = temperatura
    if (observacao)  body.observacao = observacao
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/leads?id=eq.${id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(body) })
      setRes({ status: r.status, body: r.status === 204 ? { success: true, message: 'Atualizado com sucesso' } : await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  return (
    <Endpoint method="PATCH" path="/rest/v1/leads?id=eq.{id}" summary="Atualizar lead" icon={<Pencil size={14} className="text-yellow-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Atualiza campos de um lead específico. Informe o <code className="text-yellow-400">id</code> do lead e os campos a alterar.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="col-span-2"><label className="label block mb-1">id do lead *</label><input className="input font-mono" value={id} onChange={e => setId(e.target.value)} placeholder="l1 ou api_1712345678" /></div>
        <div><label className="label block mb-1">status_funil</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">— não alterar —</option>
            {['trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="label block mb-1">temperatura</label>
          <select className="input" value={temperatura} onChange={e => setTemperatura(e.target.value)}>
            <option value="">— não alterar —</option>
            {['frio','morno','quente','muito_quente','desqualificado'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label block mb-1">observacao</label><input className="input" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Nova observação..." /></div>
      </div>
      <button onClick={run} disabled={loading || !id} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Atualizando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /rest/v1/leads?id=eq.{id}
// ════════════════════════════════════════════════════════════════════════════
function DeleteLead({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [id, setId] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!confirm) { setConfirm(true); return }
    setLoading(true); setRes(null); setConfirm(false)
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/leads?id=eq.${id}`, { method: 'DELETE', headers: HEADERS })
      setRes({ status: r.status, body: r.status === 204 ? { success: true, message: 'Lead deletado' } : await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  return (
    <Endpoint method="DELETE" path="/rest/v1/leads?id=eq.{id}" summary="Deletar lead" icon={<Trash2 size={14} className="text-red-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Remove um lead permanentemente. Esta ação é irreversível.</p>
      <div className="mb-3"><label className="label block mb-1">id do lead *</label><input className="input font-mono w-64" value={id} onChange={e => { setId(e.target.value); setConfirm(false) }} placeholder="api_1712345678" /></div>
      <button onClick={run} disabled={loading || !id}
        className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${confirm ? 'bg-red-600 hover:bg-red-700 text-[#1F2D3D]' : 'btn-secondary'}`}>
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={13} />}
        {loading ? 'Deletando…' : confirm ? 'Confirmar deleção?' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GET /rest/v1/users
// ════════════════════════════════════════════════════════════════════════════
function GetUsers({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [tipo, setTipo] = useState('')
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setRes(null)
    const params = new URLSearchParams({ select: 'id,nome,email,tipo,vendedor_vinculado' })
    if (tipo) params.set('tipo', `eq.${tipo}`)
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/users?${params}`, { headers: HEADERS })
      setRes({ status: r.status, body: await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  return (
    <Endpoint method="GET" path="/rest/v1/users" summary="Listar usuários" icon={<List size={14} className="text-blue-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Retorna usuários do sistema (sem a senha).</p>
      <div className="mb-3 w-48">
        <label className="label block mb-1">tipo</label>
        <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">— todos —</option>
          <option>admin</option><option>vendedor</option><option>sdr</option>
        </select>
      </div>
      <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Buscando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// POST /rest/v1/anotacoes
// ════════════════════════════════════════════════════════════════════════════
function PostAnotacao({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [leadId, setLeadId] = useState('')
  const [userId, setUserId] = useState('u1')
  const [texto, setTexto] = useState('')
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setRes(null)
    const body = { id: `a${Date.now()}`, lead_id: leadId, usuario_id: userId, texto, created_at: new Date().toISOString() }
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/anotacoes`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
      setRes({ status: r.status, body: await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  return (
    <Endpoint method="POST" path="/rest/v1/anotacoes" summary="Criar anotação" icon={<FileText size={14} className="text-emerald-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Adiciona uma anotação a um lead existente.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div><label className="label block mb-1">lead_id *</label><input className="input font-mono" value={leadId} onChange={e => setLeadId(e.target.value)} placeholder="l1" /></div>
        <div><label className="label block mb-1">usuario_id *</label><input className="input font-mono" value={userId} onChange={e => setUserId(e.target.value)} placeholder="u1" /></div>
        <div className="col-span-2"><label className="label block mb-1">texto *</label><textarea className="input resize-none" rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Conteúdo da anotação..." /></div>
      </div>
      <button onClick={run} disabled={loading || !leadId || !texto} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Enviando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GET /rest/v1/historico_movimentacoes
// ════════════════════════════════════════════════════════════════════════════
function GetHistorico({ BASE_URL, HEADERS }: { BASE_URL: string; HEADERS: Record<string, string> }) {
  const [leadId, setLeadId] = useState('')
  const [res, setRes] = useState<{ status: number; body: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setRes(null)
    const params = new URLSearchParams({ select: '*', order: 'data.desc' })
    if (leadId) params.set('lead_id', `eq.${leadId}`)
    try {
      const r = await fetch(`${BASE_URL}/rest/v1/historico_movimentacoes?${params}`, { headers: HEADERS })
      setRes({ status: r.status, body: await r.json() })
    } catch (e) { setRes({ status: 0, body: String(e) }) }
    setLoading(false)
  }

  return (
    <Endpoint method="GET" path="/rest/v1/historico_movimentacoes" summary="Histórico de movimentações" icon={<History size={14} className="text-blue-500/60 flex-shrink-0" />}>
      <p className="text-xs text-text-muted mb-4">Retorna o histórico de movimentações do funil. Filtre por lead_id para ver o trajeto de um lead específico.</p>
      <div className="mb-3 w-56"><label className="label block mb-1">lead_id</label><input className="input font-mono" value={leadId} onChange={e => setLeadId(e.target.value)} placeholder="l1 (opcional)" /></div>
      <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
        {loading ? 'Buscando…' : 'Executar'}
      </button>
      <ResponseBox res={res} />
    </Endpoint>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// cURL Quick Reference
// ════════════════════════════════════════════════════════════════════════════
function CurlReference({ BASE_URL, ANON_KEY }: { BASE_URL: string; ANON_KEY: string }) {
  const short = ANON_KEY.slice(0, 20) + '…'
  const examples = [
    {
      label: 'Criar lead (todos os campos obrigatórios)',
      code: `curl -X POST '${BASE_URL}/rest/v1/leads' \\
  -H 'apikey: ${short}' \\
  -H 'Authorization: Bearer ${short}' \\
  -H 'Content-Type: application/json' \\
  -H 'Prefer: return=representation' \\
  -d '{
  "nome": "Maria Silva",
  "telefone": "(11) 99999-0000",
  "vendedor_id": "u2",
  "valor_estimado": 4800,
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "campanha_q2",
  "utm_content": "video_depoimento",
  "utm_term": "correpool crm",
  "utm_anuncio": "AD-VDC-001",
  "utm_posicionamento": "feed",
  "temperatura": "frio",
  "status_funil": "trafego_pago",
  "data_criacao": "2024-04-10",
  "reuniao_agendada": false,
  "email": ""
}'`,
    },
    {
      label: 'Listar leads fechados',
      code: `curl '${BASE_URL}/rest/v1/leads?status_funil=eq.fechado&select=id,nome,valor_contrato' \\
  -H 'apikey: ${short}' \\
  -H 'Authorization: Bearer ${short}'`,
    },
    {
      label: 'Atualizar status de um lead',
      code: `curl -X PATCH '${BASE_URL}/rest/v1/leads?id=eq.l1' \\
  -H 'apikey: ${short}' \\
  -H 'Authorization: Bearer ${short}' \\
  -H 'Content-Type: application/json' \\
  -d '{"status_funil":"agendado","temperatura":"quente"}'`,
    },
  ]

  return (
    <div className="card p-5 space-y-4">
      <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Code2 size={14} className="text-blue-400" /> Referência rápida — cURL
        <span className="text-[10px] text-[#6B7C93] font-normal ml-1">(chave truncada para exibição)</span>
      </p>
      {examples.map((ex) => (
        <div key={ex.label}>
          <p className="text-[11px] text-[#6B7C93] mb-1.5 font-medium">{ex.label}</p>
          <div className="relative rounded-lg overflow-hidden" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
            <div className="absolute top-2 right-2"><CopyBtn text={ex.code.replace(short, ANON_KEY)} /></div>
            <pre className="p-3 pr-10 text-[11px] font-mono text-[#374151] overflow-x-auto whitespace-pre-wrap leading-relaxed">{ex.code}</pre>
          </div>
        </div>
      ))}
    </div>
  )
}
