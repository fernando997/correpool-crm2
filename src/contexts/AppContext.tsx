'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type {
  User, Lead, Anotacao, HistoricoMovimentacao,
  StatusFunil, Alerta, Meta,
} from '@/types'
import { FUNIL_LABELS } from '@/types'
import { supabase } from '@/lib/supabase'
import { calcLeadScore, isLeadParado, isFollowupAtrasado } from '@/lib/utils'
import { MOCK_USERS, MOCK_LEADS, MOCK_ANOTACOES, MOCK_HISTORICO, CREDENTIALS } from '@/lib/mockData'
import { LEAD_ENHANCEMENTS } from '@/lib/leadEnhancements'

// Fallback: enriquece leads mock com campos de inteligência
function enrichLeads(rawLeads: Lead[]): Lead[] {
  return rawLeads.map((l) => {
    const enh = LEAD_ENHANCEMENTS[l.id] ?? {}
    const enriched: Lead = { ...l, ...enh }
    enriched.score_lead = calcLeadScore(enriched)
    return enriched
  })
}

const MOCK_ALERTAS_ESTATICOS: Alerta[] = [
  { id: 'alrt1', lead_id: 'l18', tipo: 'followup_atrasado', mensagem: 'Follow-up atrasado: Juliana Pereira parada no Follow-up 3 ha 4 dias', resolvido: false, created_at: '2024-03-25T08:00:00' },
  { id: 'alrt2', lead_id: 'l21', tipo: 'lead_parado', mensagem: 'Felipe Azevedo sem interacao ha 3 dias — risco de perda', resolvido: false, created_at: '2024-03-28T08:00:00' },
  { id: 'alrt3', lead_id: 'l24', tipo: 'followup_atrasado', mensagem: 'Follow-up atrasado: Tatiana Freitas no Follow-up 1 ha 2 dias', resolvido: false, created_at: '2024-03-28T09:00:00' },
  { id: 'alrt4', lead_id: 'l14', tipo: 'reuniao_proxima', mensagem: 'Reuniao com Leticia Campos amanha as 09h — confirme presenca', resolvido: false, created_at: '2024-04-01T07:00:00' },
  { id: 'alrt5', lead_id: 'l16', tipo: 'reuniao_proxima', mensagem: 'Reuniao com Vanessa Ramos em 2 dias as 14h — prepare a apresentacao', resolvido: false, created_at: '2024-04-02T09:00:00' },
  { id: 'alrt6', lead_id: 'l19', tipo: 'lead_parado', mensagem: 'Marcos Dias parado no Follow-up 3 ha 5 dias sem resposta', resolvido: false, created_at: '2024-03-27T08:00:00' },
  { id: 'alrt7', lead_id: 'l45', tipo: 'reuniao_proxima', mensagem: 'Reuniao com Rogerio Cunha (R$ 24.000 potencial) amanha as 09h', resolvido: false, created_at: '2024-04-04T09:00:00' },
]

