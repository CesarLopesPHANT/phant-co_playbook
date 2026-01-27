
-- ==============================================================================
-- SCHEMA V7: ATUALIZAÇÃO DO CATÁLOGO E INTELIGÊNCIA PHANTLAB
-- ==============================================================================

-- 1. ATUALIZAÇÃO DA TABELA DE SOLUÇÕES (CATÁLOGO)
-- Adiciona campos necessários para o novo layout de acordeão e automação Ekyte
ALTER TABLE IF EXISTS public.solutions ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE IF EXISTS public.solutions ADD COLUMN IF NOT EXISTS entregaveis TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.solutions ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.solutions ADD COLUMN IF NOT EXISTS variaveis_opcionais JSONB DEFAULT '[]';

-- Garantir que a tabela solutions tenha RLS habilitado
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos e recriar
DROP POLICY IF EXISTS "Public access solutions" ON public.solutions;
CREATE POLICY "Public access solutions" ON public.solutions FOR ALL USING (true);

-- 2. TABELA DE CONFIGURAÇÃO DE IA (INTELIGÊNCIA)
-- Suporta o armazenamento do objeto JSON com os 4 blocos de instruções
CREATE TABLE IF NOT EXISTS public.ai_config (
    id TEXT PRIMARY KEY, -- ex: 'mentor'
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access ai_config" ON public.ai_config;
CREATE POLICY "Public access ai_config" ON public.ai_config FOR ALL USING (true);

-- 3. TABELA DE METAS E PERSONALIZAÇÃO (APP_CONFIG)
-- Usada para metas de vendas e branding do sistema
CREATE TABLE IF NOT EXISTS public.app_config (
    id TEXT PRIMARY KEY, -- 'branding', 'sales_goals'
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access app_config" ON public.app_config;
CREATE POLICY "Public access app_config" ON public.app_config FOR ALL USING (true);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_solutions_categoria ON public.solutions(categoria);
CREATE INDEX IF NOT EXISTS idx_solutions_is_favorite ON public.solutions(is_favorite);

-- LOG DE SUCESSO
SELECT 'Schema V7 (Catálogo Accordion + Ekyte + IA) aplicado com sucesso.' as status;
