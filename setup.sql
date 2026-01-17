
-- CORREÇÃO DEFINITIVA DE PERFIS PHANTLAB
-- Execute este script no SQL Editor do Supabase

-- 1. Limpeza total de versões anteriores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Garantir que a tabela profiles existe e está correta
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (caso não existam)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Public Profiles" ON public.profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own Profile Update' AND tablename = 'profiles') THEN
        CREATE POLICY "Own Profile Update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- 5. Função de Gatilho CORRIGIDA (SECURITY DEFINER é o segredo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Vendedor'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    CASE 
      WHEN new.email = 'master@phantlab.com.br' THEN 'MASTER' 
      ELSE 'USER' 
    END
  );
  RETURN new;
END;
$$;

-- 6. Recriar o Gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Permissões de schema e tabela
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
