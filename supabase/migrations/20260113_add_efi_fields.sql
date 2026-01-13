-- Migration: Add EFI Bank support for split payments
-- Date: 2026-01-13

-- ============================================
-- 1. Adicionar campos EFI na tabela producers
-- ============================================
ALTER TABLE producers ADD COLUMN IF NOT EXISTS efi_connected boolean DEFAULT false;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS efi_account_id text;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS efi_pix_key text;

-- ============================================
-- 2. Criar tabela para configurações EFI
-- ============================================
CREATE TABLE IF NOT EXISTS efi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  account_identifier text NOT NULL,
  pix_key text,
  pix_key_type text CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(producer_id)
);

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_efi_config_producer_id ON efi_config(producer_id);

-- ============================================
-- 3. Adicionar campos EFI na tabela payments
-- ============================================

-- Gateway de pagamento (mercadopago ou efi)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_gateway text DEFAULT 'mercadopago';
  END IF;
END $$;

-- Verificar constraint do payment_gateway
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'payments_payment_gateway_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_gateway_check 
      CHECK (payment_gateway IN ('mercadopago', 'efi'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ID da transação EFI (txid)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS efi_txid text;

-- ID end-to-end do PIX
ALTER TABLE payments ADD COLUMN IF NOT EXISTS efi_e2eid text;

-- Criar índices para busca
CREATE INDEX IF NOT EXISTS idx_payments_efi_txid ON payments(efi_txid);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(payment_gateway);

-- ============================================
-- 4. Enable RLS para efi_config
-- ============================================
ALTER TABLE efi_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Producers can view their own EFI config" ON efi_config;
CREATE POLICY "Producers can view their own EFI config" ON efi_config
  FOR SELECT
  USING (
    producer_id IN (
      SELECT id FROM producers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can insert their own EFI config" ON efi_config;
CREATE POLICY "Producers can insert their own EFI config" ON efi_config
  FOR INSERT
  WITH CHECK (
    producer_id IN (
      SELECT id FROM producers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can update their own EFI config" ON efi_config;
CREATE POLICY "Producers can update their own EFI config" ON efi_config
  FOR UPDATE
  USING (
    producer_id IN (
      SELECT id FROM producers WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. Função para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_efi_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS efi_config_updated_at ON efi_config;
CREATE TRIGGER efi_config_updated_at
  BEFORE UPDATE ON efi_config
  FOR EACH ROW
  EXECUTE FUNCTION update_efi_config_updated_at();

-- ============================================
-- 6. Comentários para documentação
-- ============================================
COMMENT ON TABLE efi_config IS 'Configurações de conta EFI Bank para cada produtor';
COMMENT ON COLUMN efi_config.account_identifier IS 'Identificador da conta EFI do produtor';
COMMENT ON COLUMN efi_config.pix_key IS 'Chave PIX do produtor (para recebimentos)';
COMMENT ON COLUMN efi_config.pix_key_type IS 'Tipo da chave PIX (cpf, cnpj, email, phone, random)';
COMMENT ON COLUMN payments.payment_gateway IS 'Gateway de pagamento usado (mercadopago ou efi)';
COMMENT ON COLUMN payments.efi_txid IS 'ID da transação PIX no EFI Bank';
COMMENT ON COLUMN payments.efi_e2eid IS 'ID end-to-end do PIX (confirmação)';
