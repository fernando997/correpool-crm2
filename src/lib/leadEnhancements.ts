import type { MotivoPerdaType } from '@/types'

interface LeadEnhancement {
  valor_estimado?: string
  valor_fechado?: number
  data_primeiro_contato?: string
  tempo_resposta_segundos?: number
  motivo_perda?: MotivoPerdaType
  ultima_interacao_em?: string
}

// Suplemento de campos inteligentes para os mock leads
export const LEAD_ENHANCEMENTS: Record<string, LeadEnhancement> = {
  // --- FECHADOS: valor_fechado = valor_contrato, resposta rapida ---
  l1: {
    valor_estimado: "R$ 4800", valor_fechado: 4800,
    data_primeiro_contato: '2024-03-01T10:00:00',
    tempo_resposta_segundos: 420, // 7 min - rapido!
    ultima_interacao_em: '2024-03-07T10:00:00',
  },
  l2: {
    valor_estimado: "R$ 7200", valor_fechado: 7200,
    data_primeiro_contato: '2024-03-03T09:30:00',
    tempo_resposta_segundos: 1800, // 30 min
    ultima_interacao_em: '2024-03-08T15:00:00',
  },
  l3: {
    valor_estimado: "R$ 9600", valor_fechado: 9600,
    data_primeiro_contato: '2024-03-05T09:00:00',
    tempo_resposta_segundos: 540, // 9 min - rapido!
    ultima_interacao_em: '2024-03-10T11:00:00',
  },
  l4: {
    valor_estimado: "R$ 3600", valor_fechado: 3600,
    data_primeiro_contato: '2024-03-07T14:00:00',
    tempo_resposta_segundos: 3600, // 1h
    ultima_interacao_em: '2024-03-12T16:00:00',
  },
  l5: {
    valor_estimado: "R$ 12000", valor_fechado: 12000,
    data_primeiro_contato: '2024-03-10T10:00:00',
    tempo_resposta_segundos: 480, // 8 min - rapido!
    ultima_interacao_em: '2024-03-15T12:00:00',
  },
  l6: {
    valor_estimado: "R$ 18000", valor_fechado: 18000,
    data_primeiro_contato: '2024-03-12T14:00:00',
    tempo_resposta_segundos: 900, // 15 min
    ultima_interacao_em: '2024-03-18T17:00:00',
  },
  // --- CONTRATO ASSINADO ---
  l7: {
    valor_estimado: "R$ 6000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-15T09:00:00',
    tempo_resposta_segundos: 7200, // 2h
    ultima_interacao_em: '2024-03-20T10:30:00',
  },
  l8: {
    valor_estimado: "R$ 4200", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-16T11:00:00',
    tempo_resposta_segundos: 5400, // 1.5h
    ultima_interacao_em: '2024-03-21T15:00:00',
  },
  // --- CONTRATO ENVIADO ---
  l9: {
    valor_estimado: "R$ 7800", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-18T10:00:00',
    tempo_resposta_segundos: 3600,
    ultima_interacao_em: '2024-03-23T09:30:00',
  },
  l10: {
    valor_estimado: "R$ 5000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-19T13:00:00',
    tempo_resposta_segundos: 2700,
    ultima_interacao_em: '2024-03-24T11:30:00',
  },
  // --- REUNIAO REALIZADA ---
  l11: {
    valor_estimado: "R$ 6600", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-20T09:00:00',
    tempo_resposta_segundos: 1200,
    ultima_interacao_em: '2024-03-25T11:00:00',
  },
  l12: {
    valor_estimado: "R$ 2400", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-21T14:00:00',
    tempo_resposta_segundos: 86400, // 24h - lento
    ultima_interacao_em: '2024-03-26T15:00:00',
  },
  l13: {
    valor_estimado: "R$ 3000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-22T15:00:00',
    tempo_resposta_segundos: 43200, // 12h
    ultima_interacao_em: '2024-03-27T16:30:00',
  },
  // --- AGENDADOS ---
  l14: {
    valor_estimado: "R$ 8400", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-25T10:00:00',
    tempo_resposta_segundos: 600, // 10 min - limite
    ultima_interacao_em: '2024-03-26T10:00:00',
  },
  l15: {
    valor_estimado: "R$ 6000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-26T09:00:00',
    tempo_resposta_segundos: 480, // 8 min - rapido!
    ultima_interacao_em: '2024-03-27T09:00:00',
  },
  l16: {
    valor_estimado: "R$ 15000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-27T12:00:00',
    tempo_resposta_segundos: 1800,
    ultima_interacao_em: '2024-03-28T12:00:00',
  },
  l17: {
    valor_estimado: "R$ 4500", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-28T11:00:00',
    tempo_resposta_segundos: 7200,
    ultima_interacao_em: '2024-03-29T10:30:00',
  },
  l45: {
    valor_estimado: "R$ 24000", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-28T10:00:00',
    tempo_resposta_segundos: 300, // 5 min - muito rapido!
    ultima_interacao_em: '2024-03-29T10:00:00',
  },
  l46: {
    valor_estimado: "R$ 9600", valor_fechado: undefined,
    data_primeiro_contato: '2024-03-29T14:00:00',
    tempo_resposta_segundos: 900,
    ultima_interacao_em: '2024-03-30T14:00:00',
  },
  // --- FOLLOWUPS (ultima interacao antiga = gerando alertas) ---
  l18: {
    valor_estimado: "R$ 1800",
    data_primeiro_contato: '2024-03-20T14:00:00',
    tempo_resposta_segundos: 172800, // 48h
    ultima_interacao_em: '2024-03-20T14:00:00', // parado ha muito
  },
  l19: {
    valor_estimado: "R$ 5400",
    data_primeiro_contato: '2024-03-21T10:00:00',
    tempo_resposta_segundos: 86400,
    ultima_interacao_em: '2024-03-22T10:00:00',
  },
  l20: {
    valor_estimado: "R$ 3600",
    data_primeiro_contato: '2024-03-22T15:00:00',
    tempo_resposta_segundos: 21600,
    ultima_interacao_em: '2024-03-23T15:00:00',
  },
  l21: {
    valor_estimado: "R$ 1200",
    data_primeiro_contato: '2024-03-24T13:00:00',
    tempo_resposta_segundos: 259200, // 3 dias - muito lento
    ultima_interacao_em: '2024-03-24T13:00:00',
  },
  l22: {
    valor_estimado: "R$ 3600",
    data_primeiro_contato: '2024-03-25T11:00:00',
    tempo_resposta_segundos: 14400,
    ultima_interacao_em: '2024-03-26T11:00:00',
  },
  l23: {
    valor_estimado: "R$ 6000",
    data_primeiro_contato: '2024-03-26T15:00:00',
    tempo_resposta_segundos: 7200,
    ultima_interacao_em: '2024-03-27T15:00:00',
  },
  l24: {
    valor_estimado: "R$ 2400",
    data_primeiro_contato: '2024-03-27T16:00:00',
    tempo_resposta_segundos: 129600, // 1.5 dias
    ultima_interacao_em: '2024-03-27T16:00:00',
  },
  l25: {
    valor_estimado: "R$ 3000",
    data_primeiro_contato: '2024-03-28T10:00:00',
    tempo_resposta_segundos: 28800,
    ultima_interacao_em: '2024-03-28T10:00:00',
  },
  l26: {
    valor_estimado: "R$ 4800",
    data_primeiro_contato: '2024-03-28T14:00:00',
    tempo_resposta_segundos: 7200,
    ultima_interacao_em: '2024-03-29T14:00:00',
  },
  l47: {
    valor_estimado: "R$ 7200",
    data_primeiro_contato: '2024-03-26T12:00:00',
    tempo_resposta_segundos: 10800,
    ultima_interacao_em: '2024-03-27T12:00:00',
  },
  l48: {
    valor_estimado: "R$ 4800",
    data_primeiro_contato: '2024-03-27T11:00:00',
    tempo_resposta_segundos: 3600,
    ultima_interacao_em: '2024-03-28T11:00:00',
  },
  // --- DECLINADOS: com motivo_perda ---
  l39: { motivo_perda: 'sem_dinheiro', ultima_interacao_em: '2024-02-22T10:00:00' },
  l40: { motivo_perda: 'concorrente', ultima_interacao_em: '2024-02-20T09:00:00' },
  l41: { motivo_perda: 'lead_ruim', ultima_interacao_em: '2024-02-23T11:00:00' },
  l42: { motivo_perda: 'lead_ruim', ultima_interacao_em: '2024-02-24T10:00:00' },
  l43: { motivo_perda: 'sem_dinheiro', ultima_interacao_em: '2024-03-03T09:00:00' },
  l44: { motivo_perda: 'sem_interesse', ultima_interacao_em: '2024-03-07T10:00:00' },
}
