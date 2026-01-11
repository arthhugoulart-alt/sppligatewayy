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

    // CHECK IF THIS IS A TRANSPARENT CHECKOUT (PAYMENT BRICK)
    // Check for 'brick' type explicit flag OR presence of formData
    if (paymentData.type === 'brick' || paymentData.formData) {
        console.log("Processing Transparent Checkout (Payment Brick)...");

        if (!paymentData.formData) {
           throw new Error("Dados do pagamento (formData) não fornecidos para checkout transparente.");
        }

        const paymentBody = {
            ...paymentData.formData,
            application_fee: applicationFee,
            external_reference: `prod_${producerId}_${Date.now()}`,
            notification_url: `${Deno.env.get('SUPABASE_FUNCTIONS_URL') || 'https://ekbuszijautzwrsxnhmg.supabase.co/functions/v1'}/mp-webhook`,
            description: paymentData.title,
            additional_info: {
                items: [
                    {
                        id: 'item-test-01',
                        title: paymentData.title,
                        description: paymentData.title,
                        quantity: 1,
                        unit_price: amount
                    }
                ]
            }
        };

        // Call /v1/payments
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': crypto.randomUUID(),
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(paymentBody)
        });

        const paymentResult = await response.json();

        if (!response.ok) {
            console.error('MP Payment Error:', paymentResult);
            throw new Error(`Erro Pagamento: ${paymentResult.message || JSON.stringify(paymentResult)}`);
        }

        return new Response(
            JSON.stringify(paymentResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // 3. Create Preference Body (Fallback / Legacy)
    // Fallback URL hardcoded for this project based on .env
    const functionsUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL') || 'https://ekbuszijautzwrsxnhmg.supabase.co/functions/v1';
    
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
      notification_url: `${functionsUrl}/mp-webhook`,
      external_reference: `prod_${producerId}_${Date.now()}`,
      back_urls: {
        success: paymentData.successUrl || 'https://sppligatewayy.vercel.app/success',
        failure: paymentData.failureUrl || 'https://sppligatewayy.vercel.app/failure',
        pending: 'https://sppligatewayy.vercel.app/pending'
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      statement_descriptor: "SPLITPAY PRODUTO",
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
