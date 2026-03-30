
-- ==============================================================================
-- SCHEMA V7: CORREÇÃO DE TIPAGEM DE ID E FICHÁRIO
-- ==============================================================================

-- 1. TABELA DE SOLUÇÕES (CATÁLOGO)
-- Alteramos o ID para TEXT para suportar IDs temporários do frontend e sincronia
CREATE TABLE IF NOT EXISTS public.solutions (
    id TEXT PRIMARY KEY,
    solucao TEXT NOT NULL,
    promessa TEXT,
    descricao TEXT,
    categoria TEXT,
    subcategoria TEXT,
    duracao TEXT,
    maturidade TEXT,
    valor_base_num NUMERIC DEFAULT 0,
    variaveis_opcionais JSONB DEFAULT '[]'::jsonb,
    entregaveis TEXT[] DEFAULT '{}'::text[],
    diferenciais TEXT[] DEFAULT '{}'::text[],
    dica_venda TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Caso a tabela já exista com id bigint, rodar a conversão:
DO $$ 
BEGIN 
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'solutions' AND column_name = 'id') != 'text' THEN
        ALTER TABLE public.solutions ALTER COLUMN id TYPE TEXT;
    END IF;
END $$;

ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access solutions" ON public.solutions;
CREATE POLICY "Public access solutions" ON public.solutions FOR ALL USING (true);

-- 2. TABELA DE PASTAS (FICHÁRIO)
CREATE TABLE IF NOT EXISTS public.fichario_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    file_types TEXT[],
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fichario_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access folders" ON public.fichario_folders;
CREATE POLICY "Public access folders" ON public.fichario_folders FOR ALL USING (true);

-- Inserção de Pastas Padrão
INSERT INTO public.fichario_folders (id, name, icon, file_types, is_system)
VALUES 
    ('scripts', 'Scripts & Roteiros', '🗣️', ARRAY['script'], true),
    ('docs', 'Documentos & PDFs', '📄', ARRAY['pdf', 'gdoc', 'doc', 'docx', 'txt'], false),
    ('presentations', 'Apresentações', '📊', ARRAY['gslides', 'ppt', 'pptx'], false),
    ('spreadsheets', 'Planilhas & Dados', '📗', ARRAY['gsheet', 'xls', 'xlsx', 'csv'], false),
    ('media', 'Mídia & Imagens', '🖼️', ARRAY['image', 'video', 'png', 'jpg', 'jpeg', 'mp4'], false),
    ('others', 'Outros Arquivos', '📦', ARRAY['unknown', 'zip', 'rar'], false)
ON CONFLICT (id) DO NOTHING;

-- 3. TABELA DE ARQUIVOS (FICHÁRIO)
CREATE TABLE IF NOT EXISTS public.fichario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drive_file_id TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    formato TEXT,
    link TEXT,
    folder_id TEXT,
    virtual_folder_id TEXT REFERENCES public.fichario_folders(id),
    job_id TEXT,
    data_atualizacao TIMESTAMP WITH TIME ZONE,
    raw JSONB
);

ALTER TABLE public.fichario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access fichario" ON public.fichario;
CREATE POLICY "Public access fichario" ON public.fichario FOR ALL USING (true);

-- 4. TABELA DE HISTÓRICO DE PROPOSTAS
CREATE TABLE IF NOT EXISTS public.proposals_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    industry TEXT,
    total_value NUMERIC,
    consultant TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.proposals_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access history" ON public.proposals_history;
CREATE POLICY "Public access history" ON public.proposals_history FOR ALL USING (true);

