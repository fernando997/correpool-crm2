'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useApp } from '@/contexts/AppContext'
import type { Meta, Lead, User } from '@/types'
import { formatCurrency } from '@/lib/utils'
import {
  Trophy, Plus, X, Edit2, Trash2, CheckCircle, Circle,
  Crown, Target, AlertCircle, TrendingUp, Star, Medal,
  ChevronRight, Zap,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MES_NOMES: Record<string, string> = {
  '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho',
  '07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro',
}

function fmtMes(mes: string) {
  const [ano, m] = mes.split('-')
  return `${MES_NOMES[m] ?? m} ${ano}`
}

function receitaVendedor(leads: Lead[], vendedorId: string, mes: string) {
  return leads
    .filter((l) => l.vendedor_id === vendedorId && l.status_funil === 'fechado' && l.data_criacao.startsWith(mes))
    .reduce((s, l) => s + (l.valor_fechado ?? l.valor_contrato ?? 0), 0)
}

function computeRanking(leads: Lead[], users: User[], meta: Meta) {
  return users
    .filter((u) => u.tipo === 'vendedor' && u.ativo !== false)
    .map((v) => {
      const receita = receitaVendedor(leads, v.id, meta.mes)
      const pct = meta.meta_receita > 0 ? Math.min((receita / meta.meta_receita) * 100, 100) : 0
      return { id: v.id, nome: v.nome, receita, pct, qualificado: receita >= meta.minimo_participar }
    })
    .sort((a, b) => b.receita - a.receita)
}

function emptyForm(): Omit<Meta, 'id' | 'created_at'> {
  const now = new Date()
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    titulo: '', mes,
    meta_receita: 0, premio_1_descricao: '', premio_1_valor: 0,
    premio_2_descricao: '', premio_2_valor: 0, minimo_participar: 0,
    criterios: '', ativa: true,
  }
}

// ── Modal criação/edição ──────────────────────────────────────────────────────

