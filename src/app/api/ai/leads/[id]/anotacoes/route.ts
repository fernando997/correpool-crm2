import { NextRequest } from 'next/server'
import { autenticar, comIdempotencia, erro, ok, lerJson, canalDaOrigem, USUARIOS_IA } from '@/lib/apiIa'

// GET  /api/ai/leads/{id}/anotacoes — todas as anotações do lead (de qualquer autor), da mais antiga à mais nova.
// POST /api/ai/leads/{id}/anotacoes — anotação assinada pela IA do canal do lead (Vitor ou Camila), com data/hora.

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await autenticar(req, 'anotacoes:ler')
  if ('resposta' in auth) return auth.resposta
  const { db } = auth

  const { data: lead } = await db.from('leads').select('id').eq('id', params.id).maybeSingle()
  if (!lead) return erro(404, 'Lead não encontrado')

  const { data, error } = await db.from('anotacoes')
    .select('id, usuario_id, texto, arquivo_url, created_at')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) return erro(500, 'Falha ao ler anotações')
  const anotacoes = data ?? []

  // Só nome e papel do autor (nunca e-mail ou outros dados do usuário)
  const ids = Array.from(new Set(anotacoes.map((a) => a.usuario_id as string)))
  let autores: { id: string; nome: string; tipo: string }[] = []
  if (ids.length) {
    const { data: us } = await db.from('users').select('id, nome, tipo').in('id', ids)
    autores = (us ?? []) as typeof autores
  }
  const porId = new Map(autores.map((u) => [u.id, u]))

  return ok({
    total: anotacoes.length,
    anotacoes: anotacoes.map((a) => ({
      id: a.id,
      texto: a.texto,
      arquivo_url: a.arquivo_url ?? null,
      criado_em: a.created_at,
      autor: {
        id: a.usuario_id,
        nome: porId.get(a.usuario_id)?.nome ?? null,
        tipo: porId.get(a.usuario_id)?.tipo ?? null,
        ia: USUARIOS_IA.includes(a.usuario_id),
      },
    })),
  })
}

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
    const { data: lead } = await db.from('leads').select('id, origem').eq('id', params.id).maybeSingle()
    if (!lead) return erro(404, 'Lead não encontrado')

    const anotacao = {
      id: crypto.randomUUID(),
      lead_id: params.id,
      usuario_id: canalDaOrigem(lead.origem).usuario_id,
      texto,
      created_at: new Date().toISOString(),
    }
    const { error } = await db.from('anotacoes').insert(anotacao)
    if (error) return erro(500, 'Falha ao salvar anotação')
    await db.from('leads').update({ ultima_interacao_em: anotacao.created_at }).eq('id', params.id)

    return ok({ id: anotacao.id, criado_em: anotacao.created_at }, 201)
  })
}
