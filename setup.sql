
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

SELECT 'Schema V7 aplicado com sucesso.' as status;
