
-- =====================================================
-- SISTEMA DE SPLIT DE PAGAMENTOS - MERCADO PAGO
-- =====================================================

-- 1. TABELA DE PRODUTORES (SELLERS)
CREATE TABLE public.producers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ')),
  document_number TEXT,
  mp_user_id TEXT, -- ID do usuário no Mercado Pago
  mp_connected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00, -- Taxa da plataforma em %
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. TABELA DE TOKENS OAUTH (CRIPTOGRAFADOS)
CREATE TABLE public.oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID REFERENCES public.producers(id) ON DELETE CASCADE NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- Token criptografado
  refresh_token_encrypted TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  mp_user_id TEXT,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(producer_id)
);

-- 3. TABELA DE PRODUTOS
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID REFERENCES public.producers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. TABELA DE PAGAMENTOS
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_reference TEXT UNIQUE NOT NULL, -- Referência única para idempotência
  mp_payment_id TEXT, -- ID do pagamento no Mercado Pago
  mp_preference_id TEXT, -- ID da preferência no Mercado Pago
  
  -- Valores financeiros
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL, -- Application fee
  producer_amount DECIMAL(10,2) NOT NULL, -- Valor líquido do produtor
  currency TEXT DEFAULT 'BRL',
  
  -- Status e tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  status_detail TEXT,
  
  -- Dados do pagador
  payer_email TEXT,
  payer_name TEXT,
  payer_document TEXT,
  
  -- Método de pagamento
  payment_type TEXT, -- credit_card, debit_card, pix, boleto
  payment_method TEXT,
  installments INTEGER DEFAULT 1,
  
  -- Split confirmado
  split_confirmed BOOLEAN DEFAULT FALSE,
  split_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- 5. TABELA DE DETALHES DO SPLIT
CREATE TABLE public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('producer', 'platform')),
  recipient_id TEXT, -- MP user_id ou platform_id
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. TABELA DE WEBHOOKS RECEBIDOS
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE, -- ID do evento do MP para idempotência
  event_type TEXT NOT NULL, -- payment, plan, subscription, etc
  action TEXT NOT NULL, -- payment.created, payment.updated, etc
  data_id TEXT, -- ID do recurso (payment_id, etc)
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. TABELA DE LOGS FINANCEIROS (AUDITORIA)
CREATE TABLE public.financial_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- payment_created, payment_approved, split_processed, refund, chargeback
  previous_status TEXT,
  new_status TEXT,
  amount DECIMAL(10,2),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. TABELA DE CONFIGURAÇÕES DA PLATAFORMA
CREATE TABLE public.platform_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- INSERIR CONFIGURAÇÕES INICIAIS
INSERT INTO public.platform_config (key, value, description) VALUES
('default_platform_fee', '10.00', 'Taxa padrão da plataforma em %'),
('environment', 'sandbox', 'Ambiente atual: sandbox ou production'),
('webhook_secret', '', 'Secret para validação de webhooks'),
('mp_app_id', '', 'Application ID do Mercado Pago');

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_payments_producer ON public.payments(producer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_external_ref ON public.payments(external_reference);
CREATE INDEX idx_payments_mp_id ON public.payments(mp_payment_id);
CREATE INDEX idx_webhook_logs_event_id ON public.webhook_logs(event_id);
CREATE INDEX idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX idx_financial_logs_payment ON public.financial_logs(payment_id);
CREATE INDEX idx_products_producer ON public.products(producer_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - PRODUTORES
-- =====================================================
CREATE POLICY "Producers can view own data" ON public.producers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Producers can update own data" ON public.producers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create producer profile" ON public.producers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - TOKENS (MUITO RESTRITIVO)
-- =====================================================
CREATE POLICY "Tokens are only accessible via service role" ON public.oauth_tokens
  FOR ALL USING (false);

-- =====================================================
-- RLS POLICIES - PRODUTOS
-- =====================================================
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Producers can manage own products" ON public.products
  FOR ALL USING (
    producer_id IN (SELECT id FROM public.producers WHERE user_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES - PAGAMENTOS
-- =====================================================
CREATE POLICY "Producers can view own payments" ON public.payments
  FOR SELECT USING (
    producer_id IN (SELECT id FROM public.producers WHERE user_id = auth.uid())
  );

-- =====================================================
-- RLS POLICIES - SPLITS
-- =====================================================
CREATE POLICY "Producers can view own payment splits" ON public.payment_splits
  FOR SELECT USING (
    payment_id IN (
      SELECT id FROM public.payments WHERE producer_id IN (
        SELECT id FROM public.producers WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS POLICIES - WEBHOOKS E LOGS (ADMIN ONLY via service role)
-- =====================================================
CREATE POLICY "Webhook logs admin only" ON public.webhook_logs
  FOR ALL USING (false);

CREATE POLICY "Financial logs viewable by related producer" ON public.financial_logs
  FOR SELECT USING (
    producer_id IN (SELECT id FROM public.producers WHERE user_id = auth.uid())
  );

CREATE POLICY "Platform config admin only" ON public.platform_config
  FOR ALL USING (false);

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_producers_updated_at
  BEFORE UPDATE ON public.producers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_config_updated_at
  BEFORE UPDATE ON public.platform_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
