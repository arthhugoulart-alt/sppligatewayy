import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Tratamento de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, producerId, redirectUri } = await req.json()
    console.log(`Recebido request para producerId: ${producerId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
    const clientId = Deno.env.get('MP_APP_ID');

    if (!clientSecret || !clientId) {
      console.error('Secrets ausentes');
      throw new Error('Configuração incompleta: Faltam Secrets MP_CLIENT_SECRET ou MP_APP_ID');
    }

    const tokenUrl = 'https://api.mercadopago.com/oauth/token'
    const body = new URLSearchParams({
      client_secret: clientSecret,
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    console.log('Trocando token com MP...');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro MP:', data)
      throw new Error(`Erro MP: ${data.message || JSON.stringify(data)}`)
    }

    console.log('Token recebido, salvando no banco...');

    const { error: dbError } = await supabase
      .from('oauth_tokens')
      .upsert({
        producer_id: producerId,
        access_token_encrypted: data.access_token,
        refresh_token_encrypted: data.refresh_token,
        mp_user_id: data.user_id,
        token_type: data.token_type,
        expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
        scope: data.scope,
      }, { onConflict: 'producer_id' })

    if (dbError) {
        console.error('Erro DB:', dbError);
        throw dbError;
    }

    await supabase
      .from('producers')
      .update({ 
        mp_connected: true, 
        mp_user_id: data.user_id.toString() 
      })
      .eq('id', producerId)

    return new Response( 
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } } 
    ) 
  } catch (error) { 
    console.error('Erro Geral:', error); 
    return new Response( 
      JSON.stringify({ error: error.message, success: false }), 
      { 
        status: 200, // Retornamos 200 para o frontend ver a mensagem 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      } 
    ) 
  } 
})
