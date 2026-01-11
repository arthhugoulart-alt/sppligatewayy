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
    const { paymentData, producerId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get producer info and tokens
    const { data: producer } = await supabase
      .from('producers')
      .select('*, oauth_tokens(*)')
      .eq('id', producerId)
      .single()

    if (!producer || !producer.oauth_tokens) {
      throw new Error('Producer not connected to Mercado Pago')
    }

    // 2. Create Preference
    // Option A: Marketplace Split (Payment created with Platform Token, split to Producer)
    // Option B: Payment created with Producer Token, fee to Platform
    
    // Using Option B (typical for "Connect"):
    // We use the producer's access_token to create the preference.
    // We set `application_fee` to charge our commission.

    const accessToken = producer.oauth_tokens.access_token_encrypted // TODO: Decrypt
    
    // Calculate fee
    const amount = paymentData.price
    const feePercentage = producer.platform_fee_percentage || 10
    const applicationFee = (amount * feePercentage) / 100

    const preferenceBody = {
      items: [
        {
          id: 'item-01',
          title: paymentData.title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount
        }
      ],
      marketplace_fee: applicationFee, // Some flows use this
      application_fee: applicationFee, // Others use this (check MP docs for current version)
      notification_url: `${Deno.env.get('SUPABASE_FUNCTIONS_URL')}/mp-webhook`,
      external_reference: paymentData.externalReference,
      back_urls: {
        success: paymentData.successUrl,
        failure: paymentData.failureUrl
      }
    }

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
        // Fallback: Try creating with Platform Token if Access Token flow fails, 
        // but typically 'application_fee' requires the token of the beneficiary or the platform acting on behalf.
        // For Marketplace, usually: use Platform Token, set `items` and `marketplace_fee` is NOT used, 
        // instead we use `split` payment.
        
        // Let's assume Option A (Modern Split):
        // Create payment with Platform Token.
        // Add `disbursements` list.
        throw new Error(JSON.stringify(preference))
    }

    return new Response(
      JSON.stringify(preference),
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
