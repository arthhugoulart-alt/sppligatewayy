-- 1. Criação automática de Produtor ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.producers (user_id, email, business_name, platform_fee_percentage)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    10.00 -- Taxa padrão da plataforma (você define aqui)
  );
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir para evitar duplicidade
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Segurança (RLS) - Cada um só vê o seu
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Usuário vê apenas o próprio registro
CREATE POLICY "Users can view own producer profile"
  ON producers FOR SELECT
  USING (auth.uid() = user_id);

-- Política de Atualização: Usuário atualiza apenas o próprio registro (ex: nome, doc)
-- Mas NÃO pode atualizar a taxa (platform_fee_percentage) se protegermos a coluna via trigger ou apenas no front-end por enquanto.
CREATE POLICY "Users can update own producer profile"
  ON producers FOR UPDATE
  USING (auth.uid() = user_id);

-- Nota: O Admin do Supabase (dashboard) continua vendo tudo.
