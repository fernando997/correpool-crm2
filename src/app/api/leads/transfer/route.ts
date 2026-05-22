import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { leadId, newVendedorId, currentUserId } = body

  if (!leadId || !newVendedorId || !currentUserId) {
    return NextResponse.json({ error: 'leadId, newVendedorId e currentUserId são obrigatórios' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Busca o lead atual para obter o vendedor anterior
  const { data: leadData, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('vendedor_id, status_funil')
    .eq('id', leadId)
    .maybeSingle()

  if (leadError || !leadData) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
  }

  // Valida que o novo vendedor existe e tem tipo = 'vendedor'
  const { data: vendedorData, error: vendedorError } = await supabaseAdmin
    .from('users')
    .select('id, nome, tipo')
    .eq('id', newVendedorId)
    .eq('tipo', 'vendedor')
    .maybeSingle()

  if (vendedorError || !vendedorData) {
    return NextResponse.json({ error: 'Vendedor não encontrado ou inválido' }, { status: 400 })
  }

  // Busca nome do vendedor anterior para o histórico
  const { data: vendedorAnterior } = await supabaseAdmin
    .from('users')
    .select('nome')
    .eq('id', leadData.vendedor_id)
    .maybeSingle()

  const now = new Date().toISOString()

  // Atualiza o lead
  const { data: updatedLead, error: updateError } = await supabaseAdmin
    .from('leads')
    .update({ vendedor_id: newVendedorId, ultima_interacao_em: now })
    .eq('id', leadId)
    .select()
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Insere no histórico
  const historicoEntry = {
    id: crypto.randomUUID(),
    lead_id: leadId,
    de_status: leadData.status_funil,
    para_status: leadData.status_funil,
    usuario_id: currentUserId,
    data: now,
    observacao: `Transferido de ${vendedorAnterior?.nome ?? leadData.vendedor_id} para ${vendedorData.nome}`,
  }

  await supabaseAdmin.from('historico_movimentacoes').insert(historicoEntry)

  return NextResponse.json({ success: true, lead: updatedLead })
}
