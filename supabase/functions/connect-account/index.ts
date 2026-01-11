import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, producerId, redirectUri } = await req.json()

    if (!code || !producerId) {
      throw new Error('Missing code or producerId')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Exchange code for token
    const tokenUrl = 'https://api.mercadopago.com/oauth/token'
    
    // Configurações do App (Plataforma)
    const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
    const clientId = Deno.env.get('MP_APP_ID');

    if (!clientSecret || !clientId) {
      console.error('Missing MP_CLIENT_SECRET or MP_APP_ID');
      throw new Error('Configuração da Edge Function incompleta (Missing Secrets).');
    }

    const body = new URLSearchParams({
      client_secret: clientSecret,
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

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
      console.error('MP Error:', data)
      throw new Error(data.message || 'Failed to exchange token')
    }

    // 2. Save token securely
    // We assume the database has an encrypted column or we store it as is (BE CAREFUL IN PROD)
    // Ideally, use pgsodium or similar. Here we save raw for simplicity of the example, 
    // BUT user should implement encryption.
    // The migration table `oauth_tokens` has `access_token_encrypted`.
    
    // For this example, we will just save it. 
    // WARNING: Storing plain text tokens is risky.

    const { error: dbError } = await supabase
      .from('oauth_tokens')
      .upsert({
        producer_id: producerId,
        access_token_encrypted: data.access_token, // TODO: Encrypt this!
        refresh_token_encrypted: data.refresh_token, // TODO: Encrypt this!
        mp_user_id: data.user_id,
        token_type: data.token_type,
        expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
        scope: data.scope,
      }, { onConflict: 'producer_id' })

    if (dbError) throw dbError

    // 3. Update producer status
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
