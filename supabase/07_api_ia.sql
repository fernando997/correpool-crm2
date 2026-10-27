-- ============================================================
-- 07_api_ia.sql  —  API de escrita para IAs (Vitor, SDR do WhatsApp 0800)
-- Rodar no Supabase SQL Editor. Idempotente (pode rodar de novo).
-- ============================================================

-- ── Leads: campos novos ─────────────────────────────────────
-- Lead criado pela IA ainda não tem closer
ALTER TABLE leads ALTER COLUMN vendedor_id DROP NOT NULL;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS faixa_capital TEXT
  CHECK (faixa_capital IN ('acima_150k','de_100k_a_150k','de_60k_a_100k','de_30k_a_60k','ate_30k','nao_informado'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prioridade TEXT
  CHECK (prioridade IN ('alta','media','menor'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS perfil TEXT
  CHECK (perfil IN ('novo_no_mercado','ja_conhece','locacao'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS criado_por TEXT;

-- ── Users: marcação de closer + usuário da IA ───────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS closer BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET closer = TRUE WHERE tipo = 'vendedor' AND nome IN ('Hercules', 'Matheus');

-- Autor das anotações/movimentações feitas pelo Vitor.
-- ativo = false e senha aleatória: não aparece nas listas e não faz login.
INSERT INTO users (id, nome, email, senha, tipo, ativo)
VALUES ('vitor-ia', 'Vitor (IA)', 'vitor-ia@sistema.crmmodocorre.com.br',
        md5(random()::text || clock_timestamp()::text) || md5(random()::text), 'sdr', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Chaves de API por IA (guarda só o hash) ─────────────────
CREATE TABLE IF NOT EXISTS api_chaves (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome              TEXT NOT NULL,
  prefixo           TEXT NOT NULL,
  hash              TEXT NOT NULL UNIQUE,
  escopos           TEXT[] NOT NULL DEFAULT '{}',
  usuario_id        TEXT REFERENCES users(id),
  limite_por_minuto INTEGER NOT NULL DEFAULT 60,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_em     TIMESTAMPTZ
);

-- Respostas guardadas por Idempotency-Key (mesma chamada repetida = mesma resposta)
CREATE TABLE IF NOT EXISTS api_idempotencia (
  chave_id   TEXT NOT NULL REFERENCES api_chaves(id) ON DELETE CASCADE,
  idem_key   TEXT NOT NULL,
  rota       TEXT NOT NULL,
  corpo_hash TEXT NOT NULL,
  status     INTEGER,
  resposta   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chave_id, idem_key)
);

-- Contador por chave e minuto (limite de requisições)
CREATE TABLE IF NOT EXISTS api_uso (
  chave_id TEXT NOT NULL REFERENCES api_chaves(id) ON DELETE CASCADE,
  janela   TIMESTAMPTZ NOT NULL,
  contagem INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chave_id, janela)
);

-- RLS ligado e SEM policy: só o servidor (service role) acessa estas tabelas
ALTER TABLE api_chaves       ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_idempotencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_uso          ENABLE ROW LEVEL SECURITY;

-- ── Funções ─────────────────────────────────────────────────
-- Telefone só com dígitos e com 55 na frente (10/11 dígitos = número nacional)
CREATE OR REPLACE FUNCTION crm_tel_norm(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(t, ''), '\D', '', 'g')) IN (10, 11)
      THEN '55' || regexp_replace(t, '\D', '', 'g')
    ELSE regexp_replace(coalesce(t, ''), '\D', '', 'g')
  END
$$;

CREATE INDEX IF NOT EXISTS leads_tel_norm_idx ON leads (crm_tel_norm(telefone));

-- Lead por telefone: ativo antes de declinado, depois o mais recente
CREATE OR REPLACE FUNCTION api_lead_por_telefone(p_candidatos TEXT[])
RETURNS SETOF leads
LANGUAGE sql STABLE AS $$
  SELECT * FROM leads
  WHERE crm_tel_norm(telefone) = ANY(p_candidatos)
  ORDER BY (status_funil <> 'declinado') DESC, created_at DESC NULLS LAST
  LIMIT 1
$$;

-- Soma 1 no minuto atual e devolve o total do minuto
CREATE OR REPLACE FUNCTION api_contar_uso(p_chave TEXT) RETURNS INTEGER
LANGUAGE sql AS $$
  INSERT INTO api_uso (chave_id, janela, contagem)
  VALUES (p_chave, date_trunc('minute', now()), 1)
  ON CONFLICT (chave_id, janela) DO UPDATE SET contagem = api_uso.contagem + 1
  RETURNING contagem
$$;

REVOKE EXECUTE ON FUNCTION api_lead_por_telefone(TEXT[]) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION api_contar_uso(TEXT) FROM anon, authenticated, public;