function MetaFormModal({ initial, onClose, onSave }: {
  initial: Omit<Meta, 'id' | 'created_at'>
  onClose: () => void
  onSave: (m: Omit<Meta, 'id' | 'created_at'>) => Promise<void>
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSave(form); setSaving(false); onClose()
  }

  const inp = 'w-full rounded-lg px-3 py-2 text-sm text-[#1F2D3D] outline-none'
  const inpStyle = { background: '#F5F7FA', border: '1px solid #E0E6ED' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#FFFFFF', border: '1px solid #E0E6ED', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #E0E6ED', background: '#F5F7FA' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Trophy size={15} className="text-white" />
            </div>
            <h2 className="text-base font-bold text-[#1F2D3D]">{initial.titulo ? 'Editar Meta' : 'Nova Meta'}</h2>
          </div>
          <button onClick={onClose} className="text-[#6B7C93] hover:text-[#1F2D3D]"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-1.5">Título da Meta</label>
              <input className={inp} style={inpStyle} required placeholder="Ex: Meta de Abril 2025"
                value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-1.5">Mês</label>
              <input type="month" className={inp} style={inpStyle} required
                value={form.mes} onChange={(e) => set('mes', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-1.5">Meta de Receita por Vendedor (R$)</label>
            <input type="number" min="0" step="1000" className={inp} style={inpStyle} required placeholder="200000"
              value={form.meta_receita || ''} onChange={(e) => set('meta_receita', parseFloat(e.target.value) || 0)} />
            <p className="text-[11px] text-[#A0AEC0] mt-1">Valor que cada vendedor precisa atingir para bater a meta</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-1.5">Mínimo para Concorrer ao Prêmio (R$)</label>
            <input type="number" min="0" step="1000" className={inp} style={inpStyle} placeholder="70000"
              value={form.minimo_participar || ''} onChange={(e) => set('minimo_participar', parseFloat(e.target.value) || 0)} />
          </div>

          <div className="rounded-xl p-4 space-y-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="text-xs font-bold text-[#92400E] uppercase tracking-wider flex items-center gap-2">
              <Crown size={13} /> Prêmios
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7C93] mb-1.5">🥇 1° Lugar — Descrição</label>
                <input className={inp} style={inpStyle} placeholder="Ex: Viagem para o Caribe"
                  value={form.premio_1_descricao} onChange={(e) => set('premio_1_descricao', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7C93] mb-1.5">Valor (R$)</label>
                <input type="number" min="0" step="100" className={inp} style={inpStyle} placeholder="5000"
                  value={form.premio_1_valor || ''} onChange={(e) => set('premio_1_valor', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7C93] mb-1.5">🥈 2° Lugar — Descrição</label>
                <input className={inp} style={inpStyle} placeholder="Ex: R$ 3.000 em bônus"
                  value={form.premio_2_descricao} onChange={(e) => set('premio_2_descricao', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7C93] mb-1.5">Valor (R$)</label>
                <input type="number" min="0" step="100" className={inp} style={inpStyle} placeholder="3000"
                  value={form.premio_2_valor || ''} onChange={(e) => set('premio_2_valor', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-1.5">Critérios e Regras</label>
            <textarea rows={3} className={inp} style={{ ...inpStyle, resize: 'none' }}
              placeholder="Ex: Apenas contratos com valor acima de R$ 5.000..."
              value={form.criterios} onChange={(e) => set('criterios', e.target.value)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>
            <div>
              <p className="text-sm font-semibold text-[#1F2D3D]">Meta ativa</p>
              <p className="text-xs text-[#6B7C93]">Vendedores visualizam metas ativas no painel</p>
            </div>
            <button type="button" onClick={() => set('ativa', !form.ativa)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{ background: form.ativa ? '#2FBF71' : '#E0E6ED' }}>
              <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: form.ativa ? '22px' : '2px' }} />
            </button>
          </div>

          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #E0E6ED' }}>
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[#6B7C93]"
              style={{ border: '1px solid #E0E6ED' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white gradient-brand"
              style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── View do VENDEDOR ──────────────────────────────────────────────────────────

function VendedorMetaView({ meta, leads, users, vendedorId }: {
  meta: Meta; leads: Lead[]; users: User[]; vendedorId: string
}) {
  const [tick, setTick] = useState(0)
  const ranking = computeRanking(leads, users, meta)
  const minha = ranking.find((r) => r.id === vendedorId)
  const receita = minha?.receita ?? 0
  const pct = minha?.pct ?? 0
  const pos = ranking.findIndex((r) => r.id === vendedorId) + 1
  const falta = Math.max(meta.meta_receita - receita, 0)
  const faltaQual = Math.max(meta.minimo_participar - receita, 0)
  const bateu = receita >= meta.meta_receita
  const qualificado = meta.minimo_participar === 0 || receita >= meta.minimo_participar
  const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}°`

  const msgs = [
    bateu ? '🎉 Parabéns! Você bateu a meta!' : `🎯 Faltam ${formatCurrency(falta)} para bater a meta`,
    qualificado ? '✅ Você está qualificado para concorrer ao prêmio' : `⚠️ Faltam ${formatCurrency(faltaQual)} para se qualificar`,
    pos === 1 ? '🏆 Você é o líder! Continue assim!' : `🚀 Você está em ${pos}° lugar — siga em frente!`,
    meta.premio_1_descricao ? `🥇 1° lugar: ${meta.premio_1_descricao}${meta.premio_1_valor > 0 ? ` + ${formatCurrency(meta.premio_1_valor)}` : ''}` : null,
    meta.premio_2_descricao ? `🥈 2° lugar: ${meta.premio_2_descricao}${meta.premio_2_valor > 0 ? ` + ${formatCurrency(meta.premio_2_valor)}` : ''}` : null,
  ].filter(Boolean) as string[]

  useEffect(() => {
    const t = setInterval(() => setTick((i) => (i + 1) % msgs.length), 4500)
    return () => clearInterval(t)
  }, [msgs.length])

  return (
    <div className="space-y-5">
      {/* Hero card — progresso individual */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #FDE68A', boxShadow: '0 4px 20px rgba(245,158,11,0.15)' }}>

        {/* Header dourado */}
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #92400E 0%, #B45309 50%, #D97706 100%)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={18} className="text-amber-200" />
                <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">{fmtMes(meta.mes)}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{meta.titulo}</h2>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-amber-200 font-medium mb-1">Sua posição</p>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white"
                style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
                {medalha}
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-amber-200 mb-1.5">
              <span className="font-bold">{formatCurrency(receita)} vendidos</span>
              <span>{pct.toFixed(1)}%</span>
              <span>Meta: {formatCurrency(meta.meta_receita)}</span>
            </div>
            <div className="h-4 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-4 rounded-full transition-all duration-700 relative overflow-hidden"
                style={{ width: `${pct}%`, background: bateu ? '#2FBF71' : 'linear-gradient(90deg,#FCD34D,#F59E0B)' }}>
                <div className="absolute inset-0 opacity-20"
                  style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.4) 4px,rgba(255,255,255,0.4) 8px)' }} />
              </div>
              {bateu && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">META BATIDA!</span>
                </div>
              )}
            </div>
          </div>
          {!bateu && (
            <p className="text-xs text-amber-200 text-center">Faltam <strong className="text-white">{formatCurrency(falta)}</strong> para bater a meta</p>
          )}
        </div>

        {/* Ticker */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ background: '#FFFBEB', borderTop: '1px solid #FDE68A' }}>
          <Zap size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <p className="text-xs font-semibold text-amber-800 flex-1 truncate"
            style={{ transition: 'opacity 0.4s' }} key={tick}>
            {msgs[tick]}
          </p>
          <div className="flex gap-1">
            {msgs.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === tick ? '#F59E0B' : '#FDE68A' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Grid de KPIs individuais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Receita do Mês', v: formatCurrency(receita), color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: Trophy },
          { label: 'Meta Individual', v: formatCurrency(meta.meta_receita), color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: Target },
          { label: 'Falta Para Meta', v: falta > 0 ? formatCurrency(falta) : 'Batida!', color: falta > 0 ? '#DC2626' : '#2FBF71', bg: falta > 0 ? '#FEF2F2' : '#F0FDF4', border: falta > 0 ? '#FECACA' : '#BBF7D0', icon: TrendingUp },
          { label: 'Posição no Ranking', v: `${pos}° lugar`, color: pos <= 2 ? '#F59E0B' : '#6B7C93', bg: pos <= 2 ? '#FFFBEB' : '#F5F7FA', border: pos <= 2 ? '#FDE68A' : '#E0E6ED', icon: Star },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-4" style={{ background: k.bg, border: `1px solid ${k.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${k.color}20` }}>
                <k.icon size={13} style={{ color: k.color }} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: k.color }}>{k.label}</p>
            </div>
            <p className="text-lg font-extrabold" style={{ color: k.color }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Qualificação */}
      {meta.minimo_participar > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: qualificado ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${qualificado ? '#BBF7D0' : '#FECACA'}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: qualificado ? '#2FBF71' : '#DC2626' }}>
            {qualificado
              ? <CheckCircle size={20} className="text-white" />
              : <AlertCircle size={20} className="text-white" />}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: qualificado ? '#15803D' : '#B91C1C' }}>
              {qualificado ? 'Qualificado para o prêmio!' : 'Ainda não qualificado'}
            </p>
            <p className="text-xs" style={{ color: qualificado ? '#16A34A' : '#DC2626' }}>
              {qualificado
                ? `Você atingiu o mínimo de ${formatCurrency(meta.minimo_participar)} — continue vendendo para subir no ranking!`
                : `Faltam ${formatCurrency(faltaQual)} para atingir o mínimo de ${formatCurrency(meta.minimo_participar)}`}
            </p>
          </div>
        </div>
      )}

      {/* Prêmios */}
      {(meta.premio_1_descricao || meta.premio_2_descricao) && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #FDE68A' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
            <Crown size={14} style={{ color: '#F59E0B' }} />
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Prêmios Disponíveis</p>
          </div>
          <div className="divide-y" style={{ background: '#FFFFFF' }}>
            {meta.premio_1_descricao && (
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>🥇</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1F2D3D]">1° Lugar</p>
                  <p className="text-sm text-[#6B7C93]">{meta.premio_1_descricao}</p>
                </div>
                {meta.premio_1_valor > 0 && (
                  <p className="text-base font-extrabold" style={{ color: '#F59E0B' }}>{formatCurrency(meta.premio_1_valor)}</p>
                )}
              </div>
            )}
            {meta.premio_2_descricao && (
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}>🥈</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1F2D3D]">2° Lugar</p>
                  <p className="text-sm text-[#6B7C93]">{meta.premio_2_descricao}</p>
                </div>
                {meta.premio_2_valor > 0 && (
                  <p className="text-base font-extrabold text-[#6B7C93]">{formatCurrency(meta.premio_2_valor)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranking geral */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
          <Medal size={14} style={{ color: '#6B7C93' }} />
          <p className="text-xs font-bold text-[#1F2D3D] uppercase tracking-wider">Ranking do Time</p>
        </div>
        <div className="divide-y">
          {ranking.map((v, idx) => {
            const isMine = v.id === vendedorId
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`
            return (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3.5"
                style={{ background: isMine ? '#FFFBEB' : '#FFFFFF' }}>
                <div className="w-8 text-center text-base flex-shrink-0 font-bold"
                  style={{ color: isMine ? '#F59E0B' : '#A0AEC0' }}>
                  {medal}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-[#1F2D3D] flex items-center gap-1.5">
                      {v.nome}
                      {isMine && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FDE68A', color: '#92400E' }}>Você</span>}
                    </p>
                    <p className="text-sm font-bold ml-2" style={{ color: idx === 0 ? '#F59E0B' : '#1F2D3D' }}>
                      {formatCurrency(v.receita)}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#EEF1F5' }}>
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${v.pct}%`, background: isMine ? '#F59E0B' : idx === 0 ? '#2FBF71' : '#CBD5E1' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Critérios */}
      {meta.criterios && (
        <div className="rounded-xl p-4" style={{ background: '#F8FBFF', border: '1px solid #BAE6FD' }}>
          <p className="text-xs font-bold text-[#0284C7] uppercase tracking-wider mb-2">Regras e Critérios</p>
          <p className="text-sm text-[#0369A1] leading-relaxed">{meta.criterios}</p>
        </div>
      )}
    </div>
  )
}

// ── View do ADMIN ─────────────────────────────────────────────────────────────

function AdminRankingCard({ meta, leads, users }: { meta: Meta; leads: Lead[]; users: User[] }) {
  const ranking = computeRanking(leads, users, meta)
  const best = ranking[0]?.receita ?? 0
  const metaTotalPct = meta.meta_receita > 0 ? Math.min((best / meta.meta_receita) * 100, 100) : 0

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E6ED' }}>
      <div className="px-5 py-4 gradient-brand">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{fmtMes(meta.mes)}</p>
            <h3 className="text-lg font-bold text-white">{meta.titulo}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/70">Meta Individual</p>
            <p className="text-xl font-extrabold text-white">{formatCurrency(meta.meta_receita)}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/70 mb-1">
            <span>Melhor resultado vs meta</span><span>{metaTotalPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="h-2 rounded-full bg-white" style={{ width: `${metaTotalPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #E0E6ED' }}>
        <div className="px-4 py-3" style={{ borderRight: '1px solid #E0E6ED' }}>
          <p className="text-[10px] text-[#A0AEC0] font-semibold uppercase tracking-wider">🥇 1° Lugar</p>
          <p className="text-sm font-bold text-[#1F2D3D]">{meta.premio_1_descricao || '—'}</p>
          {meta.premio_1_valor > 0 && <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>+ {formatCurrency(meta.premio_1_valor)}</p>}
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-[#A0AEC0] font-semibold uppercase tracking-wider">🥈 2° Lugar</p>
          <p className="text-sm font-bold text-[#1F2D3D]">{meta.premio_2_descricao || '—'}</p>
          {meta.premio_2_valor > 0 && <p className="text-xs font-bold text-[#6B7C93]">+ {formatCurrency(meta.premio_2_valor)}</p>}
        </div>
      </div>

      <div className="divide-y">
        {ranking.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-[#A0AEC0]">Nenhum vendedor ainda</div>
        )}
        {ranking.map((v, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`
          const cor = idx === 0 ? '#F59E0B' : idx === 1 ? '#9CA3AF' : '#CBD5E1'
          return (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-8 text-center text-base flex-shrink-0">{medal}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-[#1F2D3D] truncate">{v.nome}</p>
                  <div className="flex items-center gap-2 ml-2">
                    {v.qualificado
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#E8F8F0', color: '#2FBF71' }}>Qualif.</span>
                      : meta.minimo_participar > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>Abaixo</span>
                    }
                    <p className="text-sm font-bold" style={{ color: idx === 0 ? '#F59E0B' : '#1F2D3D' }}>{formatCurrency(v.receita)}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: '#EEF1F5' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${v.pct}%`, background: cor }} />
                </div>
                <p className="text-[10px] text-[#A0AEC0] mt-0.5">{v.pct.toFixed(1)}% da meta</p>
              </div>
            </div>
          )
        })}
      </div>

      {meta.minimo_participar > 0 && (
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#F5F7FA', borderTop: '1px solid #E0E6ED' }}>
          <AlertCircle size={13} style={{ color: '#6B7C93' }} />
          <p className="text-xs text-[#6B7C93]">Mínimo para concorrer: <strong>{formatCurrency(meta.minimo_participar)}</strong></p>
        </div>
      )}
      {meta.criterios && (
        <div className="px-5 py-3" style={{ background: '#F8FBFF', borderTop: '1px solid #E0E6ED' }}>
          <p className="text-[10px] font-bold text-[#6B7C93] uppercase tracking-wider mb-1">Critérios</p>
          <p className="text-xs text-[#6B7C93] leading-relaxed">{meta.criterios}</p>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MetasPage() {
  const { leads, users, metas, addMeta, updateMeta, deleteMeta, currentUser } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Meta | null>(null)

  const isAdmin = currentUser?.tipo === 'admin'
  const isVendedor = currentUser?.tipo === 'vendedor'

  const metaAtiva = metas.find((m) => m.ativa)
  const metasInativas = metas.filter((m) => !m.ativa).sort((a, b) => b.mes.localeCompare(a.mes))

  async function handleSave(form: Omit<Meta, 'id' | 'created_at'>) {
    if (editingMeta) await updateMeta(editingMeta.id, form)
    else await addMeta(form)
    setEditingMeta(null)
  }

  async function toggleAtiva(meta: Meta) {
    if (!meta.ativa) {
      for (const m of metas.filter((x) => x.ativa && x.id !== meta.id)) {
        await updateMeta(m.id, { ativa: false })
      }
    }
    await updateMeta(meta.id, { ativa: !meta.ativa })
  }

  // ── View do vendedor ──────────────────────────────────────────────────────
  if (isVendedor) {
    return (
      <AppShell>
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-5 min-h-screen" style={{ background: '#F5F7FA' }}>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2D3D] tracking-tight flex items-center gap-2">
              <Trophy size={22} style={{ color: '#F59E0B' }} /> Minhas Metas
            </h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">Acompanhe seu progresso e os prêmios disponíveis</p>
          </div>

          {metaAtiva ? (
            <VendedorMetaView
              meta={metaAtiva}
              leads={leads}
              users={users}
              vendedorId={currentUser!.id}
            />
          ) : (
            <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '2px dashed #E0E6ED' }}>
              <Trophy size={40} className="mx-auto mb-3" style={{ color: '#FDE68A' }} />
              <p className="text-base font-semibold text-[#6B7C93]">Nenhuma meta ativa no momento</p>
              <p className="text-sm text-[#A0AEC0] mt-1">O administrador ainda não definiu metas para este período.</p>
            </div>
          )}

          {metasInativas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[#6B7C93] uppercase tracking-wider">Metas Anteriores</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metasInativas.map((meta) => {
                  const receita = receitaVendedor(leads, currentUser!.id, meta.mes)
                  const pct = meta.meta_receita > 0 ? Math.min((receita / meta.meta_receita) * 100, 100) : 0
                  const bateu = receita >= meta.meta_receita
                  return (
                    <div key={meta.id} className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                        <div>
                          <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider">{fmtMes(meta.mes)}</p>
                          <p className="text-sm font-bold text-[#1F2D3D]">{meta.titulo}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: bateu ? '#F0FDF4' : '#FEF2F2', color: bateu ? '#15803D' : '#B91C1C' }}>
                          {bateu ? 'Meta batida!' : 'Não atingida'}
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#6B7C93]">Resultado</span>
                          <span className="font-bold text-[#1F2D3D]">{formatCurrency(receita)}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#EEF1F5' }}>
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: bateu ? '#2FBF71' : '#F59E0B' }} />
                        </div>
                        <p className="text-[10px] text-[#A0AEC0]">{pct.toFixed(0)}% de {formatCurrency(meta.meta_receita)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    )
  }

  // ── View do admin ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen" style={{ background: '#F5F7FA' }}>
          <p className="text-[#6B7C93]">Acesso não disponível para este perfil.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 min-h-screen" style={{ background: '#F5F7FA' }}>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2D3D] tracking-tight flex items-center gap-2">
              <Trophy size={22} style={{ color: '#F59E0B' }} /> Metas & Prêmios
            </h1>
            <p className="text-sm text-[#6B7C93] mt-0.5">Defina metas, prêmios e rankings para motivar a equipe</p>
          </div>
          <button onClick={() => { setEditingMeta(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white gradient-brand"
            style={{ boxShadow: '0 2px 8px rgba(47,191,113,0.3)' }}>
            <Plus size={16} /> Nova Meta
          </button>
        </div>

        {metaAtiva ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#2FBF71' }} />
                <h2 className="text-sm font-bold text-[#1F2D3D]">Meta Ativa</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingMeta(metaAtiva); setShowModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6B7C93]"
                  style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                  <Edit2 size={12} /> Editar
                </button>
                <button onClick={() => toggleAtiva(metaAtiva)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <Circle size={12} /> Desativar
                </button>
              </div>
            </div>
            <AdminRankingCard meta={metaAtiva} leads={leads} users={users} />
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '2px dashed #E0E6ED' }}>
            <Trophy size={32} className="mx-auto mb-3" style={{ color: '#E0E6ED' }} />
            <p className="text-base font-semibold text-[#6B7C93]">Nenhuma meta ativa</p>
            <p className="text-sm text-[#A0AEC0] mt-1 mb-4">Crie uma meta para motivar sua equipe</p>
            <button onClick={() => { setEditingMeta(null); setShowModal(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white gradient-brand">
              <Plus size={14} /> Criar primeira meta
            </button>
          </div>
        )}

        {metasInativas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#1F2D3D]">Histórico de Metas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metasInativas.map((meta) => {
                const ranking = computeRanking(leads, users, meta)
                const top = ranking[0]
                return (
                  <div key={meta.id} className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
                      <div>
                        <p className="text-[10px] text-[#A0AEC0] uppercase tracking-wider">{fmtMes(meta.mes)}</p>
                        <p className="text-sm font-bold text-[#1F2D3D]">{meta.titulo}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingMeta(meta); setShowModal(true) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7C93]"
                          style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => toggleAtiva(meta)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: '#E8F8F0', border: '1px solid #BBF7D0', color: '#2FBF71' }}>
                          <CheckCircle size={12} />
                        </button>
                        <button onClick={() => setConfirmDelete(meta)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400"
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-[#6B7C93]">Meta</span>
                        <span className="text-sm font-bold text-[#1F2D3D]">{formatCurrency(meta.meta_receita)}</span>
                      </div>
                      {top && (
                        <div className="flex justify-between">
                          <span className="text-xs text-[#6B7C93]">🥇 {top.nome}</span>
                          <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(top.receita)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Hint SQL */}
        <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
          <AlertCircle size={15} style={{ color: '#0284C7', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-bold text-[#0284C7]">Supabase — Execute no SQL Editor</p>
            <code className="text-[10px] text-[#075985] font-mono mt-1 block leading-relaxed">
              CREATE TABLE IF NOT EXISTS metas (id TEXT PRIMARY KEY, titulo TEXT NOT NULL, mes TEXT NOT NULL, meta_receita NUMERIC DEFAULT 0, premio_1_descricao TEXT DEFAULT &apos;&apos;, premio_1_valor NUMERIC DEFAULT 0, premio_2_descricao TEXT DEFAULT &apos;&apos;, premio_2_valor NUMERIC DEFAULT 0, minimo_participar NUMERIC DEFAULT 0, criterios TEXT DEFAULT &apos;&apos;, ativa BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
              ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
              CREATE POLICY &quot;anon_all_metas&quot; ON metas FOR ALL TO anon USING (true) WITH CHECK (true);
            </code>
          </div>
        </div>
      </div>

      {showModal && (
        <MetaFormModal
          initial={editingMeta
            ? { titulo: editingMeta.titulo, mes: editingMeta.mes, meta_receita: editingMeta.meta_receita, premio_1_descricao: editingMeta.premio_1_descricao, premio_1_valor: editingMeta.premio_1_valor, premio_2_descricao: editingMeta.premio_2_descricao, premio_2_valor: editingMeta.premio_2_valor, minimo_participar: editingMeta.minimo_participar, criterios: editingMeta.criterios, ativa: editingMeta.ativa }
            : emptyForm()}
          onClose={() => { setShowModal(false); setEditingMeta(null) }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(31,45,61,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
            <h3 className="text-base font-bold text-[#1F2D3D] mb-2">Excluir meta?</h3>
            <p className="text-sm text-[#6B7C93] mb-5">A meta <strong>"{confirmDelete.titulo}"</strong> será removida.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-[#6B7C93]"
                style={{ border: '1px solid #E0E6ED' }}>Cancelar</button>
              <button onClick={async () => { await deleteMeta(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-red-500">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
