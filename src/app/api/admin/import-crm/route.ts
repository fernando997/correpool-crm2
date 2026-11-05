import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Lead, StatusFunil, Temperatura } from '@/types'

const VALID_STATUS: StatusFunil[] = [
  'trafego_pago', 'primeiro_contato', 'followup1', 'followup2', 'followup3',
  'agendado', 'nao_compareceu', 'reuniao_realizada', 'contrato_enviado', 'contrato_assinado',
  'fechado', 'declinado',
]

const VALID_TEMP: Temperatura[] = ['frio', 'morno', 'quente', 'muito_quente', 'desqualificado']

const BATCH = 500

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key')
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { leads: Partial<Lead>[]; vendedor_id: string }
  if (!Array.isArray(body?.leads) || !body.vendedor_id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  const normalized = body.leads.map((l) => {
    const status_funil: StatusFunil = VALID_STATUS.includes(l.status_funil as StatusFunil)
      ? (l.status_funil as StatusFunil)
      : 'trafego_pago'

    const temperatura: Temperatura = VALID_TEMP.includes(l.temperatura as Temperatura)
      ? (l.temperatura as Temperatura)
      : 'frio'

    return {
      id: l.id ?? crypto.randomUUID(),
      nome: l.nome ?? 'Sem nome',
      telefone: l.telefone ?? '',
      email: l.email ?? '',
      observacao: l.observacao ?? '',
      data_criacao: l.data_criacao ?? now.split('T')[0],
      created_at: l.created_at ?? now,
      ultima_interacao_em: l.ultima_interacao_em ?? now,
      reuniao_agendada: l.reuniao_agendada ?? false,
      temperatura,
      status_funil,
      vendedor_id: body.vendedor_id,
      sdr_id: l.sdr_id,
      utm_source: l.utm_source,
      utm_medium: l.utm_medium,
      utm_campaign: l.utm_campaign,
      utm_content: l.utm_content,
      utm_term: l.utm_term,
      utm_anuncio: l.utm_anuncio,
      utm_posicionamento: l.utm_posicionamento,
      valor_contrato: l.valor_contrato,
      valor_estimado: l.valor_estimado,
      valor_fechado: l.valor_fechado,
      data_reuniao: l.data_reuniao,
      hora_reuniao: l.hora_reuniao,
      link_meet: l.link_meet,
      motivo_perda: l.motivo_perda,
      importado_externo: true,
    }
  })

  for (let i = 0; i < normalized.length; i += BATCH) {
    const batch = normalized.slice(i, i + BATCH)
    const { error } = await supabase.from('leads').insert(batch)
    if (error) {
      return NextResponse.json({ error: `Insert failed at batch ${i}: ${error.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, imported: normalized.length })
}
