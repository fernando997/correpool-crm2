-- ============================================================
-- 02_seed.sql  —  Rodar DEPOIS do 01_schema.sql
-- Idempotente: pode rodar mais de uma vez com segurança
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
INSERT INTO users (id, nome, email, senha, tipo, vendedor_vinculado) VALUES
  ('u1', 'Joao Silva',     'admin@correpool.com',   '123456', 'admin',    NULL),
  ('u2', 'Carlos Mendez',  'carlos@correpool.com',  '123456', 'vendedor', NULL),
  ('u3', 'Ana Souza',      'ana@correpool.com',     '123456', 'vendedor', NULL),
  ('u4', 'Pedro Lima',     'pedro@correpool.com',   '123456', 'sdr',      'u2'),
  ('u5', 'Mariana Costa',  'mariana@correpool.com', '123456', 'sdr',      'u3')
ON CONFLICT (id) DO NOTHING;

-- ── LEADS ────────────────────────────────────────────────────
INSERT INTO leads (id, nome, telefone, email, observacao, data_criacao, data_reuniao, hora_reuniao, link_meet, reuniao_agendada, temperatura, status_funil, vendedor_id, sdr_id, utm_source, utm_medium, utm_campaign, utm_content, utm_anuncio, utm_posicionamento, valor_contrato, valor_estimado, valor_fechado, data_primeiro_contato, tempo_resposta_segundos, motivo_perda, ultima_interacao_em) VALUES

-- FECHADOS
('l1','Rafael Torres','(11) 99234-5678','rafael.torres@email.com','Muito interessado no plano anual. Tomador de decisao.','2024-03-01','2024-03-05','10:00','https://meet.google.com/abc-defg-hij',TRUE,'muito_quente','fechado','u2','u4','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-001','feed',4800,4800,4800,'2024-03-01T10:00:00',420,NULL,'2024-03-07T10:00:00'),
('l2','Beatriz Nunes','(21) 98765-4321','beatriz.nunes@empresa.com','Diretora de marketing. Conhece bem o produto.','2024-03-03','2024-03-08','14:00','https://meet.google.com/xyz-uvwx-yz1',TRUE,'muito_quente','fechado','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-002','stories',7200,7200,7200,'2024-03-03T09:30:00',1800,NULL,'2024-03-08T15:00:00'),
('l3','Henrique Alves','(31) 97654-3210','henrique@consultoria.com','CEO de consultoria. Quer solucao completa.','2024-03-05','2024-03-10','09:00','https://meet.google.com/pqr-stuv-wx2',TRUE,'muito_quente','fechado','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-001','pesquisa',9600,9600,9600,'2024-03-05T09:00:00',540,NULL,'2024-03-10T11:00:00'),
('l4','Fernanda Gomes','(41) 96543-2109','fernanda@startup.io','Startup em crescimento. Orcamento aprovado.','2024-03-07','2024-03-12','15:30','https://meet.google.com/lmn-opqr-st3',TRUE,'muito_quente','fechado','u3','u5','instagram','social','remarketing_q1','video_resultado_antes_depois','AD-VRAD-001','reels',3600,3600,3600,'2024-03-07T14:00:00',3600,NULL,'2024-03-12T16:00:00'),
('l5','Diego Carvalho','(51) 95432-1098','diego.carvalho@agencia.com','Agencia de publicidade. 5 usuarios.','2024-03-10','2024-03-15','11:00','https://meet.google.com/efg-hijk-lm4',TRUE,'muito_quente','fechado','u2','u4','youtube','video','brand_awareness_q1','video_resultado_antes_depois','AD-VRAD-002','pre_roll',12000,12000,12000,'2024-03-10T10:00:00',480,NULL,'2024-03-15T12:00:00'),
('l6','Patricia Rocha','(61) 94321-0987','patricia@tech.com','Empresa de tecnologia. Plano enterprise.','2024-03-12','2024-03-18','16:00',NULL,TRUE,'muito_quente','fechado','u3','u5','facebook','cpc','lancamento_produto_q1','carrossel_beneficios','AD-CB-002','feed',18000,18000,18000,'2024-03-12T14:00:00',900,NULL,'2024-03-18T17:00:00'),

