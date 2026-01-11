-- Atualizar ou Inserir configurações do Mercado Pago
INSERT INTO public.platform_config (key, value, description, is_sensitive)
VALUES 
  ('mp_app_id', '5021111233952607', 'Application ID do Mercado Pago', false),
  ('mp_client_secret', 'R3zZ6jaVRilYGnu81au1iYHA5LUvSvwV', 'Client Secret do Mercado Pago', true),
  ('mp_access_token', 'APP_USR-5021111233952607-010922-53e1364067540beb68ed240493bca6b9-2690872825', 'Access Token da Plataforma', true)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Nota: Idealmente, segredos devem ser gerenciados via Vault do Supabase ou Variáveis de Ambiente das Edge Functions,
-- mas para este setup inicial e centralizado, estamos usando a tabela de configuração do app.
