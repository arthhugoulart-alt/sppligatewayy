// Mercado Pago Configuration & Types
// Este arquivo contém tipos e configurações para integração com Mercado Pago

export const MP_CONFIG = {
  // URLs de autenticação OAuth
  OAUTH_URL: 'https://auth.mercadopago.com/authorization',
  TOKEN_URL: 'https://api.mercadopago.com/oauth/token',
  
  // URLs da API
  API_URL: 'https://api.mercadopago.com',
  
  // Scopes necessários para marketplace
  SCOPES: ['read', 'write', 'offline_access'],
  
  // Endpoints principais
  ENDPOINTS: {
    PREFERENCE: '/checkout/preferences',
    PAYMENT: '/v1/payments',
    USER: '/users/me',
  },
} as const;

// Status de pagamento do Mercado Pago
export type PaymentStatus = 
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

// Tipos de pagamento
export type PaymentType = 
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'boleto'
  | 'bank_transfer';

// Interface para preferência de pagamento com split
export interface PaymentPreference {
  items: Array<{
    id: string;
    title: string;
    description?: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  payer?: {
    email?: string;
    name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  payment_methods?: {
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
  
  // IMPORTANTE: Campos para Marketplace Split
  marketplace_fee?: number; // Application fee em centavos (depreciado, usar application_fee)
  application_fee?: number; // Taxa da plataforma em valor absoluto
}

// Interface para webhook do Mercado Pago
export interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: 'payment' | 'plan' | 'subscription' | 'invoice' | 'point_integration_wh';
  date_created: string;
  user_id: string;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

// Interface para resposta de token OAuth
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

// Interface para pagamento do Mercado Pago
export interface MPPayment {
  id: number;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  money_release_date?: string;
  operation_type: string;
  payment_method_id: string;
  payment_type_id: string;
  status: PaymentStatus;
  status_detail: string;
  currency_id: string;
  description: string;
  collector_id: number;
  payer: {
    id?: number;
    email: string;
    identification?: {
      type: string;
      number: string;
    };
    first_name?: string;
    last_name?: string;
  };
  transaction_amount: number;
  transaction_amount_refunded: number;
  coupon_amount: number;
  shipping_amount: number;
  net_amount: number;
  fee_details: Array<{
    type: string;
    amount: number;
    fee_payer: string;
  }>;
  external_reference?: string;
  installments: number;
  captured: boolean;
  live_mode: boolean;
}

// Formatar valor em BRL
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Calcular taxa da plataforma
export const calculatePlatformFee = (amount: number, feePercentage: number): number => {
  return Math.round((amount * feePercentage) / 100 * 100) / 100;
};

// Gerar referência externa única
export const generateExternalReference = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `PAY-${timestamp}-${randomPart}`.toUpperCase();
};

// Mapear status para português
export const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  authorized: 'Autorizado',
  in_process: 'Em Processamento',
  in_mediation: 'Em Mediação',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Estornado',
};

// Mapear tipo de pagamento para português
export const paymentTypeLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  boleto: 'Boleto',
  bank_transfer: 'Transferência Bancária',
  account_money: 'Saldo Mercado Pago',
};