-- CONTRATO ASSINADO
('l7','Rodrigo Matos','(71) 93210-9876','rodrigo.matos@negocios.com','Assinou contrato ontem. Aguardando pagamento.','2024-03-15','2024-03-20','10:30',NULL,TRUE,'muito_quente','contrato_assinado','u2','u4','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-003','feed',6000,6000,NULL,'2024-03-15T09:00:00',7200,NULL,'2024-03-20T10:30:00'),
('l8','Camila Ferreira','(81) 92109-8765','camila@varejo.com','Contrato enviado e assinado. Muito animada.','2024-03-16','2024-03-21','14:30',NULL,TRUE,'muito_quente','contrato_assinado','u3','u5','instagram','social','remarketing_q1','reels_duvidas_frequentes','AD-RDF-001','reels',4200,4200,NULL,'2024-03-16T11:00:00',5400,NULL,'2024-03-21T15:00:00'),

-- CONTRATO ENVIADO
('l9','Lucas Barbosa','(91) 91098-7654','lucas@industria.com','Contrato enviado. Prazo de analise: 3 dias.','2024-03-18','2024-03-23','09:30',NULL,TRUE,'quente','contrato_enviado','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-003','pesquisa',7800,7800,NULL,'2024-03-18T10:00:00',3600,NULL,'2024-03-23T09:30:00'),
('l10','Isabela Monteiro','(11) 90987-6543','isabela@educacao.com','EdTech em expansao. Proposta de R$ 5k enviada.','2024-03-19','2024-03-24','11:30',NULL,TRUE,'quente','contrato_enviado','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-004','stories',5000,5000,NULL,'2024-03-19T13:00:00',2700,NULL,'2024-03-24T11:30:00'),

-- REUNIAO REALIZADA
('l11','Thiago Nascimento','(21) 89876-5432','thiago@saude.com','Reuniao muito boa. Disse que vai falar com socio.','2024-03-20','2024-03-25','10:00',NULL,TRUE,'quente','reuniao_realizada','u2','u4','instagram','social','remarketing_q1','video_resultado_antes_depois','AD-VRAD-003','stories',6600,6600,NULL,'2024-03-20T09:00:00',1200,NULL,'2024-03-25T11:00:00'),
('l12','Amanda Vieira','(31) 88765-4321','amanda@comercio.com','Dono de loja fisica + ecommerce. Interessado.','2024-03-21','2024-03-26','15:00',NULL,TRUE,'morno','reuniao_realizada','u3','u5','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-001','feed',2400,2400,NULL,'2024-03-21T14:00:00',86400,NULL,'2024-03-26T15:00:00'),
('l13','Gabriel Santos','(41) 87654-3210','gabriel@servicos.com','Empresa de servicos. Reuniao feita mas ficou em duvida sobre preco.','2024-03-22','2024-03-27','16:30',NULL,TRUE,'morno','reuniao_realizada','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-004','pesquisa',NULL,3000,NULL,'2024-03-22T15:00:00',43200,NULL,'2024-03-27T16:30:00'),

