
-- ==============================================================================
-- SCHEMA V6: FICHÁRIO INTELIGENTE (PASTAS VIRTUAIS)
-- ==============================================================================

-- 1. TABELA DE PASTAS (CATEGORIAS)
CREATE TABLE IF NOT EXISTS public.fichario_folders (
    id TEXT PRIMARY KEY, -- ex: 'docs', 'sheets'
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    file_types TEXT[], -- Array de tipos aceitos ex: ['pdf', 'gdoc']
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fichario_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access folders" ON public.fichario_folders;
CREATE POLICY "Public access folders" ON public.fichario_folders FOR ALL USING (true);

-- Inserção de Pastas Padrão (Idempotente)
INSERT INTO public.fichario_folders (id, name, icon, file_types, is_system)
VALUES 
    ('scripts', 'Scripts & Roteiros', '🗣️', ARRAY['script'], true),
    ('docs', 'Documentos & PDFs', '📄', ARRAY['pdf', 'gdoc', 'doc', 'docx', 'txt'], false),
    ('presentations', 'Apresentações', '📊', ARRAY['gslides', 'ppt', 'pptx'], false),
    ('spreadsheets', 'Planilhas & Dados', '📗', ARRAY['gsheet', 'xls', 'xlsx', 'csv'], false),
    ('media', 'Mídia & Imagens', '🖼️', ARRAY['image', 'video', 'png', 'jpg', 'jpeg', 'mp4'], false),
    ('others', 'Outros Arquivos', '📦', ARRAY['unknown', 'zip', 'rar'], false)
ON CONFLICT (id) DO NOTHING;

-- 2. TABELA DE ARQUIVOS (ATUALIZAÇÃO)
CREATE TABLE IF NOT EXISTS public.fichario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drive_file_id TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    formato TEXT,
    link TEXT,
    folder_id TEXT, -- ID do Drive (Físico)
    virtual_folder_id TEXT REFERENCES public.fichario_folders(id), -- ID da Pasta Virtual (Lógico)
    job_id TEXT,
    data_atualizacao TIMESTAMP WITH TIME ZONE,
    raw JSONB
);

ALTER TABLE public.fichario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access fichario" ON public.fichario;
CREATE POLICY "Public access fichario" ON public.fichario FOR ALL USING (true);

-- Função de trigger para auto-categorização (Opcional, mas faremos via código JS para flexibilidade)
-- A lógica principal estará no SupabaseService.syncFicharioToDb

SELECT 'Schema V6 (Fichário Pastas) aplicado com sucesso.' as status;

-- ==============================================================================
-- SCHEMA V7: CATALOGO FAVORITOS
-- ==============================================================================

ALTER TABLE public.solutions ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

SELECT 'Schema V7 (Catalogo Favoritos) aplicado com sucesso.' as status;

-- ==============================================================================
-- SCHEMA V8: LINK MATERIAL DE APOIO
-- ==============================================================================

ALTER TABLE public.solutions ADD COLUMN IF NOT EXISTS link TEXT;

SELECT 'Schema V8 (Link Material) aplicado com sucesso.' as status;
