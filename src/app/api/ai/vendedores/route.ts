import { NextRequest } from 'next/server'
import { autenticar, erro, ok } from '@/lib/apiIa'

// GET /api/ai/vendedores?papel=closer — closers ativos, só id e nome.

export async function GET(req: NextRequest) {
  const auth = await autenticar(req, 'vendedores:listar')
  if ('resposta' in auth) return auth.resposta
  const { db } = auth

  const papel = req.nextUrl.searchParams.get('papel') ?? 'closer'
  if (papel !== 'closer') return erro(400, 'papel aceito: closer')

  const { data, error } = await db.from('users').select('id, nome')
    .eq('tipo', 'vendedor').eq('closer', true).eq('ativo', true).order('nome')
  if (error) return erro(500, 'Falha ao listar closers')

  return ok({ closers: (data ?? []).map((u) => ({ id: u.id, nome: u.nome })) })
}
