-- ============================================================
-- SEED: Importação de clientes do CSV Cadastro Geral
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Limpa clientes existentes (CUIDADO: remove tudo)
DELETE FROM public.clients;

-- Inserção dos 36 clientes
INSERT INTO public.clients (
  company_name, industry, location, website, status,
  fee, mrr, contract_model, squad_name, num_funcionarios, receita_anual,
  health, health_status,
  contact, data_entrada, data_onboarding
) VALUES

-- 1. ACQUAVILLE
('ACQUAVILLE', 'Construtora', 'Rondonópolis - MT', 'https://lp.acquavilleresidence.com.br/', 'active',
 0, 0, 'Growth', 'Thiago', '1-10', NULL,
 'safe', 'safe',
 '{"name":"Giovanny","email":"giovannymt@gmail.com","phone":"66 99988-1228"}'::jsonb, NULL, NULL),

-- 2. ADELAIR
('ADELAIR', 'Psicologia', 'Rondonópolis - MT', 'https://adelairmachado.com.br/', 'active',
 2000, 2000, 'Growth', 'João', '1-10', NULL,
 'safe', 'safe',
 '{"name":"Adelair","email":"adelairmfsilva@gmail.com","phone":"66 99689-6282"}'::jsonb, NULL, NULL),

-- 3. ALARA MODAS
('ALARA MODAS', 'Varejo', 'Campo Novo do Parecis - MT', NULL, 'churned',
 0, 0, 'Growth', '-', '1-10', NULL,
 'danger', 'churn',
 '{"name":"Josiane / Rodrigo","email":"josi.roncelli@hotmail.com","phone":"66 9977-2937 / 66 9655-4220"}'::jsonb, '2025-09-18', '2025-09-22'),

-- 4. APARCHE PROJETOS
('APARCHE PROJETOS', 'Movelaria', 'Rondonópolis - MT', 'https://lps.phant.com.br/aparche/', 'churned',
 0, 0, 'Growth', 'João', '1-10', NULL,
 'danger', 'churn',
 '{"name":"Roni","email":"roni10026@gmail.com","phone":"66 9214-9198"}'::jsonb, '2025-09-19', '2025-09-19'),

-- 5. CAFE ARAGUAIA / CAFÉ NASC. DO ARAGUAIA
('CAFE ARAGUAIA / CAFÉ NASC. DO ARAGUAIA', '', 'Araguaia - MT', 'https://pages.phant.com.br/cafearaguaia', 'active',
 2000, 2000, 'Social', 'João', '11-50', NULL,
 'care', 'care',
 '{"name":"Ranieri","email":"rsilvaaia@gmail.com","phone":"66 9629-7385"}'::jsonb, NULL, NULL),

-- 6. CLINICA IMAGEM - VILA AURORA
('CLINICA IMAGEM - VILA AURORA', 'Saúde/Clinica', 'Rondonópolis - MT', 'https://pages.phant.com.br/cadimagem', 'active',
 2500, 2500, 'Growth', 'Thiago', '1-10', NULL,
 'safe', 'safe',
 '{"name":"Dr Alexandre","email":"clinicaimagemroomt@gmail.com","phone":"66 9984-4654"}'::jsonb, NULL, NULL),

-- 7. CONTTAR CONTABILIDADE
('CONTTAR CONTABILIDADE', 'Contabilidade', 'Rondonópolis - MT', 'https://agenciaphant.com.br/conttar', 'active',
 2000, 2000, 'Growth', 'Thiago', '1-10', NULL,
 'care', 'care',
 '{"name":"Ildomar","email":"conttarinsta@gmail.com","phone":"66 98418-1140"}'::jsonb, NULL, NULL),

