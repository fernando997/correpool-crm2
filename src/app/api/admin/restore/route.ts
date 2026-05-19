import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Lead } from '@/types'

const BATCH = 500

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key')
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { leads: Lead[] }
  if (!Array.isArray(body?.leads)) {
    return NextResponse.json({ error: 'Invalid payload: leads must be an array' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Delete in dependency order
  const tables = ['alertas', 'historico_movimentacoes', 'anotacoes', 'leads']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      return NextResponse.json({ error: `Failed to clear ${table}: ${error.message}` }, { status: 500 })
    }
  }

  // Re-insert leads in batches
  const leads = body.leads
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH)
    const { error } = await supabase.from('leads').insert(batch)
    if (error) {
      return NextResponse.json({ error: `Insert failed at batch ${i}: ${error.message}` }, { status: 500 })
    }
  }

  // Reset sequence to avoid duplicate key on next API insert
  await supabase.rpc('reset_leads_api_seq')

  return NextResponse.json({ success: true, restored: leads.length })
}