-- AGENDADOS
('l14','Leticia Campos','(51) 86543-2109','leticia@financas.com','CFO. Reuniao marcada para amanha.','2024-03-25','2024-04-01','09:00','https://meet.google.com/abc-1234-def',TRUE,'quente','agendado','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-005','feed',NULL,8400,NULL,'2024-03-25T10:00:00',600,NULL,'2024-03-26T10:00:00'),
('l15','Bruno Oliveira','(61) 85432-1098','bruno.oliveira@logistica.com','Empresa de logistica. Quer automatizar funil de vendas.','2024-03-26','2024-04-02','11:00','https://meet.google.com/ghi-5678-jkl',TRUE,'quente','agendado','u2','u4','youtube','video','brand_awareness_q1','video_resultado_antes_depois','AD-VRAD-004','in_stream',NULL,6000,NULL,'2024-03-26T09:00:00',480,NULL,'2024-03-27T09:00:00'),
('l16','Vanessa Ramos','(71) 84321-0987','vanessa@imobiliaria.com','Imobiliaria com 20 corretores. Alto potencial.','2024-03-27','2024-04-03','14:00','https://meet.google.com/mno-9012-pqr',TRUE,'muito_quente','agendado','u3','u5','instagram','social','remarketing_q1','reels_duvidas_frequentes','AD-RDF-002','reels',NULL,15000,NULL,'2024-03-27T12:00:00',1800,NULL,'2024-03-28T12:00:00'),
('l17','Eduardo Pinto','(81) 83210-9876','eduardo@juridico.com','Escritorio de advocacia. Reuniao confirmada.','2024-03-28','2024-04-04','10:30','https://meet.google.com/stu-3456-vwx',TRUE,'morno','agendado','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-002','feed',NULL,4500,NULL,'2024-03-28T11:00:00',7200,NULL,'2024-03-29T10:30:00'),
('l45','Rogerio Cunha','(11) 55432-1098','rogerio@mineracao.com','Grande empresa. Muito interesse.','2024-03-28','2024-04-05','09:00','https://meet.google.com/rog-mine-ral',TRUE,'quente','agendado','u2','u4','linkedin','social','lancamento_produto_q1','carrossel_beneficios','AD-CB-010','feed',NULL,24000,NULL,'2024-03-28T10:00:00',300,NULL,'2024-03-29T10:00:00'),
('l46','Adriana Lima','(21) 54321-0987','adriana@exportacao.com','Empresa exportadora. Agendado.','2024-03-29','2024-04-06','15:00','https://meet.google.com/adri-expo-rt',TRUE,'muito_quente','agendado','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-011','feed',NULL,9600,NULL,'2024-03-29T14:00:00',900,NULL,'2024-03-30T14:00:00'),

-- FOLLOWUP 3
('l18','Juliana Pereira','(91) 82109-8765','juliana@moda.com','Loja de moda. Sem resposta ha 4 dias.','2024-03-20',NULL,NULL,NULL,FALSE,'frio','followup3','u3','u5','instagram','social','remarketing_q1','banner_desconto_30','AD-BD30-003','feed',NULL,1800,NULL,'2024-03-20T14:00:00',172800,NULL,'2024-03-20T14:00:00'),
('l19','Marcos Dias','(11) 81098-7654','marcos.dias@construcao.com','Construtora. Pediu para ligar na proxima semana.','2024-03-21',NULL,NULL,NULL,FALSE,'morno','followup3','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-005','pesquisa',NULL,5400,NULL,'2024-03-21T10:00:00',86400,NULL,'2024-03-22T10:00:00'),
('l20','Carolina Lima','(21) 80987-6543','carolina@alimentacao.com','Rede de restaurantes. Interessada mas nao tem urgencia.','2024-03-22',NULL,NULL,NULL,FALSE,'morno','followup3','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-006','stories',NULL,3600,NULL,'2024-03-22T15:00:00',21600,NULL,'2024-03-23T15:00:00'),

-- FOLLOWUP 2
('l21','Felipe Azevedo','(31) 79876-5432','felipe@pet.com','Petshop com 3 unidades. Segundo followup enviado.','2024-03-24',NULL,NULL,NULL,FALSE,'frio','followup2','u2','u4','instagram','social','remarketing_q1','banner_desconto_30','AD-BD30-004','stories',NULL,1200,NULL,'2024-03-24T13:00:00',259200,NULL,'2024-03-24T13:00:00'),
('l22','Renata Silveira','(41) 78765-4321','renata@clinica.com','Clinica medica. Respondeu mas esta avaliando outros.','2024-03-25',NULL,NULL,NULL,FALSE,'morno','followup2','u3','u5','facebook','cpc','lancamento_produto_q1','reels_duvidas_frequentes','AD-RDF-003','feed',NULL,3600,NULL,'2024-03-25T11:00:00',14400,NULL,'2024-03-26T11:00:00'),
('l23','Gustavo Moreira','(51) 77654-3210','gustavo@auto.com','Concessionaria. Pediu apresentacao por email.','2024-03-26',NULL,NULL,NULL,FALSE,'morno','followup2','u2','u4','youtube','video','brand_awareness_q1','video_resultado_antes_depois','AD-VRAD-005','pre_roll',NULL,6000,NULL,'2024-03-26T15:00:00',7200,NULL,'2024-03-27T15:00:00'),
('l47','Nelson Teixeira','(31) 53210-9876','nelson@transporte.com','Empresa de transporte. Follow-up enviado.','2024-03-26',NULL,NULL,NULL,FALSE,'morno','followup2','u2','u4','youtube','video','brand_awareness_q1','reels_duvidas_frequentes','AD-RDF-006','in_stream',NULL,7200,NULL,'2024-03-26T12:00:00',10800,NULL,'2024-03-27T12:00:00'),

