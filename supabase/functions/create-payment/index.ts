import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { producerId, paymentData } = await req.json()
    
    console.log(`Creating payment for producer: ${producerId}`, paymentData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get producer info and tokens
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('*, oauth_tokens(*)')
      .eq('id', producerId)
      .single()

    if (producerError || !producer) {
      console.error('Producer error:', producerError);
      throw new Error('Produtor não encontrado');
    }

    if (!producer.oauth_tokens) {
      throw new Error('Produtor não está conectado ao Mercado Pago');
    }

    const accessToken = producer.oauth_tokens.access_token_encrypted;
    
    if (!accessToken) {
        throw new Error('Access Token do produtor inválido');
    }

    // 2. Calculate fees
    const amount = Number(paymentData.price);
    const feePercentage = Number(producer.platform_fee_percentage) || 10;
    const applicationFee = Number(((amount * feePercentage) / 100).toFixed(2));

    console.log(`Amount: ${amount}, Fee: ${applicationFee}, Token: ${accessToken.substring(0, 10)}...`);

    // 3. Create Preference Body
    const preferenceBody = {
      items: [
        {
          id: 'item-test-01',
          title: paymentData.title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount
        }
      ],
      application_fee: applicationFee,
      notification_url: `${Deno.env.get('SUPABASE_FUNCTIONS_URL') || 'https://sppligatewayy.vercel.app/api'}/mp-webhook`, // Fallback or proper URL
      external_reference: `prod_${producerId}_${Date.now()}`,
      back_urls: {
        success: paymentData.successUrl || 'https://sppligatewayy.vercel.app/success',
        failure: paymentData.failureUrl || 'https://sppligatewayy.vercel.app/failure',
        pending: 'https://sppligatewayy.vercel.app/pending'
      },
      auto_return: "approved",
    }

    // 4. Call Mercado Pago API
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preferenceBody)
    })

    const preference = await response.json()

    if (!response.ok) {
        console.error('MP Error:', preference);
        throw new Error(`Erro Mercado Pago: ${preference.message || JSON.stringify(preference)}`);
    }

    return new Response(
      JSON.stringify(preference),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
