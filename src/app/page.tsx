'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useApp } from '@/contexts/AppContext'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const { login } = useApp()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    const tipo = await login(email, senha)
    setLoading(false)
    if (tipo) {
      router.push(tipo === 'marketing' ? '/marketing' : '/dashboard')
    } else {
      setError('Email ou senha incorretos.')
    }
  }

  const DEMO_ACCOUNTS = [
    { label: 'Admin',    email: 'admin@correpool.com' },
    { label: 'Vendedor', email: 'carlos@correpool.com' },
    { label: 'SDR',      email: 'pedro@correpool.com' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #F5F7FA 0%, #FFFFFF 50%, #E8F8F0 100%)' }}>

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #2FBF71 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #2FBF71 0%, transparent 60%)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-5">
            <Image
              src="/logo.png"
              alt="Modo Corre"
              width={400}
              height={140}
              className="object-contain"
              style={{ maxHeight: '140px' }}
              priority
            />
          </div>
          <p className="text-[#6B7C93] text-sm mt-1">Gestão inteligente de leads e marketing</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 shadow-xl"
          style={{ background: '#FFFFFF', border: '1px solid #E0E6ED' }}>
          <h2 className="text-base font-semibold text-[#1F2D3D] mb-5">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label block mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#6B7C93] transition-colors"
                  onClick={() => setShowSenha(!showSenha)}
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm px-3 py-2.5 rounded-lg"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-white transition-all duration-150"
              style={{
                background: loading ? '#1E8E5A' : 'linear-gradient(135deg, #2FBF71 0%, #1E8E5A 100%)',
                boxShadow: '0 2px 12px rgba(47,191,113,0.35)',
              }}
              disabled={loading}
            >
              {loading && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E0E6ED' }}>
            <p className="text-[11px] text-[#A0AEC0] mb-3 font-medium text-center">Contas demo — senha: 123456</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setSenha('123456') }}
                  className="text-center px-2 py-2 rounded-lg transition-all duration-150 hover:shadow-sm"
                  style={{ background: '#F5F7FA', border: '1px solid #E0E6ED' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E8F8F0'
                    e.currentTarget.style.borderColor = '#2FBF71'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F5F7FA'
                    e.currentTarget.style.borderColor = '#E0E6ED'
                  }}
                >
                  <p className="text-xs font-semibold text-[#1F2D3D]">{acc.label}</p>
                  <p className="text-[10px] text-[#A0AEC0] mt-0.5 truncate">{acc.email.split('@')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#A0AEC0] mt-5">
          CorrePool CRM v1.0 &mdash; Todos os dados são simulados
        </p>
      </div>
    </div>
  )
}
