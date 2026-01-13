import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// EFI Bank API URLs
const EFI_API_URL = Deno.env.get('EFI_SANDBOX') === 'true' 
  ? 'https://pix-h.api.efipay.com.br' 
  : 'https://pix.api.efipay.com.br';

const EFI_AUTH_URL = Deno.env.get('EFI_SANDBOX') === 'true'
  ? 'https://pix-h.api.efipay.com.br/oauth/token'
  : 'https://pix.api.efipay.com.br/oauth/token';

/**
 * Obtém o access token do EFI Bank usando client credentials + certificado
 */
async function getEfiAccessToken(): Promise<string> {
  const clientId = Deno.env.get('EFI_CLIENT_ID');
  const clientSecret = Deno.env.get('EFI_CLIENT_SECRET');
  const certificateBase64 = Deno.env.get('EFI_CERTIFICATE_BASE64');

  if (!clientId || !clientSecret || !certificateBase64) {
    throw new Error('Configuração EFI incompleta: Faltam credenciais');
  }

  // Decodificar certificado de Base64
  const certificateBuffer = Uint8Array.from(atob(certificateBase64), c => c.charCodeAt(0));

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(EFI_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials'
    }),
    // Note: Em produção, o certificado mTLS seria configurado no nível do runtime
    // Para Deno Deploy/Supabase Edge Functions, pode ser necessário usar uma abordagem alternativa
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Erro ao obter token EFI:', error);
    throw new Error(`Erro de autenticação EFI: ${error.error_description || JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { producerId, efiAccountId, pixKey, pixKeyType } = await req.json();
    
    console.log(`Conectando conta EFI para produtor: ${producerId}`);

    if (!producerId || !efiAccountId) {
      throw new Error('Dados obrigatórios não fornecidos: producerId e efiAccountId são necessários');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verificar se o produtor existe
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('*')
      .eq('id', producerId)
      .single();

    if (producerError || !producer) {
      throw new Error('Produtor não encontrado');
    }

    // 2. Opcionalmente, validar a conta EFI via API
    // (Em produção, você pode chamar a API do EFI para verificar se a conta existe)
    // Por enquanto, apenas salvamos os dados

    // 3. Salvar configuração EFI do produtor
    const { error: configError } = await supabase
      .from('efi_config')
      .upsert({
        producer_id: producerId,
        account_identifier: efiAccountId,
        pix_key: pixKey || null,
        pix_key_type: pixKeyType || null,
        is_valid: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'producer_id' });

    if (configError) {
      console.error('Erro ao salvar config EFI:', configError);
      throw new Error('Erro ao salvar configuração EFI');
    }

    // 4. Atualizar status do produtor
    const { error: updateError } = await supabase
      .from('producers')
      .update({
        efi_connected: true,
        efi_account_id: efiAccountId,
        efi_pix_key: pixKey || null,
      })
      .eq('id', producerId);

    if (updateError) {
      console.error('Erro ao atualizar produtor:', updateError);
      throw new Error('Erro ao atualizar status do produtor');
    }

    console.log('Conta EFI conectada com sucesso para produtor:', producerId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta EFI conectada com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao conectar conta EFI:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
