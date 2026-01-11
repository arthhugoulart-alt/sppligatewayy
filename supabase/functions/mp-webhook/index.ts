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
    const signature = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')
    const body = await req.json()
    
    console.log('Webhook received:', body)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Log the webhook event
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        event_id: body.id || requestId,
        event_type: body.type || 'unknown',
        action: body.action || 'unknown',
        data_id: body.data?.id,
        raw_payload: body,
        signature_valid: true // TODO: Validate signature with MP_WEBHOOK_SECRET
      })

    if (logError) {
      console.error('Error logging webhook:', logError)
    }

    // 2. Process Payment Updates
    if (body.topic === 'payment' || body.type === 'payment') {
      const paymentId = body.data.id
      
      // Fetch payment status from MP (optional, or trust webhook)
      // Ideally we fetch from MP to be sure
      const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      })
      
      if (mpResponse.ok) {
        const paymentData = await mpResponse.json()
        
        // Update our payments table
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            approved_at: paymentData.date_approved,
            mp_payment_id: paymentData.id.toString()
          })
          .eq('external_reference', paymentData.external_reference)

        if (!updateError) {
            // Check if we need to process split (if not done automatically by MP)
            // If using "Binary Mode" or "Marketplace", split might be automatic.
            // If manual, we would insert into payment_splits here.
        }
      }
    }

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
