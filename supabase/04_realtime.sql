-- ============================================================
-- 04_realtime.sql — Rodar no Supabase SQL Editor
-- Habilita Realtime nas tabelas principais
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE anotacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE historico_movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE alertas;
