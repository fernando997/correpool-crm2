-- ============================================================
-- 03_auto_id.sql — Rodar no Supabase SQL Editor
-- Gera id automático: api_001, api_002… via trigger
-- ============================================================

-- Limpa tentativa anterior se existir
ALTER TABLE leads ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS leads_api_seq;

-- Cria a sequência
CREATE SEQUENCE leads_api_seq START 1;

-- Função trigger com SECURITY DEFINER
-- (roda com permissão do dono da tabela, não do anon)
CREATE OR REPLACE FUNCTION set_lead_auto_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'api_' || lpad(nextval('leads_api_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anexa o trigger à tabela
DROP TRIGGER IF EXISTS lead_auto_id_trigger ON leads;
CREATE TRIGGER lead_auto_id_trigger
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_auto_id();
