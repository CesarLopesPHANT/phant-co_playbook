-- ============================================================
-- SEED: Importação de clientes Leadbox (CSV Conciliação)
-- Execute APÓS o setup.sql (que cria colunas cnpj, assinatura_descricao, forma_pagamento)
-- Este script NÃO apaga dados — apenas atualiza existentes e insere novos
-- ============================================================

-- ============================================================
-- PARTE 1: Atualizar clientes que já existem (match por nome)
-- Adiciona marca Leadbox + dados complementares
-- ============================================================

-- ADELAIR (já existe como ADELAIR — cliente Phant + Leadbox)
UPDATE public.clients SET
  brands = '{"phant":{"active":true,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
  cnpj = '52258696100',
  mrr = GREATEST(mrr, 100),
  assinatura_descricao = 'Assinatura LeadBox: 1 WhatsApp, 1 Facebook, 1 Instagram, 3 Usuários',
  forma_pagamento = 'Boleto Bancário'
WHERE UPPER(company_name) LIKE '%ADELAIR%';

-- LIMPIFIC (já existe como LIMPIFIC no seed-clients — cliente Phant + Leadbox, cancelado na Leadbox)
UPDATE public.clients SET
  brands = '{"phant":{"active":true,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
  cnpj = '18828745000109',
  assinatura_descricao = 'Assinatura Leadbox: 15 usuários, 1 Rede Social, 1 WhatsApp',
  forma_pagamento = 'Cartão de Crédito'
WHERE UPPER(company_name) LIKE '%LIMPIFIC%';

-- ECOPOWER CUIABÁ (já existe no seed-clients — mesmo que ENERGIA SOLAR CUIABANA na Leadbox)
UPDATE public.clients SET
  brands = '{"phant":{"active":true,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
  cnpj = '44662626000139',
  assinatura_descricao = 'Assinatura Leadbox: 1 WhatsApp, 1 Instagram, 1 Facebook, 5 Usuários',
  forma_pagamento = 'Boleto Bancário'
WHERE UPPER(company_name) LIKE '%ECOPOWER CUIAB%';

-- QUARTER (já existe no seed-clients — mesmo que TORQUATO CONTABILIDADE na Leadbox)
UPDATE public.clients SET
  brands = '{"phant":{"active":true,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
  cnpj = '37347975000109',
  assinatura_descricao = 'Assinatura Starter: 1 WhatsApp, 1 Instagram, 1 Facebook, 3 Usuários',
  forma_pagamento = 'Pergunte ao cliente'
WHERE UPPER(company_name) LIKE '%QUARTER%';

-- ============================================================
-- PARTE 2: Inserir novos clientes Leadbox
-- Todos marcados com Leadbox ativo; Phant inativo (são clientes Leadbox puros)
-- ============================================================

INSERT INTO public.clients (
  company_name, industry, location, status,
  fee, mrr, contract_model, squad_name,
  health, health_status,
  contact, brands, cnpj,
  assinatura_descricao, forma_pagamento,
  churn_status, assinatura_date
) VALUES

-- 1. ADVOCACIA DEISI VIEIRA FERREIRA
('ADVOCACIA DEISI VIEIRA FERREIRA', 'Servicos', '', 'active',
 449, 449, 'Growth', '-',
 'safe', 'safe',
 '{"name":"Deisi Vieira Ferreira","email":"","phone":"66996205110"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '33804135000169',
 'Assinatura Leadbox: 01 Whatsapp, 01 Rede social, 03 Usuários',
 'Cartão de Crédito',
 '{"renewal_date":"2026-05-11","contract_months":12}'::jsonb, '2026-05-11'),

-- 2. AMIGÃO BORRACHAS E FERRAMENTAS (4DI COMERCIO)
('AMIGÃO BORRACHAS E FERRAMENTAS', 'Varejo', '', 'active',
 689, 689, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"6630249685"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '08701480000120',
 'Assinatura Plataforma Leadbox: 2 WhatsApp, 1 Rede Social, 30 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-20","contract_months":12}'::jsonb, '2026-05-20'),

-- 3. AUTO PEÇAS XINGU
('AUTO PEÇAS XINGU', 'Varejo', '', 'active',
 549, 549, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66992418757"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '32952970000183',
 'Assinatura Plataforma Leadbox: 2 WhatsApp, 1 Rede Social, 15 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-06-03","contract_months":12}'::jsonb, '2026-06-03'),

-- 4. CASIMA MATERIAIS ELÉTRICOS
('CASIMA MATERIAIS ELÉTRICOS', 'Varejo', '', 'active',
 505, 505, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"44984146822"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '48319723000184',
 'Assinatura Leadbox: 01 Whatsapp, 06 Usuários (03 bonificados)',
 'Cartão de Crédito',
 '{"renewal_date":"2026-05-15","contract_months":12}'::jsonb, '2026-05-15'),

