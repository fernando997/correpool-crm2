import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Base das rotas /api/ai/* de ESCRITA (Vitor e futuras IAs).
// Auth: header `x-ai-key` com uma chave da tabela api_chaves (guardamos só o sha256).
// Cada chave tem escopos; o que não está no escopo responde 403.

export type Escopo =
  | 'leads:buscar'
  | 'leads:escrever'
  | 'leads:atribuir'
  | 'anotacoes:criar'
  | 'anotacoes:ler'
  | 'vendedores:listar'

export interface Chave {
  id: string
  nome: string
  escopos: string[]
  usuario_id: string | null
  limite_por_minuto: number
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

// ── Respostas padronizadas ───────────────────────────────────
const CODIGOS: Record<number, string> = {
  400: 'dado_invalido',
  401: 'chave_invalida',
  403: 'sem_permissao',
  404: 'nao_encontrado',
  409: 'conflito',
  429: 'limite_excedido',
  500: 'erro_interno',
}

export function erro(status: number, mensagem: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { ok: false, erro: { codigo: CODIGOS[status] ?? 'erro', mensagem } },
    { status, headers },
  )
}

export function ok(dados: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...dados }, { status })
}

export const semPermissao = (chave: Chave, escopo: Escopo) =>
  chave.escopos.includes(escopo) ? null : erro(403, `Esta chave não tem permissão para ${escopo}`)

// ── Autenticação + escopo + limite por minuto ────────────────
// Sem `escopo`, só autentica: a rota confere as permissões depois (ex.: PATCH por campo).
export async function autenticar(
  req: NextRequest,
  escopo?: Escopo,
): Promise<{ chave: Chave; db: SupabaseClient } | { resposta: NextResponse }> {
  const raw = req.headers.get('x-ai-key')
  if (!raw) return { resposta: erro(401, 'Header x-ai-key ausente') }

  const db = getSupabaseAdmin()
  const { data: chave } = await db
    .from('api_chaves')
    .select('id, nome, escopos, usuario_id, limite_por_minuto')
    .eq('hash', sha256(raw))
    .eq('ativo', true)
    .maybeSingle()
  if (!chave) return { resposta: erro(401, 'Chave inválida ou desativada') }

  const negado = escopo ? semPermissao(chave as Chave, escopo) : null
  if (negado) return { resposta: negado }

  const { data: usados, error } = await db.rpc('api_contar_uso', { p_chave: chave.id })
  if (error) return { resposta: erro(500, 'Falha ao registrar uso da chave') }
  if ((usados as number) > chave.limite_por_minuto) {
    const espera = 60 - new Date().getSeconds()
    return {
      resposta: erro(429, `Limite de ${chave.limite_por_minuto} requisições por minuto atingido. Tente em ${espera}s.`, {
        'Retry-After': String(espera),
      }),
    }
  }

  db.from('api_chaves').update({ ultimo_uso_em: new Date().toISOString() }).eq('id', chave.id).then(() => {})
  return { chave: chave as Chave, db }
}

// ── Idempotency-Key ──────────────────────────────────────────
// Mesma chave + mesmo corpo → devolve a resposta guardada.
// Mesma chave + corpo diferente → 409.
export async function comIdempotencia(
  req: NextRequest,
  db: SupabaseClient,
  chave: Chave,
  rota: string,
  corpo: unknown,
  executar: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const idemKey = req.headers.get('idempotency-key')?.trim()
  if (!idemKey) return erro(400, 'Header Idempotency-Key é obrigatório')
  if (idemKey.length > 200) return erro(400, 'Idempotency-Key muito longa (máx. 200)')

  const corpoHash = sha256(JSON.stringify(corpo))
  const { data: anterior } = await db
    .from('api_idempotencia')
    .select('rota, corpo_hash, status, resposta')
    .eq('chave_id', chave.id)
    .eq('idem_key', idemKey)
    .maybeSingle()

  if (anterior) {
    if (anterior.rota !== rota || anterior.corpo_hash !== corpoHash) {
      return erro(409, 'Idempotency-Key já usada com outra chamada')
    }
    if (anterior.status == null) return erro(409, 'Chamada com esta Idempotency-Key ainda em processamento')
    return NextResponse.json(anterior.resposta, { status: anterior.status, headers: { 'Idempotent-Replay': 'true' } })
  }

  // Reserva a chave antes de executar (duas chamadas iguais ao mesmo tempo → a 2ª recebe 409)
  const { error: reserva } = await db
    .from('api_idempotencia')
    .insert({ chave_id: chave.id, idem_key: idemKey, rota, corpo_hash: corpoHash })
  if (reserva) return erro(409, 'Chamada com esta Idempotency-Key ainda em processamento')

  const resposta = await executar()
  if (resposta.status >= 500) {
    // Erro interno: libera a chave para nova tentativa
    await db.from('api_idempotencia').delete().eq('chave_id', chave.id).eq('idem_key', idemKey)
    return resposta
  }
  const json = await resposta.clone().json()
  await db
    .from('api_idempotencia')
    .update({ status: resposta.status, resposta: json })
    .eq('chave_id', chave.id)
    .eq('idem_key', idemKey)
  return resposta
}

// ── Canais de WhatsApp atendidos por IA ──────────────────────
// A origem do lead diz qual IA o atende: ela vira o SDR padrão e assina
// histórico e anotações. Vitor e Camila usam hoje a mesma chave ("vitor").
export const CANAIS_IA = {
  whatsapp_0800:   { usuario_id: 'vitor-ia',  nome: 'Vitor (IA)',  curto: 'Vitor',  por: 'pelo Vitor (IA)',  canal: 'WhatsApp 0800' },
  whatsapp_camila: { usuario_id: 'camila-ia', nome: 'Camila (IA)', curto: 'Camila', por: 'pela Camila (IA)', canal: 'WhatsApp do número novo' },
} as const
export type OrigemIa = keyof typeof CANAIS_IA
export const ORIGEM_PADRAO: OrigemIa = 'whatsapp_0800'
export const ORIGENS_IA = Object.keys(CANAIS_IA) as OrigemIa[]
export const USUARIOS_IA: string[] = ORIGENS_IA.map((o) => CANAIS_IA[o].usuario_id)
export const ehOrigemIa = (v: unknown): v is OrigemIa =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CANAIS_IA, v)
// Lead sem origem de IA (ex.: veio de formulário) assina como o canal padrão (Vitor), como antes.
export const canalDaOrigem = (origem: unknown) => CANAIS_IA[ehOrigemIa(origem) ? origem : ORIGEM_PADRAO]

export const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)

// ── Atualização de lead com auditoria ────────────────────────
// Toda mudança destes campos feita por chave de IA num lead que já existe
// vai para api_auditoria (valor anterior → novo).
const CAMPOS_AUDITADOS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_anuncio', 'origem', 'sdr_id', 'vendedor_id',
]
const comoTexto = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v))

// A auditoria é gravada ANTES do update e apagada se o update falhar:
// nunca fica alteração sem registro.
export async function atualizarLead(
  db: SupabaseClient,
  chave: Chave,
  rota: string,
  atual: Record<string, unknown>,
  upd: Record<string, unknown>,
): Promise<{ alterados: string[] } | { resposta: NextResponse }> {
  const alterados = Object.keys(upd)
    .filter((c) => c !== 'ultima_interacao_em' && comoTexto(upd[c]) !== comoTexto(atual[c]))
  const auditoria = alterados.filter((c) => CAMPOS_AUDITADOS.includes(c)).map((campo) => ({
    chave_id: chave.id,
    chave_nome: chave.nome,
    lead_id: atual.id as string,
    rota,
    campo,
    valor_anterior: comoTexto(atual[campo]),
    valor_novo: comoTexto(upd[campo]),
  }))

  let ids: number[] = []
  if (auditoria.length) {
    const { data, error } = await db.from('api_auditoria').insert(auditoria).select('id')
    if (error) return { resposta: erro(500, 'Falha ao registrar auditoria') }
    ids = (data ?? []).map((r) => r.id as number)
  }

  const { error } = await db.from('leads').update(upd).eq('id', atual.id as string)
  if (error) {
    if (ids.length) await db.from('api_auditoria').delete().in('id', ids)
    return { resposta: erro(500, 'Falha ao atualizar lead') }
  }
  return { alterados }
}

export async function lerJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// ── Telefone ─────────────────────────────────────────────────
// Igual a crm_tel_norm no banco: só dígitos, com 55 na frente.
export function telNorm(t: string): string {
  const d = t.replace(/\D/g, '')
  return d.length === 10 || d.length === 11 ? '55' + d : d
}

// Variações para achar o mesmo número gravado com ou sem o 9 do celular.
export function telCandidatos(t: string): string[] {
  const n = telNorm(t)
  const out = new Set([n])
  if (n.startsWith('55') && n.length === 13 && n[4] === '9') out.add(n.slice(0, 4) + n.slice(5))
  if (n.startsWith('55') && n.length === 12 && /[6-9]/.test(n[4])) out.add(n.slice(0, 4) + '9' + n.slice(4))
  return Array.from(out)
}

// Aceita só número brasileiro: +55 + DDD + 8 ou 9 dígitos
export function telValido(t: string): boolean {
  const n = telNorm(t)
  return /^55[1-9][0-9]\d{8,9}$/.test(n)
}

// ── Data/hora de Brasília ────────────────────────────────────
// "2026-10-28T14:30:00-03:00" → { data: "2026-10-28", hora: "14:30" } no fuso de São Paulo
export function dataHoraBrasilia(iso: string): { data: string; hora: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(iso)) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  )
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

export const hojeBrasilia = () => dataHoraBrasilia(new Date().toISOString().replace(/\.\d+Z$/, 'Z'))!.data

// ── Histórico de movimentação (igual ao moveLead do app) ─────
export async function registrarMovimento(
  db: SupabaseClient, leadId: string, de: string | null, para: string, usuarioId: string, observacao: string,
) {
  await db.from('historico_movimentacoes').insert({
    id: crypto.randomUUID(),
    lead_id: leadId,
    de_status: de,
    para_status: para,
    usuario_id: usuarioId,
    data: new Date().toISOString(),
    observacao,
  })
}
