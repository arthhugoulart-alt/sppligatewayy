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
        const body = await req.json()

        console.log('[EFI Webhook] Recebido:', JSON.stringify(body, null, 2))

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Registrar o webhook recebido
        const { error: logError } = await supabase
            .from('webhook_logs')
            .insert({
                event_id: body.pix?.[0]?.txid || body.txid || crypto.randomUUID(),
                event_type: 'efi_pix',
                action: body.pix ? 'pix_received' : 'unknown',
                data_id: body.pix?.[0]?.txid,
                raw_payload: body,
                signature_valid: true // TODO: Validar assinatura do webhook EFI
            })

        if (logError) {
            console.error('[EFI Webhook] Erro ao registrar log:', logError)
        }

        // 2. Processar notificações de PIX recebido
        // O EFI envia um array de PIX quando há pagamentos
        if (body.pix && Array.isArray(body.pix)) {
            for (const pixPayment of body.pix) {
                const txid = pixPayment.txid
                const e2eid = pixPayment.endToEndId
                const valor = pixPayment.valor
                const horario = pixPayment.horario

                console.log(`[EFI Webhook] PIX recebido - txid: ${txid}, valor: ${valor}, e2eid: ${e2eid}`)

                if (!txid) {
                    console.warn('[EFI Webhook] PIX sem txid, ignorando')
                    continue
                }

                // 3. Buscar o pagamento pelo txid
                const { data: payment, error: paymentError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('efi_txid', txid)
                    .single()

                if (paymentError || !payment) {
                    console.warn(`[EFI Webhook] Pagamento não encontrado para txid: ${txid}`)

                    // Tentar buscar pela referência externa que contém o txid
                    const { data: paymentByRef } = await supabase
                        .from('payments')
                        .select('*')
                        .like('external_reference', `%${txid}%`)
                        .single()

                    if (!paymentByRef) {
                        continue
                    }
                }

                const targetPayment = payment

                // 4. Atualizar status do pagamento
                const { error: updateError } = await supabase
                    .from('payments')
                    .update({
                        status: 'approved',
                        status_detail: 'pix_received',
                        approved_at: horario || new Date().toISOString(),
                        efi_e2eid: e2eid,
                        payment_method: 'pix',
                    })
                    .eq('efi_txid', txid)

                if (updateError) {
                    console.error('[EFI Webhook] Erro ao atualizar pagamento:', updateError)
                } else {
                    console.log(`[EFI Webhook] Pagamento ${txid} atualizado para approved`)
                }

                // 5. Atualizar status dos splits
                if (targetPayment) {
                    await supabase
                        .from('payment_splits')
                        .update({
                            status: 'completed',
                            processed_at: new Date().toISOString()
                        })
                        .eq('payment_id', targetPayment.external_reference)

                    // 6. Registrar log financeiro
                    await supabase
                        .from('financial_logs')
                        .insert({
                            action: 'payment_received',
                            payment_id: targetPayment.id,
                            producer_id: targetPayment.producer_id,
                            amount: Number(valor),
                            previous_status: 'pending',
                            new_status: 'approved',
                            details: {
                                gateway: 'efi',
                                txid: txid,
                                e2eid: e2eid,
                                platform_fee: targetPayment.platform_fee,
                                producer_amount: targetPayment.producer_amount
                            }
                        })
                }
            }
        }

        // 3. Processar devoluções (se houver)
        if (body.devolucao) {
            console.log('[EFI Webhook] Devolução recebida:', body.devolucao)

            // Atualizar status do pagamento para refunded
            if (body.devolucao.txid) {
                await supabase
                    .from('payments')
                    .update({
                        status: 'refunded',
                        status_detail: `devolucao_${body.devolucao.status}`,
                    })
                    .eq('efi_txid', body.devolucao.txid)
            }
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('[EFI Webhook] Erro:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