-- FOLLOWUP 1
('l24','Tatiana Freitas','(61) 76543-2109','tatiana@energia.com','Empresa de energia solar. Abriu a mensagem mas nao respondeu.','2024-03-27',NULL,NULL,NULL,FALSE,'frio','followup1','u3','u5','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-005','feed',NULL,2400,NULL,'2024-03-27T16:00:00',129600,NULL,'2024-03-27T16:00:00'),
('l25','Andre Cavalcante','(71) 75432-1098','andre@farmacia.com','Rede de farmacias. Primeiro followup enviado hoje.','2024-03-28',NULL,NULL,NULL,FALSE,'frio','followup1','u2','u4','instagram','social','remarketing_q1','reels_duvidas_frequentes','AD-RDF-004','explore',NULL,3000,NULL,'2024-03-28T10:00:00',28800,NULL,'2024-03-28T10:00:00'),
('l26','Priscila Ribeiro','(81) 74321-0987','priscila@escola.com','Escola particular. Respondeu com interesse.','2024-03-28',NULL,NULL,NULL,FALSE,'morno','followup1','u3','u5','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-006','pesquisa',NULL,4800,NULL,'2024-03-28T14:00:00',7200,NULL,'2024-03-29T14:00:00'),
('l48','Elisa Correia','(41) 52109-8765','elisa@design.com','Studio de design. Respondeu positivo.','2024-03-27',NULL,NULL,NULL,FALSE,'morno','followup1','u3','u5','instagram','social','remarketing_q1','video_resultado_antes_depois','AD-VRAD-008','reels',NULL,4800,NULL,'2024-03-27T11:00:00',3600,NULL,'2024-03-28T11:00:00'),