-- 8. CONTTASYS
('CONTTASYS', 'Sistemas/ Software''s', 'Rondonópolis - MT', 'https://phant.com.br/conttasys/', 'churned',
 0, 0, 'Growth', 'Thiago', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Ildomar","email":"conttarinsta@gmail.com","phone":"66 98418-1140"}'::jsonb, NULL, NULL),

-- 9. DRA. MARISTELA NASCISO NEITZKE
('DRA. MARISTELA NASCISO NEITZKE', 'Saúde/Clinica', 'Rondonópolis - MT', 'https://pages.phant.com.br/dramaristela', 'active',
 2500, 2500, 'Growth', 'Thiago', '1-10', NULL,
 'safe', 'safe',
 '{"name":"Maristela","email":"","phone":"66 9991-2000"}'::jsonb, NULL, NULL),

-- 10. ECOPOWER CUIABÁ
('ECOPOWER CUIABÁ', 'Energia Solar', 'Cuiabá - MT', 'https://ecopower.com.br/energia-solar/mt/cuiaba', 'churned',
 0, 0, 'Growth', 'Squad 2', '1-10', NULL,
 'danger', 'churn',
 '{"name":"Claudio","email":"cuiabaecopower@gmail.com","phone":"65 9812-4000"}'::jsonb, '2025-09-10', '2025-09-10'),

-- 11. ECOPOWER SUL DE MINAS ANDRADAS-MG
('ECOPOWER SUL DE MINAS ANDRADAS-MG', 'Energia Solar', 'Andradas (Vargem Grande) - MG', 'https://ecopower.com.br/energia-solar/sp/vargem-grande-do-sul', 'active',
 1500, 1500, 'Growth', 'João', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Igor / Marcio","email":"marciofrancamoraes@gmail.com","phone":"35 9875-1643 / 35 8702-1413"}'::jsonb, '2025-01-10', '2025-01-10'),

-- 12. GREAT CHOICE TILE
('GREAT CHOICE TILE', 'Construção', 'Atlanta', 'https://www.greatchoicetile.com/pp', 'active',
 1500, 1500, 'Growth', 'Thiago', '1-10', NULL,
 'care', 'care',
 '{"name":"Karol / Rodrigo","email":"karoline.martini@gmail.com","phone":"+1 (404) 719-0003 / +1 (470) 601-4838"}'::jsonb, '2025-10-26', '2025-10-29'),

-- 13. IMPRIMA MULTVISUAL
('IMPRIMA MULTVISUAL', 'Comunicação Visual', 'Rondonópolis - MT', 'https://pages.phant.com.br/imprima', 'active',
 2500, 2500, 'Growth', 'João', '11-50', NULL,
 'care', 'care',
 '{"name":"Pedro","email":"pedro@imprimamultvisual.com.br","phone":"66 8424-4373"}'::jsonb, '2025-01-22', '2025-01-22'),

-- 14. INFLUX RIO VERDE
('INFLUX RIO VERDE', 'Escola de Idiomas', 'Rio Verde - GO', 'https://www.influx.com.br/unidade/influx-rio-verde/', 'active',
 2000, 2000, 'Growth', 'João', '11-50', NULL,
 'safe', 'safe',
 '{"name":"Carol / Eleri","email":"carolinemscmarques@gmail.com / elerihamer@gmail.com","phone":"64 9281-7369 / 66 9984-2565"}'::jsonb, '2025-03-05', '2025-03-10'),

-- 15. JOSUÉ WILLIAN
('JOSUÉ WILLIAN', 'Construção', 'Rondonópolis - MT', NULL, 'churned',
 0, 0, 'Growth', 'Thiago', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Josué","email":"josuewillanalves@gmail.com","phone":"66 9994-6403"}'::jsonb, '2025-10-01', '2025-10-28'),

-- 16. JOY ENERGIA SOLAR
('JOY ENERGIA SOLAR', 'Energia Solar', 'Rondonópolis - MT', NULL, 'active',
 2000, 2000, 'Growth', 'João', '1-10', NULL,
 'safe', 'safe',
 '{"name":"Ademilson","email":"joyenergyroo@gmail.com","phone":"66 99255-2212"}'::jsonb, '2025-11-17', '2025-11-24'),

-- 17. KUMON (VILA AURORA)
('KUMON (VILA AURORA)', 'Reforno Disciplinas Escolares', 'Rondonópolis - MT', 'https://www.kumon.com.br/mt/rondonopolis-vila-aurora/', 'active',
 3000, 3000, 'Growth', 'Thiago', '1-10', NULL,
 'care', 'care',
 '{"name":"Ana","email":"zo.anacarla@gmail.com","phone":"66 9608-7731"}'::jsonb, '2025-07-10', '2025-07-18'),

-- 18. LIMPIFIC
('LIMPIFIC', 'Varejo', 'Rondonópolis - MT', 'https://limpific.com.br/', 'active',
 2000, 2000, 'Growth', 'Thiago', '11-50', NULL,
 'safe', 'safe',
 '{"name":"Victor","email":"","phone":"65 9210-5909"}'::jsonb, '2025-11-12', '2025-11-12'),

-- 19. LUCIA SALOMÃO
('LUCIA SALOMÃO', 'Varejo', 'Rondonópolis - MT', NULL, 'active',
 2300, 2300, 'Growth', 'João', '1-10', NULL,
 'care', 'care',
 '{"name":"Lucia Salomão","email":"lojaluciasalomao@gmail.com","phone":"66 99984-6437"}'::jsonb, '2025-05-19', '2025-05-20'),

-- 20. LUMINUM
('LUMINUM', 'Esquadrias/Vidraçaria', 'Rondonópolis - MT', NULL, 'active',
 2500, 2500, 'Growth', 'João', '1-10', NULL,
 'care', 'implementacao',
 '{"name":"Luis","email":"","phone":"66 9609-9898"}'::jsonb, '2025-12-20', NULL),

-- 21. MAGRÃO ESQUADRIAS
('MAGRÃO ESQUADRIAS', 'Esquadrias/Vidraçaria', 'Rondonópolis - MT / Cuiaba - MT', 'https://grupomagrao.com.br/', 'churned',
 0, 0, 'Growth', '-', '11-50', NULL,
 'danger', 'danger',
 '{"name":"Ariane","email":"arianelocatelli@gmail.com","phone":"11 98765-2895"}'::jsonb, '2025-08-08', '2025-08-13'),

-- 22. PANTANAL ENERGIA SOLAR
('PANTANAL ENERGIA SOLAR', 'Energia Solar', 'Rondonópolis - MT', NULL, 'active',
 2500, 2500, 'Growth', 'João', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Vinicius","email":"","phone":"66 9971-7538"}'::jsonb, '2025-07-04', '2025-07-08'),

-- 23. PAPILE PAPELARIA / CONTABILISTA
('PAPILE PAPELARIA / CONTABILISTA', 'Papelaria', 'Rondonópolis - MT', NULL, 'active',
 3000, 3000, 'Growth', 'Thiago', '11-50', NULL,
 'care', 'care',
 '{"name":"Mathias / Giovana","email":"mktpapile@gmail.com","phone":"66 9996-1299 / 66 9996-1017"}'::jsonb, '2025-10-15', '2025-10-29'),

-- 24. PRAXIS
('PRAXIS', 'Gestão Tributaria', 'Tangará da Serra - MT', 'https://pages.phant.com.br/praxis', 'churned',
 0, 0, 'Growth', '-', '1-10', NULL,
 'danger', 'churn',
 '{"name":"Guilherme / Gustavo","email":"gustavo@consultoriapraxis.com.br","phone":"65 99978-6158 / 65 99982-2347"}'::jsonb, NULL, '2024-09-03'),

-- 25. QUARTER
('QUARTER', 'Contabilidade', 'Rondonópolis - MT', 'https://quartercontabilidade.com/wp-login.php', 'active',
 2000, 2000, 'Growth', 'João', '1-10', NULL,
 'care', 'care',
 '{"name":"William","email":"willian_torquato@hotmail.com","phone":"66 9667-8603"}'::jsonb, '2025-10-05', '2025-10-07'),

-- 26. RED RIVER
('RED RIVER', 'Barbearia', 'Rondonópolis - MT', 'https://pages.phant.com.br/redriver', 'active',
 1000, 1000, 'Growth', 'João', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Otavio / Pablo","email":"Otavioluizbrandaocosta@gmail.com","phone":"66 9639-1796 / 66 9680-8231"}'::jsonb, '2023-07-05', NULL),

-- 27. SUPER SOFT INFORMATICA LTDA
('SUPER SOFT INFORMATICA LTDA', 'Educação e Informática', 'Pontes e Lacerda', 'https://www.supersoftinformatica.com.br/', 'active',
 3000, 3000, 'Growth', 'Thiago', '1-10', NULL,
 'care', 'care',
 '{"name":"Sérgio","email":"","phone":"65 99201-8790"}'::jsonb, '2024-11-29', '2024-12-03'),

-- 28. TOLDOS RONDON
('TOLDOS RONDON', 'Construção', 'Rondonópolis - MT', 'https://pages.phant.com.br/toldosrondon', 'active',
 3000, 3000, 'Growth', 'Thiago', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Josué Willan","email":"josuewillanalves@gmail.com","phone":"66 9994-6403"}'::jsonb, '2024-10-17', '2024-10-17'),

-- 29. VILLAGE ENG (VENG)
('VILLAGE ENG (VENG)', 'Engenharia', 'Rondonópolis - MT', 'https://pages.phant.com.br/village', 'active',
 0, 0, 'Growth', 'João', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Orlando","email":"village.engenhariamkt@gmail.com","phone":"66 9971-0097"}'::jsonb, '2024-07-24', '2024-08-06'),

-- 30. VMIX CONCR. (VENG)
('VMIX CONCR. (VENG)', 'Engenharia', 'Rondonópolis - MT', NULL, 'active',
 0, 0, 'Growth', 'João', '1-10', NULL,
 'danger', 'danger',
 '{"name":"Orlando","email":"village.engenhariamkt@gmail.com","phone":"66 9971-0097"}'::jsonb, '2024-07-24', '2024-08-06'),

-- 31. INTERFIBRAS
('INTERFIBRAS', 'Telecom', 'Rondonópolis - MT', 'https://www.interfibras.com.br/', 'active',
 3000, 3000, 'Growth', 'Thiago', '11-50', 'R$ 3.052.000,00',
 'care', 'implementacao',
 '{"name":"Lucas Back","email":"","phone":"66 9241-5646"}'::jsonb, '2026-01-06', '2026-01-06'),

-- 32. YAMAHA
('YAMAHA', '', 'Rondonópolis - MT', NULL, 'onboarding',
 2500, 2500, 'Growth', 'Thiago', '', NULL,
 'care', 'implementacao',
 '{"name":"Vinicius","email":"","phone":"66996488096"}'::jsonb, NULL, '2026-01-30'),

-- 33. SORRISO FELIZ
('SORRISO FELIZ', 'Odontologia', 'Rondonópolis - MT', NULL, 'onboarding',
 4000, 4000, 'Growth', 'Thiago', '', 'R$ 3.600.000,00',
 'care', 'implementacao',
 '{"name":"","email":"","phone":""}'::jsonb, NULL, NULL),

-- 34. DANIEL
('DANIEL', '', 'Rondonópolis - MT', NULL, 'active',
 5000, 5000, 'Branding', '', '', NULL,
 'care', 'care',
 '{"name":"","email":"","phone":""}'::jsonb, NULL, NULL),

-- 35. LAVACAR
('LAVACAR', '', 'Rondonópolis - MT', NULL, 'active',
 7000, 7000, 'Branding', '', '', NULL,
 'care', 'care',
 '{"name":"","email":"","phone":""}'::jsonb, NULL, NULL),

-- 36. GRUPO SEEG
('GRUPO SEEG', '', 'Cacéres - MT', NULL, 'active',
 15000, 15000, 'Growth', 'João', '', NULL,
 'care', 'care',
 '{"name":"Henrique","email":"","phone":""}'::jsonb, NULL, NULL);

-- Marca todos os clientes como Phant (marca principal)
UPDATE public.clients SET brands = '{"phant":{"active":true,"mrr":0,"is_planning":false},"leadbox":{"active":false,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb;

-- Resultado
SELECT count(*) as total_clientes_inseridos FROM public.clients;
