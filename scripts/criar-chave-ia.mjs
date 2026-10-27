// Cria uma chave de API para uma IA (ex.: Vitor) e mostra a chave UMA vez.
// No banco fica só o sha256. Uso:
//   node scripts/criar-chave-ia.mjs vitor
// Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env.local.
import { readFileSync } from 'fs'
import { randomBytes, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const PERFIS = {
  vitor: {
    nome: 'vitor',
    usuario_id: 'vitor-ia',
    escopos: ['leads:buscar', 'leads:escrever', 'leads:atribuir', 'anotacoes:criar', 'vendedores:listar'],
    limite_por_minuto: 60,
  },
}

const perfil = PERFIS[process.argv[2]]
if (!perfil) {
  console.error(`Uso: node scripts/criar-chave-ia.mjs <${Object.keys(PERFIS).join('|')}>`)
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const chave = `crmia_${perfil.nome}_${randomBytes(32).toString('base64url')}`
const { error } = await db.from('api_chaves').insert({
  nome: perfil.nome,
  prefixo: chave.slice(0, 14),
  hash: createHash('sha256').update(chave).digest('hex'),
  escopos: perfil.escopos,
  usuario_id: perfil.usuario_id,
  limite_por_minuto: perfil.limite_por_minuto,
})
if (error) {
  console.error('Erro ao gravar a chave:', error.message)
  process.exit(1)
}
console.log(`\nChave criada para "${perfil.nome}". Copie agora, ela NÃO aparece de novo:\n\n${chave}\n`)
console.log('Para desativar depois: UPDATE api_chaves SET ativo = false WHERE prefixo = \'' + chave.slice(0, 14) + '\';')
