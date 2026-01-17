
-- Script de Configuração PhantLab Sales Playbook

-- 1. Criar a tabela de perfis (se não existir)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso de forma segura
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Perfis são visíveis por todos' AND tablename = 'profiles') THEN
        CREATE POLICY "Perfis são visíveis por todos" ON public.profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem editar o próprio perfil' AND tablename = 'profiles') THEN
        CREATE POLICY "Usuários podem editar o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- 4. Função para inserir o perfil automaticamente após o cadastro
-- Esta função deve ser SECURITY DEFINER para ignorar as políticas de RLS durante o cadastro inicial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Novo Usuário'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    CASE 
      WHEN new.email = 'master@phantlab.com.br' THEN 'MASTER' 
      ELSE 'USER' 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar o gatilho (Trigger) na tabela de autenticação (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Garantir permissões de acesso ao schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO postgres;