-- 5. CGC ESTÉTICA AVANÇADA
('CGC ESTÉTICA AVANÇADA', 'Saúde/Clinica', '', 'active',
 499, 499, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"21964978798"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '55534786000119',
 'Assinatura: 1 whatsapp, 1 instagram, 3 usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-19","contract_months":12}'::jsonb, '2026-05-19'),

-- 6. ECOPOWER CACOAL-RO
('ECOPOWER CACOAL-RO', 'Energia Solar', 'Cacoal - RO', 'active',
 549, 549, 'Growth', '-',
 'safe', 'safe',
 '{"name":"Leandro Dias Martins","email":"","phone":"69999376016"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '37233395000182',
 'Assinatura Leadbox: 1 WhatsApp, 1 Rede Social, 17 Usuários (9 Bon.)',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-07","contract_months":12}'::jsonb, '2026-05-07'),

-- 7. ECOPOWER PAROBÉ-RS
('ECOPOWER PAROBÉ-RS', 'Energia Solar', 'Parobé - RS', 'active',
 599, 599, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"51997515814"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '37146740000140',
 'Assinatura Leadbox: 1 WhatsApp, 1 Rede Social, 10 Usuários, 1 Funil de Mensagens',
 'Pix',
 '{"renewal_date":"2026-05-29","contract_months":12}'::jsonb, '2026-05-29'),

-- 8. EDEN GRÁFICA (LBSign)
('EDEN GRÁFICA', 'Servicos', '', 'active',
 39.90, 39.90, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"17981147007"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '45128907000179',
 'Assinatura LBSign: 50 documentos/mês, Usuários ilimitados, Com API, Suporte prioritário',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-20","contract_months":12}'::jsonb, '2026-05-20'),

-- 9. ESTOFARIA DA LINHA (cancelado)
('ESTOFARIA DA LINHA', 'Servicos', '', 'churned',
 449, 0, 'Growth', '-',
 'danger', 'churn',
 '{"name":"","email":"","phone":"66984351145"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '37433703000113',
 'Assinatura Leadbox: 1 WhatsApp, 2 Instagram, 10 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-26","contract_months":12}'::jsonb, '2026-05-26'),

-- 10. F.A.B. / MEDICSKIN STORE CG (Grupo E.M.)
('F.A.B. / MEDICSKIN STORE CG (GRUPO E.M.)', 'Saúde/Clinica', '', 'active',
 800, 800, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"67999473258"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '48358846000124',
 'Assinatura Leadbox: Instituto F.A.B.: 1 WhatsApp, 1 Rede Social, 7 Usuários | MedicSkin Clínica CG: 2 WhatsApp, 1 Rede Social, 4 Usuários | MedickSkin Loja CG: 1 WhatsApp, 1 Rede Social, 5 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-20","contract_months":12}'::jsonb, '2026-05-20'),

-- 11. FC OKADA MÓVEIS
('FC OKADA MÓVEIS', 'Movelaria', '', 'active',
 391.50, 391.50, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"44991112685"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '20109959000177',
 'Assinatura Leadbox: 4 Whatsapp, 3 Usuários (Rateado 50% c/ Móveis Modernos)',
 'Cartão de Crédito',
 '{"renewal_date":"2026-05-22","contract_months":12}'::jsonb, '2026-05-22'),

-- 12. GRAU CALIANI ELETROS
('GRAU CALIANI ELETROS', 'Varejo', '', 'active',
 455, 455, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"44997056716"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '49778818000129',
 'Assinatura Leadbox: 2 WhatsApp, 4 usuários',
 'Pix',
 '{"renewal_date":"2026-05-28","contract_months":12}'::jsonb, '2026-05-28'),

-- 13. INSANOS RONDONÓPOLIS
('INSANOS RONDONÓPOLIS', 'Saúde/Clinica', 'Rondonópolis - MT', 'active',
 499, 499, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"65999590341"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '52687798000195',
 'Assinatura plataforma Leadbox: 1 WhatsApp, 1 Rede Social, 3 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-11","contract_months":12}'::jsonb, '2026-05-11'),

-- 14. INSANOS SORRISO-MT
('INSANOS SORRISO-MT', 'Saúde/Clinica', 'Sorriso - MT', 'active',
 469, 469, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66984272053"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '59023596000198',
 'Assinatura: 1 Whatsapp, 1 Instagram, 2 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL),

-- 15. KALHANDRA UNIFORMES SOCIAIS
('KALHANDRA UNIFORMES SOCIAIS', 'Varejo', '', 'active',
 970, 970, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"16997084046"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '04004010000156',
 'Assinatura LeadBox: 2 canais, 7 usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-10","contract_months":12}'::jsonb, '2026-05-10'),

-- 16. LIMPIFIC → movido para PARTE 1 (UPDATE), já existe no seed-clients

-- 17. MEDICSKIN SAÚDE E ESTÉTICA (Clínica ROO)
('MEDICSKIN CLÍNICA ROO (GRUPO E.M.)', 'Saúde/Clinica', 'Rondonópolis - MT', 'active',
 600, 600, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"67999473258"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '33372926000167',
 'MedicSkin Loja Roo: 1 WhatsApp, 1 Rede Social, 4 Usuários | MedicSkin Clínica Roo: 1 WhatsApp, 1 Rede Social, 4 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-20","contract_months":12}'::jsonb, '2026-05-20'),

-- 18. MULTI INFORMÁTICA
('MULTI INFORMÁTICA', 'Tecnologia', '', 'active',
 959, 959, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996711748"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '06077120000173',
 'Assinatura Leadbox: 3 WhatsApp, 1 Rede Social, 20 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-10","contract_months":12}'::jsonb, '2026-05-10'),

-- 19. MUNDIAL AR REFRIGERAÇÃO
('MUNDIAL AR REFRIGERAÇÃO', 'Servicos', '', 'active',
 450, 450, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996520365"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '36337071000121',
 'Assinatura LeadBox: 1 Canal WhatsApp, 2 Canais Social Media, 5 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-26","contract_months":12}'::jsonb, '2026-05-26'),

-- 20. SCAN TRUCK
('SCAN TRUCK CENTER', 'Servicos', '', 'active',
 559, 559, 'Growth', '-',
 'safe', 'safe',
 '{"name":"Maríla Santos de Almeida","email":"","phone":"66996859227"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '24140195000133',
 'Assinatura Leadbox: 1 WhatsApp, 1 Rede Social, 11 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-21","contract_months":12}'::jsonb, '2026-05-21'),

-- 21. STTRR (Sindicato Transportes)
('STTRR', 'Servicos', 'Rondonópolis - MT', 'active',
 499, 499, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66999824915"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '24774242000109',
 'Assinatura Plataforma Leadbox: 1 WhatsApp, 1 Rede Social, 10 Usuários (7 Bonificados)',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-20","contract_months":12}'::jsonb, '2026-05-20'),

-- 22. TORQUATO CONTABILIDADE (Quarter) → movido para PARTE 1 (UPDATE), já existe como QUARTER no seed-clients

-- 23. ULTRASAFRA (Fenix Fertilizantes)
('ULTRASAFRA', 'Industria', '', 'active',
 1424, 1424, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"17991792312"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '10363747000168',
 'Assinatura Plataforma Leadbox: 1 WhatsApp, 1 Rede social, 50 usuários (10 bonificados)',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-13","contract_months":12}'::jsonb, '2026-05-13'),

-- 24. VIVEMUS CLÍNICA DIGITAL
('VIVEMUS CLÍNICA DIGITAL', 'Saúde/Clinica', '', 'active',
 200, 200, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996798754"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '46567089000173',
 'Assinatura Leadbox',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-14","contract_months":12}'::jsonb, '2026-05-14'),

-- 25. ALUGA AR (Aporte IA)
('ALUGA AR', 'Servicos', '', 'active',
 200, 200, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996520365"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '58554815000100',
 'APORTE IA: 21 milhões tokens mensagens, 100 min áudio-texto',
 'Pix',
 '{"renewal_date":"2026-06-02","contract_months":12}'::jsonb, '2026-06-02'),

-- 26. ENERGIA SOLAR CUIABANA (Ecopower) → movido para PARTE 1 (UPDATE), já existe como ECOPOWER CUIABÁ no seed-clients

-- 27. LK LOCAÇÃO E VENDA DE EQUIPAMENTOS
('LK LOCAÇÃO E VENDA DE EQUIPAMENTOS', 'Servicos', '', 'active',
 509, 509, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"51999009968"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '28941564000148',
 'Assinatura Leadbox: 1 Whatsapp, 5 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-23","contract_months":12}'::jsonb, '2026-05-23'),

-- 28. MARIAH ILUMINAÇÃO
('MARIAH ILUMINAÇÃO', 'Varejo', '', 'active',
 497, 497, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996060085"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '09666842000151',
 'Assinatura LeadBox: 2 canais WhatsApp, 2 canais redes sociais, 5 usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-10","contract_months":12}'::jsonb, '2026-05-10'),

-- 29. ZION WEAR (Phant CNP Alessandro)
('ZION WEAR / IMPORTS E VARIEDADES', 'Varejo', '', 'active',
 450, 450, 'Growth', '-',
 'safe', 'safe',
 '{"name":"Alessandro","email":"","phone":"65996848018"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '24582188000191',
 'Assinatura Leadbox: Zion Wear (1 whatsapp, 1 Instagram) + Imports e Variedades (2 Whatsapp, 1 Instagram)',
 'Cartão de Crédito',
 '{"renewal_date":"2026-05-28","contract_months":12}'::jsonb, '2026-05-28'),

-- 30. SUPREMA CLÍNICA DE DIAGNÓSTICO
('SUPREMA CLÍNICA DE DIAGNÓSTICO', 'Saúde/Clinica', '', 'active',
 608.57, 608.57, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66992578080"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '22333581000116',
 'Assinatura LeadBox: 1 Canal Instagram/Facebook, 2 Canais WhatsApp, 6 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"2026-05-10","contract_months":12}'::jsonb, '2026-05-10'),

-- 31. IVECANIA MECÂNICA DIESEL
('IVECANIA MECÂNICA DIESEL', 'Servicos', '', 'active',
 700, 700, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996958623"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '10792980000247',
 'Assinatura Leadbox: 1 Whatsapp, 1 Rede social, 18 Usuários (8 bonificados)',
 'Cartão de Crédito',
 '{"renewal_date":"2026-05-23","contract_months":12}'::jsonb, '2026-05-23'),

-- 32. BORDADO FOTOGRAFIA
('BORDADO FOTOGRAFIA', 'Servicos', '', 'active',
 500, 500, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996865891"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '62680173000155',
 'Assinatura LeadBox: 2 WhatsApp, 6 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"2026-05-21","contract_months":12}'::jsonb, '2026-05-21'),

-- 33. DR.VET CLÍNICA VETERINÁRIA
('DR.VET CLÍNICA VETERINÁRIA', 'Saúde/Clinica', '', 'active',
 499, 499, 'Growth', '-',
 'safe', 'safe',
 '{"name":"","email":"","phone":"66996705466"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '16749775000102',
 'Assinatura Leadbox: 1 Whatsapp, 1 Rede Social, 3 Usuários',
 'Cartão de Crédito',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL),

-- 34. EVEREST (cancelado)
('EVEREST SOLUÇÕES EM TELECOMUNICAÇÕES', 'Telecom', '', 'churned',
 600, 0, 'Growth', '-',
 'danger', 'churn',
 '{"name":"","email":"","phone":"65999582431"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '03967020000124',
 'Assinatura Leadbox: 2 WhatsApp, 1 Rede Social, 8 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL),

-- 35. RT VIAGENS E TURISMO
('RT VIAGENS E TURISMO', 'Servicos', '', 'active',
 350, 350, 'Growth', '-',
 'safe', 'safe',
 '{"name":"Tânia Dias Martins","email":"","phone":"69981275828"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":true},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '30879869000119',
 'Assinatura Leadbox',
 'Boleto Bancário',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL),

-- 36. TR ENGENHARIA (cancelado)
('TR ENGENHARIA DE SEGURANÇA DO TRABALHO', 'Engenharia', '', 'churned',
 399, 0, 'Growth', '-',
 'danger', 'churn',
 '{"name":"","email":"","phone":"66992366182"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '49504953000186',
 'Assinatura LeadBox: 1 WhatsApp, 1 Instagram, 4 Usuários',
 'Pergunte ao cliente',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL),

-- 37. TRAINING COMERCIAL (cancelado)
('TRAINING COMERCIAL', 'Varejo', '', 'churned',
 609, 0, 'Growth', '-',
 'danger', 'churn',
 '{"name":"","email":"","phone":"92981298148"}'::jsonb,
 '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":true,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
 '04603452000119',
 'Assinatura Leadbox: 1 Whatsapp, 2 Redes sociais, 5 Usuários',
 'Boleto Bancário',
 '{"renewal_date":"","contract_months":12}'::jsonb, NULL);

-- ============================================================
-- RESULTADO
-- ============================================================
SELECT
  count(*) FILTER (WHERE brands->'leadbox'->>'active' = 'true') as clientes_leadbox,
  count(*) FILTER (WHERE brands->'phant'->>'active' = 'true') as clientes_phant,
  count(*) FILTER (WHERE brands->'phant'->>'active' = 'true' AND brands->'leadbox'->>'active' = 'true') as clientes_phant_e_leadbox,
  count(*) as total_clientes
FROM public.clients;
