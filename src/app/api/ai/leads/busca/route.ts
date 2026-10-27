import { NextRequest } from 'next/server'
import { autenticar, erro, ok, telCandidatos, telValido } from '@/lib/apiIa'

// GET /api/ai/leads/busca?telefone=+5511999999999
// Devolve só id, etapa e vendedor_id (nunca nome, e-mail ou histórico).

export async function GET(req: NextRequest) {
  const auth = await autenticar(req, 'leads:buscar')
  if ('resposta' in auth) return auth.resposta
  const { db } = auth

  const telefone = req.nextUrl.searchParams.get('telefone')?.trim() ?? ''
  if (!telValido(telefone)) return erro(400, 'telefone inválido: use E.164 brasileiro, ex. +5511999999999')

  const { data, error } = await db.rpc('api_lead_por_telefone', { p_candidatos: telCandidatos(telefone) })
  if (error) return erro(500, 'Falha ao buscar lead')
  const lead = (data as Record<string, unknown>[] | null)?.[0]
  if (!lead) return erro(404, 'Nenhum lead com este telefone')

  return ok({ id: lead.id, etapa: lead.status_funil, vendedor_id: lead.vendedor_id ?? null })
}