interface AppContextType {
  currentUser: User | null
  login: (email: string, senha: string) => Promise<string | null> // retorna tipo do user ou null
  logout: () => void
  googleConnected: boolean
  refreshGoogleConnection: () => Promise<void>
  leads: Lead[]
  updateLead: (id: string, updates: Partial<Lead>) => void
  moveLead: (id: string, newStatus: StatusFunil, extra?: Partial<Lead>) => void
  addLead: (lead: Omit<Lead, 'id' | 'data_criacao'>) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  anotacoes: Anotacao[]
  addAnotacao: (anotacao: Omit<Anotacao, 'id' | 'created_at'>) => void
  deleteAnotacao: (id: string) => void
  updateAnotacao: (id: string, texto: string) => void
  historico: HistoricoMovimentacao[]
  users: User[]
  addUser: (user: Omit<User, 'id'>, senha?: string) => Promise<void>
  updateUser: (id: string, updates: Partial<Omit<User, 'id'>>, senha?: string) => Promise<void>
  toggleUserAtivo: (id: string) => Promise<void>
  alertas: Alerta[]
  resolveAlerta: (id: string) => void
  metas: Meta[]
  addMeta: (m: Omit<Meta, 'id' | 'created_at'>) => Promise<void>
  updateMeta: (id: string, updates: Partial<Meta>) => Promise<void>
  deleteMeta: (id: string) => Promise<void>
  loading: boolean
  downloadBackup: () => Promise<void>
  restoreFromBackup: (json: Lead[]) => Promise<void>
  importFromCRM: (importedLeads: Partial<Lead>[], vendedor_id: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [historico, setHistorico] = useState<HistoricoMovimentacao[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  // dbReady indica se as tabelas existem no Supabase
  const [dbReady, setDbReady] = useState(false)

  // Carga inicial — verifica DB, restaura sessão e carrega dados
  useEffect(() => {
    async function loadData() {
      // Sem env vars → cai direto no mock
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const saved = localStorage.getItem('crm_user')
        if (saved) setCurrentUser(JSON.parse(saved))
        setUsers(MOCK_USERS)
        setLeads(enrichLeads(MOCK_LEADS))
        setAnotacoes(MOCK_ANOTACOES)
        setHistorico(MOCK_HISTORICO)
        setAlertas(MOCK_ALERTAS_ESTATICOS)
        setMetas([{
          id: 'meta_demo', titulo: 'Meta de Abril 2024', mes: '2024-04',
          meta_receita: 200000, premio_1_descricao: 'Viagem para o Caribe', premio_1_valor: 5000,
          premio_2_descricao: 'Bônus em dinheiro', premio_2_valor: 3000, minimo_participar: 70000,
          criterios: 'Apenas contratos fechados no período de 01/04 a 30/04.',
          ativa: true, created_at: '2024-04-01T00:00:00',
        }])
        setLoading(false)
        return
      }

      let usersData = null, usersError = null
      let leadsData = null, anotacoesData = null, historicoData = null, alertasData = null, metasData = null

      try {
        const results = await Promise.all([
          supabase.from('users').select('id, nome, email, tipo, vendedor_vinculado, ativo'),
          supabase.from('leads').select('*'),
          supabase.from('anotacoes').select('*'),
          supabase.from('historico_movimentacoes').select('*'),
          supabase.from('alertas').select('*'),
          supabase.from('metas').select('*'),
        ])
        ;({ data: usersData, error: usersError } = results[0])
        ;({ data: leadsData } = results[1])
        ;({ data: anotacoesData } = results[2])
        ;({ data: historicoData } = results[3])
        ;({ data: alertasData } = results[4])
        ;({ data: metasData } = results[5])
      } catch (err) {
        console.error('[loadData] Supabase error — fallback to mock:', err)
        const saved = localStorage.getItem('crm_user')
        if (saved) setCurrentUser(JSON.parse(saved))
        setUsers(MOCK_USERS)
        setLeads(enrichLeads(MOCK_LEADS))
        setAnotacoes(MOCK_ANOTACOES)
        setHistorico(MOCK_HISTORICO)
        setAlertas(MOCK_ALERTAS_ESTATICOS)
        setMetas([{
          id: 'meta_demo', titulo: 'Meta de Abril 2024', mes: '2024-04',
          meta_receita: 200000, premio_1_descricao: 'Viagem para o Caribe', premio_1_valor: 5000,
          premio_2_descricao: 'Bônus em dinheiro', premio_2_valor: 3000, minimo_participar: 70000,
          criterios: 'Apenas contratos fechados no período de 01/04 a 30/04.',
          ativa: true, created_at: '2024-04-01T00:00:00',
        }])
        setLoading(false)
        return
      }

      const tabelasExistem = !usersError && usersData !== null

      if (!tabelasExistem) {
        // DB não configurado — modo demo com dados mock
        setUsers(MOCK_USERS)
        setLeads(enrichLeads(MOCK_LEADS))
        setAnotacoes(MOCK_ANOTACOES)
        setHistorico(MOCK_HISTORICO)
        setAlertas(MOCK_ALERTAS_ESTATICOS)
        setMetas([{
          id: 'meta_demo',
          titulo: 'Meta de Abril 2024',
          mes: '2024-04',
          meta_receita: 200000,
          premio_1_descricao: 'Viagem para o Caribe',
          premio_1_valor: 5000,
          premio_2_descricao: 'Bônus em dinheiro',
          premio_2_valor: 3000,
          minimo_participar: 70000,
          criterios: 'Apenas contratos fechados no período de 01/04 a 30/04. Leads criados antes do período não contam.',
          ativa: true,
          created_at: '2024-04-01T00:00:00',
        }])
        // Restaura sessão mock sem verificação
        const saved = localStorage.getItem('crm_user')
        if (saved) setCurrentUser(JSON.parse(saved))
        setLoading(false)
        return
      }

      // DB pronto — carrega dados reais
      setDbReady(true)

      const mappedUsers: User[] = (usersData ?? []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        nome: u.nome as string,
        email: u.email as string,
        tipo: u.tipo as User['tipo'],
        vendedorVinculado: (u.vendedor_vinculado as string) ?? undefined,
        ativo: u.ativo !== false,
      }))
      setUsers(mappedUsers)

      if (leadsData) {
        setLeads(
          leadsData.map((l: Record<string, unknown>) => {
            const lead = l as unknown as Lead
            lead.score_lead = calcLeadScore(lead)
            return lead
          })
        )
      }
      if (anotacoesData) setAnotacoes(anotacoesData as Anotacao[])
      if (historicoData) setHistorico(historicoData as HistoricoMovimentacao[])
      if (alertasData) setAlertas(alertasData as Alerta[])
      if (metasData) setMetas(metasData as Meta[])

      // Restaura sessão verificando se o usuário ainda existe no DB
      const saved = localStorage.getItem('crm_user')
      if (saved) {
        const storedUser = JSON.parse(saved) as User
        const dbUser = mappedUsers.find((u) => u.id === storedUser.id)
        if (dbUser) {
          setCurrentUser(dbUser) // usa dados frescos do DB
        } else {
          // Usuário não existe mais no banco — invalida sessão
          localStorage.removeItem('crm_user')
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // ── Realtime subscriptions ───────────────────────────────────
  useEffect(() => {
    if (!dbReady) return

    const channel = supabase
      .channel('crm-realtime')
      // Leads
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new as Lead
        lead.score_lead = calcLeadScore(lead)
        setLeads((prev) => prev.find((l) => l.id === lead.id) ? prev : [lead, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new as Lead
        lead.score_lead = calcLeadScore(lead)
        setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((prev) => prev.filter((l) => l.id !== (payload.old as Lead).id))
      })
      // Anotações
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anotacoes' }, (payload) => {
        const anot = payload.new as Anotacao
        setAnotacoes((prev) => prev.find((a) => a.id === anot.id) ? prev : [...prev, anot])
      })
      // Histórico
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico_movimentacoes' }, (payload) => {
        const h = payload.new as HistoricoMovimentacao
        setHistorico((prev) => prev.find((x) => x.id === h.id) ? prev : [...prev, h])
      })
      // Alertas
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, (payload) => {
        const alerta = payload.new as Alerta
        setAlertas((prev) => prev.find((a) => a.id === alerta.id) ? prev : [...prev, alerta])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alertas' }, (payload) => {
        const alerta = payload.new as Alerta
        setAlertas((prev) => prev.map((a) => a.id === alerta.id ? alerta : a))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dbReady])

  // Gera alertas dinâmicos quando leads mudam
  useEffect(() => {
    if (loading) return
    const now = new Date()
    const dynamicAlertas: Alerta[] = []

    leads.forEach((lead) => {
      if (lead.importado_externo) return
      if (['fechado', 'declinado'].includes(lead.status_funil)) return

      if (isFollowupAtrasado(lead)) {
        const id = `dyn_fu_${lead.id}`
        if (!alertas.find((a) => a.id === id && !a.resolvido)) {
          dynamicAlertas.push({
            id, lead_id: lead.id, tipo: 'followup_atrasado',
            mensagem: `Follow-up atrasado: ${lead.nome} em ${FUNIL_LABELS[lead.status_funil]}`,
            resolvido: false, created_at: now.toISOString(),
          })
        }
      } else if (isLeadParado(lead)) {
        const id = `dyn_par_${lead.id}`
        if (!alertas.find((a) => a.id === id && !a.resolvido)) {
          dynamicAlertas.push({
            id, lead_id: lead.id, tipo: 'lead_parado',
            mensagem: `${lead.nome} sem interacao — revise o contato`,
            resolvido: false, created_at: now.toISOString(),
          })
        }
      }

      if (lead.data_reuniao && lead.hora_reuniao && lead.status_funil === 'agendado') {
        const reuniaoTs = new Date(`${lead.data_reuniao}T${lead.hora_reuniao}`)
        const diff = (reuniaoTs.getTime() - now.getTime()) / 3_600_000
        if (diff >= 0 && diff <= 24) {
          const id = `dyn_reu_${lead.id}`
          if (!alertas.find((a) => a.id === id && !a.resolvido)) {
            dynamicAlertas.push({
              id, lead_id: lead.id, tipo: 'reuniao_proxima',
              mensagem: `Reuniao com ${lead.nome} em ${Math.ceil(diff)}h`,
              resolvido: false, created_at: now.toISOString(),
            })
          }
        }
      }
    })

    if (dynamicAlertas.length > 0) {
      setAlertas((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const truly_new = dynamicAlertas.filter((a) => !existingIds.has(a.id))
        return truly_new.length > 0 ? [...prev, ...truly_new] : prev
      })
    }
  }, [leads]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, senha: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, tipo, vendedor_vinculado, ativo')
      .eq('email', email)
      .eq('senha', senha)
      .maybeSingle()

    // Tabela não existe → banco não configurado → fallback mock
    if (error) {
      if (!dbReady) {
        const cred = CREDENTIALS.find((c) => c.email === email && c.senha === senha)
        if (!cred) return null
        const mockUser = MOCK_USERS.find((u) => u.id === cred.userId)
        if (!mockUser) return null
        setCurrentUser(mockUser)
        localStorage.setItem('crm_user', JSON.stringify(mockUser))
        return mockUser.tipo
      }
      return null
    }

    if (!data || data.ativo === false) return null

    // Busca campos Google separadamente — colunas podem não existir ainda
    let google_refresh_token: string | undefined
    let google_email: string | undefined
    try {
      const { data: gData } = await supabase
        .from('users')
        .select('google_refresh_token, google_email')
        .eq('id', data.id)
        .maybeSingle()
      if (gData) {
        google_refresh_token = (gData as Record<string, unknown>).google_refresh_token as string | undefined
        google_email = (gData as Record<string, unknown>).google_email as string | undefined
      }
    } catch { /* colunas não existem ainda — ignora */ }

    const user: User = {
      id: data.id,
      nome: data.nome,
      email: data.email,
      tipo: data.tipo,
      vendedorVinculado: data.vendedor_vinculado ?? undefined,
      ativo: data.ativo !== false,
      google_refresh_token,
      google_email,
    }
    setCurrentUser(user)
    localStorage.setItem('crm_user', JSON.stringify(user))
    return user.tipo
  }, [dbReady])

