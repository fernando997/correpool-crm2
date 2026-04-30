'use client'

import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { X } from 'lucide-react'
import type { Temperatura } from '@/types'

export default function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { addLead, users, currentUser } = useApp()
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    observacao: '',
    vendedor_id: currentUser?.tipo === 'vendedor' ? currentUser.id : '',
    sdr_id: currentUser?.tipo === 'sdr' ? currentUser.id : '',
    temperatura: 'frio' as Temperatura,
    valor_estimado: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
  })

  const vendedores = users.filter((u) => u.tipo === 'vendedor')
  const sdrs = users.filter((u) => u.tipo === 'sdr')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await addLead({
      ...form,
      valor_estimado: form.valor_estimado || undefined,
      reuniao_agendada: false,
      status_funil: 'trafego_pago',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <h2 className="text-lg font-semibold text-[#1F2D3D]">Novo Lead</h2>
          <button onClick={onClose} className="text-[#6B7C93] hover:text-[#374151] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label block mb-1.5">Nome *</label>
              <input
                className="input"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="label block mb-1.5">Telefone *</label>
              <input
                className="input"
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <label className="label block mb-1.5">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="col-span-2">
              <label className="label block mb-1.5">Valor Estimado (R$)</label>
              <input
                className="input"
                type="text"
                value={form.valor_estimado}
                onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
                placeholder="Ex: De R$100 a R$200 mil"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-1.5">Vendedor *</label>
              <select
                className="input"
                required
                value={form.vendedor_id}
                onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}
              >
                <option value="">Selecionar...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">SDR</label>
              <select
                className="input"
                value={form.sdr_id}
                onChange={(e) => setForm({ ...form, sdr_id: e.target.value })}
              >
                <option value="">Selecionar...</option>
                {sdrs.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label block mb-1.5">Temperatura</label>
            <select
              className="input"
              value={form.temperatura}
              onChange={(e) => setForm({ ...form, temperatura: e.target.value as Temperatura })}
            >
              <option value="frio">Frio</option>
              <option value="morno">Morno</option>
              <option value="quente">Quente</option>
              <option value="muito_quente">Muito Quente</option>
              <option value="desqualificado">Desqualificado</option>
            </select>
          </div>

          <div className="pt-1 border-t border-[#E0E6ED]">
            <p className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">UTM Tracking</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1.5">utm_source</label>
                <input
                  className="input"
                  value={form.utm_source}
                  onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
                  placeholder="facebook"
                />
              </div>
              <div>
                <label className="label block mb-1.5">utm_medium</label>
                <input
                  className="input"
                  value={form.utm_medium}
                  onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
                  placeholder="cpc"
                />
              </div>
              <div>
                <label className="label block mb-1.5">utm_campaign</label>
                <input
                  className="input"
                  value={form.utm_campaign}
                  onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                  placeholder="nome_campanha"
                />
              </div>
              <div>
                <label className="label block mb-1.5">utm_content</label>
                <input
                  className="input"
                  value={form.utm_content}
                  onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                  placeholder="video_depoimento"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label block mb-1.5">Observacao</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Informacoes relevantes sobre o lead..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1">
              Criar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
