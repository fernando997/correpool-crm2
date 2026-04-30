import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

const REQUIRED_FIELDS = [
  'nome', 'telefone', 'valor_estimado', 'vendedor_id',
  'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'utm_anuncio', 'utm_posicionamento',
]

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: x-api-key inválida ou ausente' },
      { status: 401 }
    )
  }

  // ── Parse body ───────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body inválido: esperado JSON' },
      { status: 400 }
    )
  }

  // ── Validação de campos obrigatórios ─────────────────────────
  const missing = REQUIRED_FIELDS.filter((f) => !body[f])
  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Campos obrigatórios ausentes: ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  // ── Monta o lead (temperatura sempre 'frio') ─────────────────
  const now = new Date()
  const lead = {
    nome:            body.nome as string,
    telefone:        body.telefone as string,
    email:           (body.email as string) ?? '',
    observacao:      (body.observacao as string) ?? '',
    data_criacao:    now.toISOString().split('T')[0],
    reuniao_agendada: false,
    temperatura:     'frio',             // sempre frio por padrão
    status_funil:    'trafego_pago',
    vendedor_id:     body.vendedor_id as string,
    sdr_id:          (body.sdr_id as string) ?? null,
    utm_source:      body.utm_source as string,
    utm_medium:      body.utm_medium as string,
    utm_campaign:    body.utm_campaign as string,
    utm_content:     body.utm_content as string,
    utm_term:        body.utm_term as string,
    utm_anuncio:     body.utm_anuncio as string,
    utm_posicionamento: body.utm_posicionamento as string,
    valor_estimado:  (body.valor_estimado as string) ?? null,
    ultima_interacao_em: now.toISOString(),
  }

  // ── Insere no Supabase ────────────────────────────────────────
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert(lead)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, lead: data }, { status: 201 })
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/leads',
    version: '1.0',
    campos_obrigatorios: REQUIRED_FIELDS,
    temperatura_padrao: 'frio',
  })
}
