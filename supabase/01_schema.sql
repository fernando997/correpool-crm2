-- ============================================================
-- 01_schema.sql  —  Rodar PRIMEIRO no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('admin','vendedor','sdr')),
  vendedor_vinculado TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  observacao TEXT NOT NULL DEFAULT '',
  data_criacao DATE NOT NULL,
  data_reuniao DATE,
  hora_reuniao TEXT,
  link_meet TEXT,
  reuniao_agendada BOOLEAN NOT NULL DEFAULT FALSE,
  temperatura TEXT NOT NULL CHECK (temperatura IN ('frio','morno','quente','muito_quente','desqualificado')),
  status_funil TEXT NOT NULL CHECK (status_funil IN ('trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado')),
  vendedor_id TEXT NOT NULL REFERENCES users(id),
  sdr_id TEXT REFERENCES users(id),
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  utm_term TEXT, utm_anuncio TEXT, utm_posicionamento TEXT,
  valor_contrato NUMERIC, valor_estimado NUMERIC, valor_fechado NUMERIC,
  data_primeiro_contato TIMESTAMPTZ,
  tempo_resposta_segundos INTEGER,
  motivo_perda TEXT CHECK (motivo_perda IN ('sem_interesse','sem_dinheiro','nao_respondeu','timing_ruim','lead_ruim','concorrente')),
  score_lead INTEGER,
  ultima_interacao_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS anotacoes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES users(id),
  texto TEXT NOT NULL DEFAULT '',
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historico_movimentacoes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  de_status TEXT CHECK (de_status IN ('trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado')),
  para_status TEXT NOT NULL CHECK (para_status IN ('trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado')),
  usuario_id TEXT NOT NULL REFERENCES users(id),
  data TIMESTAMPTZ NOT NULL,
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS alertas (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('lead_parado','followup_atrasado','reuniao_proxima')),
  mensagem TEXT NOT NULL,
  resolvido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_leads" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_anot"  ON anotacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_hist"  ON historico_movimentacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_alertas" ON alertas FOR ALL TO anon USING (true) WITH CHECK (true);
