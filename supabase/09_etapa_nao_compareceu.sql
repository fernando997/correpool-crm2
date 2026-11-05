-- ============================================================
-- 09_etapa_nao_compareceu.sql  —  Etapa "Não compareceu" no funil
-- Lead que agendou reunião e faltou. Rodar no Supabase SQL Editor
-- ANTES do deploy do código. Idempotente (pode rodar de novo).
-- ============================================================

-- As regras (CHECK) de etapa do banco real podem ter nomes diferentes dos
-- arquivos 01_*.sql. Por isso: acha as que existem, apaga e recria com a
-- lista completa (as 11 etapas de antes + nao_compareceu).
DO $$
DECLARE
  c RECORD;
BEGIN
  -- leads.status_funil
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status_funil%'
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.leads ADD CONSTRAINT leads_status_funil_check CHECK (status_funil IN (
    'trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado',
    'nao_compareceu','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado'));

  -- historico_movimentacoes.de_status / para_status
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.historico_movimentacoes'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%de_status%' OR pg_get_constraintdef(oid) ILIKE '%para_status%')
  LOOP
    EXECUTE format('ALTER TABLE public.historico_movimentacoes DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.historico_movimentacoes ADD CONSTRAINT historico_movimentacoes_de_status_check CHECK (de_status IN (
    'trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado',
    'nao_compareceu','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado'));

  ALTER TABLE public.historico_movimentacoes ADD CONSTRAINT historico_movimentacoes_para_status_check CHECK (para_status IN (
    'trafego_pago','primeiro_contato','followup1','followup2','followup3','agendado',
    'nao_compareceu','reuniao_realizada','contrato_enviado','contrato_assinado','fechado','declinado'));
END $$;

-- ── Conferência (deve listar as 3 regras, todas com nao_compareceu) ──
-- SELECT conrelid::regclass AS tabela, conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE contype = 'c' AND conrelid IN ('public.leads'::regclass, 'public.historico_movimentacoes'::regclass)
--   AND pg_get_constraintdef(oid) ILIKE '%nao_compareceu%';
