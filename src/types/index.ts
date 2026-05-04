export type UserRole = 'admin' | 'vendedor' | 'sdr' | 'marketing'

export type Temperatura =
  | 'frio'
  | 'morno'
  | 'quente'
  | 'muito_quente'
  | 'desqualificado'

export type StatusFunil =
  | 'trafego_pago'
  | 'primeiro_contato'
  | 'followup1'
  | 'followup2'
  | 'followup3'
  | 'agendado'
  | 'reuniao_realizada'
  | 'contrato_enviado'
  | 'contrato_assinado'
  | 'fechado'
  | 'declinado'

export type MotivoPerdaType =
  | 'sem_interesse'
  | 'sem_dinheiro'
  | 'nao_respondeu'
  | 'timing_ruim'
  | 'lead_ruim'
  | 'concorrente'
  | 'locacao'
  | 'contato_errado'

export type AlertaTipo = 'lead_parado' | 'followup_atrasado' | 'reuniao_proxima'

export interface Alerta {
  id: string
  lead_id: string
  tipo: AlertaTipo
  mensagem: string
  resolvido: boolean
  created_at: string
}

export interface User {
  id: string
  nome: string
  email: string
  tipo: UserRole
  avatar?: string
  vendedorVinculado?: string
  ativo?: boolean
  google_refresh_token?: string
  google_email?: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  email: string
  observacao: string
  data_criacao: string
  data_reuniao?: string
  hora_reuniao?: string
  link_meet?: string
  reuniao_agendada: boolean
  temperatura: Temperatura
  status_funil: StatusFunil
  vendedor_id: string
  sdr_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  utm_anuncio?: string
  utm_posicionamento?: string
  // financeiro
  valor_contrato?: number
  valor_estimado?: string
  valor_fechado?: number
  // inteligencia
  created_at?: string          // timestamp imutável do insert — base do mapa de calor
  data_primeiro_contato?: string
  tempo_resposta_segundos?: number
  motivo_perda?: MotivoPerdaType
  score_lead?: number
  ultima_interacao_em?: string
  proximo_contato?: string   // data agendada para o próximo follow-up (YYYY-MM-DD)
  importado_externo?: boolean
}

export interface Anotacao {
  id: string
  lead_id: string
  usuario_id: string
  texto: string
  arquivo_url?: string
  created_at: string
}

export interface HistoricoMovimentacao {
  id: string
  lead_id: string
  de_status: StatusFunil | null
  para_status: StatusFunil
  usuario_id: string
  data: string
  observacao?: string
}

export interface Meta {
  id: string
  titulo: string
  mes: string             // "2025-04"
  meta_receita: number    // meta individual de cada vendedor
  premio_1_descricao: string
  premio_1_valor: number
  premio_2_descricao: string
  premio_2_valor: number
  minimo_participar: number  // receita mínima para concorrer ao prêmio
  criterios: string
  ativa: boolean
  created_at: string
}

export interface MetricaCriativo {
  utm_content: string
  utm_campaign?: string
  utm_source?: string
  total_leads: number
  respondeu: number
  agendou: number
  reuniao_realizada: number
  vendas: number
  desqualificados: number
  receita_total: number
  valor_estimado_pipeline: number
  taxa_resposta: number
  taxa_agendamento: number
  taxa_comparecimento: number
  taxa_conversao: number
  taxa_desqualificacao: number
  score: number
  ticket_medio: number
}

export interface GargaloItem {
  de: string
  para: string
  deStatus: StatusFunil
  paraStatus: StatusFunil
  entrada: number
  saida: number
  perda: number
  taxa_perda: number
}

export const FUNIL_LABELS: Record<StatusFunil, string> = {
  trafego_pago: 'Trafego Pago',
  primeiro_contato: '1o Contato',
  followup1: 'Follow-up 1',
  followup2: 'Follow-up 2',
  followup3: 'Follow-up 3',
  agendado: 'Agendados',
  reuniao_realizada: 'Reuniao Feita',
  contrato_enviado: 'Contrato Enviado',
  contrato_assinado: 'Contrato Assinado',
  fechado: 'Fechado',
  declinado: 'Declinados',
}

export const MOTIVO_PERDA_LABELS: Record<MotivoPerdaType, string> = {
  sem_interesse: 'Sem Interesse',
  sem_dinheiro: 'Sem Orcamento',
  nao_respondeu: 'Nao Respondeu',
  timing_ruim: 'Timing Ruim',
  lead_ruim: 'Lead Sem Fit',
  concorrente: 'Fechou com Concorrente',
  locacao: 'Locação',
  contato_errado: 'Contato Errado',
}

export const TEMPERATURA_LABELS: Record<Temperatura, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
  muito_quente: 'Muito Quente',
  desqualificado: 'Desqualificado',
}

export const TEMPERATURA_COLORS: Record<Temperatura, string> = {
  frio: '#60a5fa',
  morno: '#f59e0b',
  quente: '#f97316',
  muito_quente: '#ef4444',
  desqualificado: '#6b7280',
}

export const FUNIL_ORDER: StatusFunil[] = [
  'trafego_pago',
  'primeiro_contato',
  'followup1',
  'followup2',
  'followup3',
  'agendado',
  'reuniao_realizada',
  'contrato_enviado',
  'contrato_assinado',
  'fechado',
  'declinado',
]