  const refreshGoogleConnection = useCallback(async () => {
    if (!currentUser) return
    try {
      const { data } = await supabase
        .from('users')
        .select('google_refresh_token, google_email')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (!data) return
      const updated: User = {
        ...currentUser,
        google_refresh_token: (data as Record<string, unknown>).google_refresh_token as string | undefined,
        google_email: (data as Record<string, unknown>).google_email as string | undefined,
      }
      setCurrentUser(updated)
      localStorage.setItem('crm_user', JSON.stringify(updated))
    } catch { /* colunas não existem ainda */ }
  }, [currentUser])

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('crm_user')
  }, [])

  // ── Leads ───────────────────────────────────────────────────────────────────
  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const updated = { ...l, ...updates }
        updated.score_lead = calcLeadScore(updated)
        updated.ultima_interacao_em = new Date().toISOString()
        return updated
      })
    )
    supabase.from('leads').update({ ...updates, ultima_interacao_em: new Date().toISOString() }).eq('id', id).then(({ error }) => {
      if (error) console.error('[updateLead] error:', error.message)
    })
  }, [])

  const moveLead = useCallback(
    (id: string, newStatus: StatusFunil, extra?: Partial<Lead>) => {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l

          const now = new Date().toISOString()

          const data_primeiro_contato =
            l.data_primeiro_contato ??
            (newStatus !== 'trafego_pago' ? now : undefined)

          const tempo_resposta_segundos =
            l.tempo_resposta_segundos ??
            (l.status_funil === 'trafego_pago' && newStatus !== 'trafego_pago' && data_primeiro_contato
              ? Math.floor(
                  (new Date(data_primeiro_contato).getTime() - new Date(l.data_criacao).getTime()) / 1000
                )
              : undefined)

          const updated: Lead = {
            ...l,
            ...extra,
            status_funil: newStatus,
            ultima_interacao_em: now,
            data_primeiro_contato,
            tempo_resposta_segundos,
          }
          updated.score_lead = calcLeadScore(updated)

          const entry: HistoricoMovimentacao = {
            id: crypto.randomUUID(),
            lead_id: id,
            de_status: l.status_funil,
            para_status: newStatus,
            usuario_id: currentUser?.id || 'u1',
            data: now,
            observacao: extra?.motivo_perda ? `Motivo: ${extra.motivo_perda}` : undefined,
          }
          setHistorico((h) => [...h, entry])

          // Salva no banco: tenta update completo; se falhar por coluna inexistente,
          // garante pelo menos o status_funil com campos mínimos conhecidos
          supabase.from('leads').update({
            ...extra,
            status_funil: newStatus,
            ultima_interacao_em: now,
            data_primeiro_contato,
            tempo_resposta_segundos,
            score_lead: updated.score_lead,
          }).eq('id', id).then(({ error }) => {
            if (error) {
              console.warn('[moveLead] full update failed, retrying with minimal fields:', error.message)
              supabase.from('leads').update({
                status_funil: newStatus,
                ultima_interacao_em: now,
              }).eq('id', id).then(({ error: e2 }) => {
                if (e2) console.error('[moveLead] minimal update also failed:', e2.message)
              })
            }
          })
          supabase.from('historico_movimentacoes').insert(entry).then(({ error }) => {
            if (error) console.error('[moveLead] historico insert error:', error.message)
          })

          return updated
        })
      )
    },
    [currentUser]
  )

  const addLead = useCallback(
    async (lead: Omit<Lead, 'id' | 'data_criacao'>): Promise<void> => {
      const now = new Date()
      const newLead: Lead = {
        ...lead,
        id: crypto.randomUUID(),
        data_criacao: now.toISOString().split('T')[0],
        created_at: now.toISOString(),   // timestamp imutável — nunca sobrescrever
        ultima_interacao_em: now.toISOString(),
      }
      newLead.score_lead = calcLeadScore(newLead)

      const { error } = await supabase.from('leads').insert(newLead)
      if (error) { console.error('addLead error:', error); return }

      setLeads((prev) => [newLead, ...prev])

      const entry: HistoricoMovimentacao = {
        id: crypto.randomUUID(),
        lead_id: newLead.id,
        de_status: null,
        para_status: 'trafego_pago',
        usuario_id: currentUser?.id || 'u1',
        data: now.toISOString(),
        observacao: 'Lead cadastrado',
      }
      await supabase.from('historico_movimentacoes').insert(entry)
      setHistorico((h) => [...h, entry])
    },
    [currentUser]
  )

  // ── Delete lead ─────────────────────────────────────────────────────────────
  const deleteLead = useCallback(async (id: string): Promise<void> => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setAnotacoes((prev) => prev.filter((a) => a.lead_id !== id))
    setHistorico((prev) => prev.filter((h) => h.lead_id !== id))
    setAlertas((prev) => prev.filter((a) => a.lead_id !== id))
    supabase.from('leads').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteLead error:', error)
    })
  }, [])

  // ── Anotações ───────────────────────────────────────────────────────────────
  const addAnotacao = useCallback((anotacao: Omit<Anotacao, 'id' | 'created_at'>) => {
    const newAnotacao: Anotacao = {
      ...anotacao,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    setAnotacoes((prev) => [...prev, newAnotacao])
    const now = new Date().toISOString()
    setLeads((prev) =>
      prev.map((l) => l.id === anotacao.lead_id ? { ...l, ultima_interacao_em: now } : l)
    )
    // Fire-and-forget
    supabase.from('anotacoes').insert(newAnotacao)
    supabase.from('leads').update({ ultima_interacao_em: now }).eq('id', anotacao.lead_id)
  }, [])

  const deleteAnotacao = useCallback((id: string) => {
    setAnotacoes((prev) => prev.filter((a) => a.id !== id))
    supabase.from('anotacoes').delete().eq('id', id)
  }, [])

  const updateAnotacao = useCallback((id: string, texto: string) => {
    setAnotacoes((prev) => prev.map((a) => a.id === id ? { ...a, texto } : a))
    supabase.from('anotacoes').update({ texto }).eq('id', id)
  }, [])

  // ── Usuários ────────────────────────────────────────────────────────────────
  const addUser = useCallback(async (user: Omit<User, 'id'>, senha = '123456'): Promise<void> => {
    const newUser: User = { ...user, id: crypto.randomUUID(), ativo: true }
    const { vendedorVinculado, ...rest } = newUser
    const dbUser = { ...rest, vendedor_vinculado: vendedorVinculado ?? null, senha }
    const { error } = await supabase.from('users').insert(dbUser)
    if (error) { console.error('addUser error:', error); return }
    setUsers((prev) => [...prev, newUser])
  }, [])

  const updateUser = useCallback(async (id: string, updates: Partial<Omit<User, 'id'>>, senha?: string): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo
    if ('vendedorVinculado' in updates) dbUpdates.vendedor_vinculado = updates.vendedorVinculado ?? null
    if (updates.ativo !== undefined) dbUpdates.ativo = updates.ativo
    if (senha) dbUpdates.senha = senha
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u))
    supabase.from('users').update(dbUpdates).eq('id', id).then(({ error }) => {
      if (error) console.error('updateUser error:', error)
    })
  }, [])

  const toggleUserAtivo = useCallback(async (id: string): Promise<void> => {
    setUsers((prev) => {
      const next = prev.map((u) => u.id === id ? { ...u, ativo: !(u.ativo ?? true) } : u)
      const updated = next.find((u) => u.id === id)
      supabase.from('users').update({ ativo: updated?.ativo }).eq('id', id).then(({ error }) => {
        if (error) console.error('toggleUserAtivo error:', error)
      })
      return next
    })
  }, [])

  // ── Metas ───────────────────────────────────────────────────────────────────
  const addMeta = useCallback(async (m: Omit<Meta, 'id' | 'created_at'>): Promise<void> => {
    const newMeta: Meta = { ...m, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    if (dbReady) {
      const { error } = await supabase.from('metas').insert(newMeta)
      if (error) { console.error('addMeta error:', error); return }
    }
    setMetas((prev) => [...prev, newMeta])
  }, [dbReady])

  const updateMeta = useCallback(async (id: string, updates: Partial<Meta>): Promise<void> => {
    setMetas((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m))
    if (dbReady) {
      supabase.from('metas').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.error('updateMeta error:', error)
      })
    }
  }, [dbReady])

  const deleteMeta = useCallback(async (id: string): Promise<void> => {
    setMetas((prev) => prev.filter((m) => m.id !== id))
    if (dbReady) {
      await supabase.from('metas').delete().eq('id', id)
    }
  }, [dbReady])

  // ── Admin: Backup / Restore / Import CRM ────────────────────────────────────
  const downloadBackup = useCallback(async () => {
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY
    const res = await fetch('/api/admin/backup', {
      headers: { 'x-admin-key': adminKey ?? '' },
    })
    if (!res.ok) throw new Error('Backup failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-leads-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const restoreFromBackup = useCallback(async (restoredLeads: Lead[]) => {
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY
    const res = await fetch('/api/admin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey ?? '' },
      body: JSON.stringify({ leads: restoredLeads }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Restore failed')
    }
    // Reload local state
    setLeads(restoredLeads.map((l) => ({ ...l, score_lead: calcLeadScore(l) })))
    setAnotacoes([])
    setHistorico([])
    setAlertas([])
  }, [])

  const importFromCRM = useCallback(async (importedLeads: Partial<Lead>[], vendedor_id: string) => {
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY
    const res = await fetch('/api/admin/import-crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey ?? '' },
      body: JSON.stringify({ leads: importedLeads, vendedor_id }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Import failed')
    }
    // Reload leads from server to get the inserted records
    const { data } = await supabase.from('leads').select('*')
    if (data) {
      setLeads(data.map((l: Record<string, unknown>) => {
        const lead = l as unknown as Lead
        lead.score_lead = calcLeadScore(lead)
        return lead
      }))
    }
  }, [])

  // ── Alertas ─────────────────────────────────────────────────────────────────
  const resolveAlerta = useCallback((id: string) => {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, resolvido: true } : a)))
    if (!id.startsWith('dyn_')) {
      supabase.from('alertas').update({ resolvido: true }).eq('id', id)
    }
  }, [])

  const googleConnected = !!currentUser?.google_refresh_token

  return (
    <AppContext.Provider
      value={{
        currentUser, login, logout,
        googleConnected, refreshGoogleConnection,
        leads, updateLead, moveLead, addLead, deleteLead,
        anotacoes, addAnotacao, deleteAnotacao, updateAnotacao,
        historico,
        users, addUser, updateUser, toggleUserAtivo,
        alertas, resolveAlerta,
        metas, addMeta, updateMeta, deleteMeta,
        loading,
        downloadBackup, restoreFromBackup, importFromCRM,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
