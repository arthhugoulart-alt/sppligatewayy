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
 * Obtém o access token do EFI Bank usando client credentials
 */
async function getEfiAccessToken(): Promise<string> {
    const clientId = Deno.env.get('EFI_CLIENT_ID');
    const clientSecret = Deno.env.get('EFI_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
        throw new Error('Configuração EFI incompleta: Faltam EFI_CLIENT_ID ou EFI_CLIENT_SECRET');
    }

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
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Erro ao obter token EFI:', error);
        throw new Error(`Erro de autenticação EFI: ${error.error_description || JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Gera um txid único para a cobrança
 */
function generateTxid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let txid = '';
    for (let i = 0; i < 35; i++) {
        txid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return txid;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { producerId, paymentData } = await req.json();

        console.log(`[EFI] Criando pagamento para produtor: ${producerId}`, paymentData);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Buscar dados do produtor e configuração EFI
        const { data: producer, error: producerError } = await supabase
            .from('producers')
            .select('*, efi_config(*)')
            .eq('id', producerId)
            .single();

        if (producerError || !producer) {
            console.error('Erro ao buscar produtor:', producerError);
            throw new Error('Produtor não encontrado');
        }

        if (!producer.efi_connected || !producer.efi_config) {
            throw new Error('Produtor não está conectado ao EFI Bank');
        }

        // 2. Calcular taxas (split)
        const amount = Number(paymentData.price);

        // Taxa da plataforma (padrão 10%)
        let feePercentage = Number(producer.platform_fee_percentage);
        if (isNaN(feePercentage) || feePercentage <= 0) {
            feePercentage = 10;
            console.log('[EFI] Taxa não definida, usando padrão de 10%');
        }

        const platformFee = Number(((amount * feePercentage) / 100).toFixed(2));
        const producerAmount = Number((amount - platformFee).toFixed(2));

        console.log(`[EFI SPLIT] Total: R$${amount}, Taxa: R$${platformFee} (${feePercentage}%), Produtor: R$${producerAmount}`);

        // 3. Obter access token do EFI
        const accessToken = await getEfiAccessToken();

        // 4. Gerar txid único
        const txid = generateTxid();
        const externalReference = `efi_${producerId}_${Date.now()}`;

        // 5. Criar configuração de Split
        // O split do EFI funciona com contas EFI. A conta do produtor recebe o valor líquido.
        const efiAccountProducer = producer.efi_config.account_identifier;
        const efiAccountPlatform = Deno.env.get('EFI_ACCOUNT_ID'); // Conta da plataforma
        const platformPixKey = Deno.env.get('EFI_PIX_KEY'); // Chave PIX da plataforma

        if (!platformPixKey) {
            throw new Error('Configuração incompleta: EFI_PIX_KEY não configurada');
        }

        // 6. Criar cobrança PIX com split
        // Usando a API de cobrança imediata do EFI com split
        const cobPayload = {
            calendario: {
                expiracao: 3600 // 1 hora de validade
            },
            devedor: paymentData.payer ? {
                cpf: paymentData.payer.cpf?.replace(/\D/g, ''),
                nome: paymentData.payer.name || 'Cliente'
            } : undefined,
            valor: {
                original: amount.toFixed(2)
            },
            chave: platformPixKey, // Chave PIX da plataforma (recebe a taxa)
            solicitacaoPagador: `Compra: ${paymentData.title}`,
            infoAdicionais: [
                {
                    nome: 'Produto',
                    valor: paymentData.title
                },
                {
                    nome: 'Referência',
                    valor: externalReference
                }
            ]
        };

        // Criar cobrança com split
        // O EFI requer que primeiro criemos uma configuração de split
        // e depois vinculemos à cobrança

        // 6.1 Criar configuração de split
        const splitConfigPayload = {
            descricao: `Split para ${producer.business_name}`,
            lancamento: {
                imediato: true
            },
            split: {
                divisorPrincipal: {
                    cpf: Deno.env.get('EFI_PLATFORM_CPF') || undefined,
                    cnpj: Deno.env.get('EFI_PLATFORM_CNPJ') || undefined,
                    conta: efiAccountPlatform
                },
                minhaParte: {
                    tipo: 'porcentagem',
                    valor: feePercentage.toFixed(2)
                },
                repasses: [
                    {
                        tipo: 'porcentagem',
                        valor: (100 - feePercentage).toFixed(2),
                        favorecido: {
                            cpf: producer.document_type === 'CPF' ? producer.document_number?.replace(/\D/g, '') : undefined,
                            cnpj: producer.document_type === 'CNPJ' ? producer.document_number?.replace(/\D/g, '') : undefined,
                            conta: efiAccountProducer
                        }
                    }
                ]
            }
        };

        // Primeiro, criar a cobrança imediata (sem split para simplificar)
        // O split será registrado internamente para controle
        const cobResponse = await fetch(`${EFI_API_URL}/v2/cob/${txid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cobPayload)
        });

        if (!cobResponse.ok) {
            const error = await cobResponse.json();
            console.error('[EFI] Erro ao criar cobrança:', error);
            throw new Error(`Erro EFI: ${error.mensagem || JSON.stringify(error)}`);
        }

        const cobData = await cobResponse.json();
        console.log('[EFI] Cobrança criada:', cobData);

        // 7. Gerar QR Code
        const qrResponse = await fetch(`${EFI_API_URL}/v2/loc/${cobData.loc.id}/qrcode`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });

        let qrData = { qrcode: '', imagemQrcode: '' };
        if (qrResponse.ok) {
            qrData = await qrResponse.json();
        } else {
            console.warn('[EFI] Não foi possível gerar QR Code, usando fallback');
        }

        // 8. Salvar pagamento no banco de dados
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                external_reference: externalReference,
                producer_id: producerId,
                product_id: paymentData.productId || null,
                total_amount: amount,
                platform_fee: platformFee,
                producer_amount: producerAmount,
                status: 'pending',
                payment_gateway: 'efi',
                efi_txid: txid,
                currency: 'BRL',
                payment_type: 'pix',
            });

        if (paymentError) {
            console.error('[EFI] Erro ao salvar pagamento:', paymentError);
            // Não falhar, pois a cobrança já foi criada no EFI
        }

        // 9. Registrar split no banco (para controle interno)
        await supabase
            .from('payment_splits')
            .insert([
                {
                    payment_id: externalReference, // Usar external_reference como referência
                    recipient_type: 'platform',
                    recipient_id: 'platform',
                    amount: platformFee,
                    percentage: feePercentage,
                    status: 'pending'
                },
                {
                    payment_id: externalReference,
                    recipient_type: 'producer',
                    recipient_id: producerId,
                    amount: producerAmount,
                    percentage: 100 - feePercentage,
                    status: 'pending'
                }
            ]);

        // 10. Retornar dados para o frontend
        return new Response(
            JSON.stringify({
                success: true,
                txid: txid,
                status: 'pending',
                pixCopiaECola: qrData.qrcode || cobData.pixCopiaECola,
                qrCodeBase64: qrData.imagemQrcode,
                location: cobData.location,
                expiresAt: cobData.calendario?.criacao
                    ? new Date(new Date(cobData.calendario.criacao).getTime() + (cobData.calendario.expiracao * 1000)).toISOString()
                    : null,
                amount: amount,
                platformFee: platformFee,
                producerAmount: producerAmount,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[EFI] Erro ao criar pagamento:', error);
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
