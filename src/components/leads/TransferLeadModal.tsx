'use client'

import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'
import type { Lead, User } from '@/types'
import { cn } from '@/lib/utils'

interface TransferLeadModalProps {
  lead: Lead
  vendedores: User[]
  onConfirm: (newVendedorId: string) => void
  onClose: () => void
}

export default function TransferLeadModal({ lead, vendedores, onConfirm, onClose }: TransferLeadModalProps) {
  const [selectedId, setSelectedId] = useState('')

  const vendedoresAtivos = vendedores.filter(
    (v) => v.tipo === 'vendedor' && v.ativo !== false && v.id !== lead.vendedor_id
  )

  const vendedorAtual = vendedores.find((v) => v.id === lead.vendedor_id)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0E6ED]">
          <h2 className="text-base font-semibold text-[#1F2D3D] flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-indigo-500" />
            Transferir Lead
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5F7FA] text-[#6B7C93] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#6B7C93] mb-1">Lead</p>
            <p className="text-sm font-semibold text-[#1F2D3D]">{lead.nome}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B7C93] mb-1">Vendedor atual</p>
            <p className="text-sm text-[#374151]">{vendedorAtual?.nome ?? '—'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6B7C93] block mb-1.5">Transferir para *</label>
            <select
              className="input w-full text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Selecionar vendedor...</option>
              {vendedoresAtivos.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancelar</button>
            <button
              onClick={() => selectedId && onConfirm(selectedId)}
              disabled={!selectedId}
              className={cn(
                'flex-1 text-sm px-4 py-2 rounded-lg font-semibold transition-colors',
                selectedId
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-[#E0E6ED] text-[#A0AEC0] cursor-not-allowed'
              )}
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