-- 5. TABELA DE CONFIGURAÇÃO DO APP
CREATE TABLE IF NOT EXISTS public.app_config (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access config" ON public.app_config;
CREATE POLICY "Public access config" ON public.app_config FOR ALL USING (true);

-- 6. TABELA DE CLIENTES (GESTÃO DE CLIENTES)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    industry TEXT,
    location TEXT,
    website TEXT,
    instagram TEXT,
    contact JSONB DEFAULT '{}'::jsonb,
    squad JSONB DEFAULT '[]'::jsonb,
    brands JSONB DEFAULT '{"phant":{"active":false,"mrr":0,"is_planning":false},"leadbox":{"active":false,"has_propagation":false},"vivemus":{"active":false,"has_consulting":false}}'::jsonb,
    health TEXT DEFAULT 'care',
    risk_pillars JSONB DEFAULT '[]'::jsonb,
    delivery_score NUMERIC DEFAULT 0,
    churn_status JSONB DEFAULT '{"renewal_date":"","contract_months":12}'::jsonb,
    mrr NUMERIC DEFAULT 0,
    financial_history JSONB DEFAULT '[]'::jsonb,
    upsell_pipeline JSONB DEFAULT '[]'::jsonb,
    consciousness_level TEXT DEFAULT 'inconsciente',
    milestones JSONB DEFAULT '[]'::jsonb,
    last_report_date TIMESTAMP WITH TIME ZONE,
    intervention_plan TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Novos campos V9: Cadastro Geral + Ger. Risco
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='fee') THEN
    ALTER TABLE public.clients ADD COLUMN fee NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='contract_model') THEN
    ALTER TABLE public.clients ADD COLUMN contract_model TEXT DEFAULT 'Growth';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='squad_name') THEN
    ALTER TABLE public.clients ADD COLUMN squad_name TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='ano_fundacao') THEN
    ALTER TABLE public.clients ADD COLUMN ano_fundacao TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='receita_anual') THEN
    ALTER TABLE public.clients ADD COLUMN receita_anual TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='num_funcionarios') THEN
    ALTER TABLE public.clients ADD COLUMN num_funcionarios TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='data_entrada') THEN
    ALTER TABLE public.clients ADD COLUMN data_entrada TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='data_onboarding') THEN
    ALTER TABLE public.clients ADD COLUMN data_onboarding TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='contato_trimestre') THEN
    ALTER TABLE public.clients ADD COLUMN contato_trimestre TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='assinatura_date') THEN
    ALTER TABLE public.clients ADD COLUMN assinatura_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='churn_date') THEN
    ALTER TABLE public.clients ADD COLUMN churn_date TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='lt') THEN
    ALTER TABLE public.clients ADD COLUMN lt NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='nps') THEN
    ALTER TABLE public.clients ADD COLUMN nps NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='ultima_nota') THEN
    ALTER TABLE public.clients ADD COLUMN ultima_nota NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='recomendacao') THEN
    ALTER TABLE public.clients ADD COLUMN recomendacao TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='health_status') THEN
    ALTER TABLE public.clients ADD COLUMN health_status TEXT DEFAULT 'care';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_logo') THEN
    ALTER TABLE public.clients ADD COLUMN company_logo TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='risk_resultado') THEN
    ALTER TABLE public.clients ADD COLUMN risk_resultado TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='risk_entregas') THEN
    ALTER TABLE public.clients ADD COLUMN risk_entregas TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='risk_relacionamento') THEN
    ALTER TABLE public.clients ADD COLUMN risk_relacionamento TEXT DEFAULT '';
  END IF;
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access clients" ON public.clients;
CREATE POLICY "Public access clients" ON public.clients FOR ALL USING (true);

-- 7. TABELA DE PLANNING (PIPELINE COMERCIAL)
CREATE TABLE IF NOT EXISTS public.client_planning (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    account TEXT DEFAULT '',
    produto TEXT DEFAULT '',
    farmer TEXT DEFAULT '',
    milestones_triggers TEXT DEFAULT '',
    consciousness_level TEXT DEFAULT 'inconsciente',
    previsao_entrada TEXT DEFAULT '',
    mrr_value NUMERIC DEFAULT 0,
    one_time_value NUMERIC DEFAULT 0,
    variavel_value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'aguardando',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.client_planning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access planning" ON public.client_planning;
CREATE POLICY "Public access planning" ON public.client_planning FOR ALL USING (true);

SELECT 'Schema V9 aplicado com sucesso.' as status;