-- PRIMEIRO CONTATO
('l27','Vitor Mendes','(91) 73210-9876','vitor@hotel.com','Rede hoteleira. Primeiro contato feito via WhatsApp.','2024-03-29',NULL,NULL,NULL,FALSE,'frio','primeiro_contato','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-006','stories',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l28','Simone Tavares','(11) 72109-8765','simone@advocacia.com','Escritorio juridico. Aguardando retorno.','2024-03-29',NULL,NULL,NULL,FALSE,'frio','primeiro_contato','u3','u5','instagram','social','remarketing_q1','video_depoimento_cliente','AD-VDC-007','feed',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l29','Rodrigo Farias','(21) 71098-7654','rodrigo.farias@academia.com','Academia com 3 unidades. Muito receptivo.','2024-03-30',NULL,NULL,NULL,FALSE,'morno','primeiro_contato','u2','u4','youtube','video','brand_awareness_q1','video_resultado_antes_depois','AD-VRAD-006','bumper',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l30','Natalia Costa','(31) 70987-6543','natalia@beleza.com','Rede de saloes. Primeiro contato feito. Retorno pendente.','2024-03-30',NULL,NULL,NULL,FALSE,'frio','primeiro_contato','u3','u5','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-007','feed',NULL,NULL,NULL,NULL,NULL,NULL,NULL),

-- TRAFEGO PAGO
('l31','Alexandre Borges','(41) 69876-5432','alexandre@seg.com','','2024-04-01',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u2','u4','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-008','feed',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l32','Monica Leal','(51) 68765-4321','monica@rh.com','','2024-04-01',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u3','u5','instagram','social','remarketing_q1','carrossel_beneficios','AD-CB-007','explore',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l33','Cristiano Prado','(61) 67654-3210','cristiano@infra.com','','2024-04-02',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-008','stories',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l34','Eliane Santos','(71) 66543-2109','eliane@consultoria.com','','2024-04-02',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u3','u5','google','cpc','search_marca_q1','video_depoimento_cliente','AD-VDC-009','pesquisa',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l35','Marcelo Vianna','(81) 65432-1098','marcelo@contabil.com','','2024-04-03',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u2','u4','youtube','video','brand_awareness_q1','video_resultado_antes_depois','AD-VRAD-007','pre_roll',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l36','Debora Assis','(91) 64321-0987','debora@mktdigital.com','','2024-04-03',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u3','u5','instagram','social','remarketing_q1','reels_duvidas_frequentes','AD-RDF-005','reels',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l37','Leonardo Castro','(11) 63210-9876','leonardo@imoveis.com','','2024-04-04',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-009','feed',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l38','Sandra Moura','(21) 62109-8765','sandra@saas.com','','2024-04-04',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u3','u5','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-008','pesquisa',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l49','Walter Soares','(51) 51098-7654','walter@rural.com','Agronegocio. Entrou via Google.','2024-04-04',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-011','pesquisa',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('l50','Fatima Barros','(61) 50987-6543','fatima@turismo.com','Agencia de turismo.','2024-04-05',NULL,NULL,NULL,FALSE,'frio','trafego_pago','u3','u5','facebook','cpc','lancamento_produto_q1','carrossel_beneficios','AD-CB-012','feed',NULL,NULL,NULL,NULL,NULL,NULL,NULL),

-- DECLINADOS
('l39','Sergio Lopes','(31) 61098-7654','sergio@papelaria.com','Nao tem orcamento agora. Voltar em 6 meses.','2024-02-15',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-010','feed',NULL,NULL,NULL,NULL,NULL,'sem_dinheiro','2024-02-22T10:00:00'),
('l40','Aline Queiroz','(41) 60987-6543','aline@grafica.com','Fechou com concorrente. Preco mais baixo.','2024-02-18',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u3','u5','instagram','social','remarketing_q1','banner_desconto_30','AD-BD30-011','stories',NULL,NULL,NULL,NULL,NULL,'concorrente','2024-02-20T09:00:00'),
('l41','Caio Fernandez','(51) 59876-5432','caio@micro.com','Microempresa. Nao tem fit com o produto.','2024-02-20',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u2','u4','facebook','cpc','lancamento_produto_q1','banner_desconto_30','AD-BD30-012','feed',NULL,NULL,NULL,NULL,NULL,'lead_ruim','2024-02-23T11:00:00'),
('l42','Nayara Braga','(61) 58765-4321','nayara@artesanato.com','Negocio muito pequeno. Sem fit.','2024-02-22',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u3','u5','instagram','social','remarketing_q1','banner_desconto_30','AD-BD30-013','feed',NULL,NULL,NULL,NULL,NULL,'lead_ruim','2024-02-24T10:00:00'),
('l43','Hugo Barreto','(71) 57654-3210','hugo@startup2.com','Sem orcamento. Pre-revenue.','2024-03-01',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u2','u4','google','cpc','search_marca_q1','carrossel_beneficios','AD-CB-009','pesquisa',NULL,NULL,NULL,NULL,NULL,'sem_dinheiro','2024-03-03T09:00:00'),
('l44','Viviane Pires','(81) 56543-2109','viviane@ong.org','ONG sem recursos. Nao e cliente ideal.','2024-03-05',NULL,NULL,NULL,FALSE,'desqualificado','declinado','u3','u5','facebook','cpc','lancamento_produto_q1','video_depoimento_cliente','AD-VDC-010','feed',NULL,NULL,NULL,NULL,NULL,'sem_interesse','2024-03-07T10:00:00')

ON CONFLICT (id) DO NOTHING;

-- ── ANOTACOES ────────────────────────────────────────────────
INSERT INTO anotacoes (id, lead_id, usuario_id, texto, created_at) VALUES
  ('a1','l1','u4','Rafael demonstrou muito interesse no plano anual. Ele ja usa um concorrente mas esta insatisfeito com o suporte.','2024-03-02T10:30:00'),
  ('a2','l1','u2','Reuniao excelente. Falamos por 45 min. Ele quer fechar mas precisa de NF. Enviei proposta por email.','2024-03-05T11:00:00'),
  ('a3','l1','u2','Contrato assinado! Rafael confirmou pagamento via boleto para dia 10.','2024-03-06T14:00:00'),
  ('a4','l2','u5','Beatriz pediu uma demonstracao do produto antes da reuniao. Enviei o link do tour guiado.','2024-03-04T09:00:00'),
  ('a5','l2','u3','Demo excelente. Ela ja tem budget aprovado para Q1. Negocio pratico.','2024-03-08T15:00:00'),
  ('a6','l14','u5','Leticia e CFO de fintech. Equipe de 8 vendedores. Alto potencial.','2024-03-26T10:00:00'),
  ('a7','l15','u4','Bruno viu o video no YouTube e clicou direto. Muito engajado na conversa inicial.','2024-03-27T09:00:00'),
  ('a8','l11','u2','Reuniao realizada. Thiago gostou da proposta mas quer consultar socio. Follow-up em 2 dias.','2024-03-25T11:00:00')
ON CONFLICT (id) DO NOTHING;

-- ── HISTORICO MOVIMENTACOES ───────────────────────────────────
INSERT INTO historico_movimentacoes (id, lead_id, de_status, para_status, usuario_id, data, observacao) VALUES
  ('h1','l1',NULL,'trafego_pago','u1','2024-03-01T08:00:00','Lead cadastrado automaticamente via webhook'),
  ('h2','l1','trafego_pago','primeiro_contato','u4','2024-03-01T10:00:00',NULL),
  ('h3','l1','primeiro_contato','agendado','u4','2024-03-02T14:00:00','Reuniao agendada para 05/03 as 10h'),
  ('h4','l1','agendado','reuniao_realizada','u2','2024-03-05T11:00:00',NULL),
  ('h5','l1','reuniao_realizada','contrato_enviado','u2','2024-03-05T14:00:00',NULL),
  ('h6','l1','contrato_enviado','contrato_assinado','u2','2024-03-06T09:00:00',NULL),
  ('h7','l1','contrato_assinado','fechado','u2','2024-03-07T10:00:00','Pagamento confirmado')
ON CONFLICT (id) DO NOTHING;

-- ── ALERTAS ──────────────────────────────────────────────────
INSERT INTO alertas (id, lead_id, tipo, mensagem, resolvido, created_at) VALUES
  ('alrt1','l18','followup_atrasado','Follow-up atrasado: Juliana Pereira parada no Follow-up 3 ha 4 dias',FALSE,'2024-03-25T08:00:00'),
  ('alrt2','l21','lead_parado','Felipe Azevedo sem interacao ha 3 dias — risco de perda',FALSE,'2024-03-28T08:00:00'),
  ('alrt3','l24','followup_atrasado','Follow-up atrasado: Tatiana Freitas no Follow-up 1 ha 2 dias',FALSE,'2024-03-28T09:00:00'),
  ('alrt4','l14','reuniao_proxima','Reuniao com Leticia Campos amanha as 09h — confirme presenca',FALSE,'2024-04-01T07:00:00'),
  ('alrt5','l16','reuniao_proxima','Reuniao com Vanessa Ramos em 2 dias as 14h — prepare a apresentacao',FALSE,'2024-04-02T09:00:00'),
  ('alrt6','l19','lead_parado','Marcos Dias parado no Follow-up 3 ha 5 dias sem resposta',FALSE,'2024-03-27T08:00:00'),
  ('alrt7','l45','reuniao_proxima','Reuniao com Rogerio Cunha (R$ 24.000 potencial) amanha as 09h',FALSE,'2024-04-04T09:00:00')
ON CONFLICT (id) DO NOTHING;
