-- ============================================================
-- 08_api_ia_camila.sql  —  API da IA: número novo da Camila
-- UTM/origem/SDR pela chave, Fila como closer, leitura de anotações
-- e auditoria das alterações. Rodar no Supabase SQL Editor.
-- Idempotente (pode rodar de novo).
-- ============================================================

-- ── Camila (IA): autora das ações do número novo ────────────
-- Igual ao Vitor: ativo = false e senha aleatória (não faz login).
INSERT INTO users (id, nome, email, senha, tipo, ativo)
VALUES ('camila-ia', 'Camila (IA)', 'camila-ia@sistema.crmmodocorre.com.br',
        md5(random()::text || clock_timestamp()::text) || md5(random()::text), 'sdr', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Filas: closer que recebe lead, mas não recebe reunião ───
ALTER TABLE users ADD COLUMN IF NOT EXISTS fila BOOLEAN NOT NULL DEFAULT FALSE;

-- Fila Camila (sem resposta) vira closer ativo, como Hercules e Matheus
UPDATE users SET closer = TRUE, fila = TRUE
WHERE id = '8191ce3d-6e1e-4568-bdde-18d2e7591b7c';

-- ── Chave do Vitor (usada também pela Camila) lê anotações ──
UPDATE api_chaves SET escopos = array_append(escopos, 'anotacoes:ler')
WHERE nome = 'vitor' AND NOT ('anotacoes:ler' = ANY (escopos));

-- ── Auditoria ───────────────────────────────────────────────
-- Toda mudança de UTM, origem, SDR ou closer feita por chave de IA em lead
-- que já existe fica aqui, com o valor anterior e o novo.
CREATE TABLE IF NOT EXISTS api_auditoria (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chave_id       TEXT NOT NULL REFERENCES api_chaves(id),
  chave_nome     TEXT NOT NULL,
  lead_id        TEXT NOT NULL,   -- sem FK: o registro continua mesmo se o lead for apagado
  rota           TEXT NOT NULL,
  campo          TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_auditoria_lead_idx ON api_auditoria (lead_id, created_at);
CREATE INDEX IF NOT EXISTS api_auditoria_data_idx ON api_auditoria (created_at);

-- RLS ligado e SEM policy: só o servidor (service role) acessa
ALTER TABLE api_auditoria ENABLE ROW LEVEL SECURITY;

-- ── Conferência (cada uma deve devolver 1 linha) ────────────
-- SELECT id, nome, tipo, ativo FROM users WHERE id = 'camila-ia';
-- SELECT nome, closer, fila, ativo FROM users WHERE id = '8191ce3d-6e1e-4568-bdde-18d2e7591b7c';
-- SELECT nome, escopos FROM api_chaves WHERE nome = 'vitor';
-- SELECT count(*) FROM api_auditoria;
