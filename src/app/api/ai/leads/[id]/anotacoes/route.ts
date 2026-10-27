import { NextRequest } from 'next/server'
import { autenticar, comIdempotencia, erro, ok, lerJson } from '@/lib/apiIa'

// POST /api/ai/leads/{id}/anotacoes — anotação com autor "Vitor (IA)" e data/hora.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await autenticar(req, 'anotacoes:criar')
  if ('resposta' in auth) return auth.resposta
  const { chave, db } = auth

  const body = await lerJson(req)
  if (!body) return erro(400, 'Corpo inválido: esperado um objeto JSON')
  const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
  if (!texto) return erro(400, 'texto é obrigatório')
  if (texto.length > 8000) return erro(400, 'texto muito longo (máx. 8000 caracteres)')

  return comIdempotencia(req, db, chave, `POST /leads/${params.id}/anotacoes`, body, async () => {
    const { data: lead } = await db.from('leads').select('id').eq('id', params.id).maybeSingle()
    if (!lead) return erro(404, 'Lead não encontrado')

    const anotacao = {
      id: crypto.randomUUID(),
      lead_id: params.id,
      usuario_id: chave.usuario_id ?? 'vitor-ia',
      texto,
      created_at: new Date().toISOString(),
    }
    const { error } = await db.from('anotacoes').insert(anotacao)
    if (error) return erro(500, 'Falha ao salvar anotação')
    await db.from('leads').update({ ultima_interacao_em: anotacao.created_at }).eq('id', params.id)

    return ok({ id: anotacao.id, criado_em: anotacao.created_at }, 201)
  })
}
