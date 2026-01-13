import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import * as forgeModule from 'npm:node-forge@1.3.1'

// Lidar com a diferença de exportação entre Node e Deno
const forge: any = (forgeModule as any).default || forgeModule;

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
 * Extrai certificado e chave do P12 (Base64)
 */
function extractCertsFromP12(p12Base64: string) {
    try {
        const cleanBase64 = p12Base64.replace(/\s/g, '');
        const p12Der = forge.util.decode64(cleanBase64);
        const p12Asn1 = forge.asn1.fromDer(p12Der);

        const password = Deno.env.get('EFI_CERTIFICATE_PASSWORD') || '';

        // Procurar a função de extração em vários locais possíveis no objeto forge
        let extractFn: Function | undefined;
        let oids: any;
        let pki: any;
        let foundPath = '';

        if (forge.pkcs12 && typeof forge.pkcs12.pkcs12FromP12Asn1 === 'function') {
            extractFn = forge.pkcs12.pkcs12FromP12Asn1;
            oids = forge.pki.oids;
            pki = forge.pki;
            foundPath = 'forge.pkcs12';
        } else if (forge.pki && forge.pki.pkcs12 && typeof forge.pki.pkcs12.pkcs12FromP12Asn1 === 'function') {
            extractFn = forge.pki.pkcs12.pkcs12FromP12Asn1;
            oids = forge.pki.oids;
            pki = forge.pki;
            foundPath = 'forge.pki.pkcs12';
        } else if (forge.default && forge.default.pkcs12 && typeof forge.default.pkcs12.pkcs12FromP12Asn1 === 'function') {
            extractFn = forge.default.pkcs12.pkcs12FromP12Asn1;
            oids = forge.default.pki.oids;
            pki = forge.default.pki;
            foundPath = 'forge.default.pkcs12';
        } else if (forge.pkcs12 && typeof forge.pkcs12.pkcs12FromAsn1 === 'function') { // Fallback for older versions or different exports
            extractFn = forge.pkcs12.pkcs12FromAsn1;
            oids = forge.pki.oids;
            pki = forge.pki;
            foundPath = 'forge.pkcs12.pkcs12FromAsn1';
        }

        if (typeof extractFn !== 'function' || !oids || !pki) {
            console.error('[EFI] Estrutura do forge:', Object.keys(forge));
            throw new Error('Não foi possível localizar a função pkcs12FromP12Asn1 ou módulos PKI/OIDs na biblioteca node-forge.');
        }
        console.log(`[EFI] node-forge path successful: ${foundPath}`);

        const p12 = extractFn(p12Asn1, password);

        const certBags = p12.getBags({ bagType: oids.certBag });
        const keyBags = p12.getBags({ bagType: oids.pkcs8ShroudedKeyBag });

        const key = keyBags[oids.pkcs8ShroudedKeyBag][0]?.key;

        if (!key) {
            throw new Error('Chave Privada não encontrada dentro do arquivo .p12');
        }

        // Extrair TODOS os certificados (chain completo) do P12
        const certBagArray = certBags[oids.certBag];
        if (!certBagArray || certBagArray.length === 0) {
            throw new Error('Nenhum certificado encontrado dentro do arquivo .p12');
        }

        // Concatenar todos os certificados em uma cadeia PEM
        const certChainPem = certBagArray
            .map((bag: any) => pki.certificateToPem(bag.cert))
            .join('\n');

        const keyPem = pki.privateKeyToPem(key);

        // --- DIAGNÓSTICO DO CERTIFICADO ---
        const firstCert = certBagArray[0].cert;
        const subject = firstCert.subject.attributes
            .map((a: any) => `${a.shortName || a.name}=${a.value}`)
            .join(', ');

        console.log(`[EFI DIAG] Assunto: ${subject}`);
        console.log(`[EFI DIAG] Válido de: ${firstCert.validity.notBefore}`);
        console.log(`[EFI DIAG] Válido até: ${firstCert.validity.notAfter}`);
        console.log(`[EFI DIAG] Cadeia extraída: ${certBagArray.length} cert(s)`);
        // ----------------------------------

        return { certPem: certChainPem, keyPem };
    } catch (e: any) {
        console.error('[EFI] Erro no processamento do certificado:', e);
        throw new Error(`Erro no Certificado: ${e.message || e}`);
    }
}

/**
 * Obtém o access token do EFI Bank usando client credentials e mTLS
 */
async function getEfiAccessToken(client: any): Promise<string> {
    const clientId = Deno.env.get('EFI_CLIENT_ID') || '';
    const clientSecret = Deno.env.get('EFI_CLIENT_SECRET') || '';
    const isSandbox = Deno.env.get('EFI_SANDBOX') === 'true';

    console.log(`[EFI] Conectando em: ${isSandbox ? 'HOMOLOGAÇÃO (Sandbox)' : 'PRODUÇÃO'}`);
    console.log(`[EFI] Client ID (início): ${clientId.substring(0, 15)}...`);
    console.log(`[EFI] URL: ${EFI_AUTH_URL}`);

    if (!clientId || !clientSecret) {
        throw new Error('Configuração EFI incompleta: Faltam EFI_CLIENT_ID ou EFI_CLIENT_SECRET');
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    try {
        const response = await fetch(EFI_AUTH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'client_credentials'
            }),
            client: client
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[EFI] Erro na resposta do Token:', errorText);
            throw new Error(`Erro EFI (Token): ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (e: any) {
        console.error('[EFI] Erro de Conexão Crítico:', e.message);
        if (e.message.includes('peer closed connection')) {
            throw new Error('A Efí recusou a conexão. Verifique se o Client_ID/Secret é de PRODUÇÃO e se a Chave PIX está correta.');
        }
        throw e;
    }
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

    console.log("[EFI] Início da função - Versão 2.1 (mTLS + Logs Detalhados)");

    try {
        const { producerId, paymentData } = await req.json();

        console.log(`[EFI] Criando pagamento para produtor: ${producerId}`, paymentData);

        // 1. Inicializar cliente mTLS (Obrigatório para API Pix da EFI)
        const certBase64 = Deno.env.get('EFI_CERTIFICATE_BASE64');
        if (!certBase64) {
            throw new Error('Configuração EFI incompleta: Falta EFI_CERTIFICATE_BASE64');
        }

        const { certPem, keyPem } = extractCertsFromP12(certBase64);

        // Criar cliente HTTP com certificado mutuo TLS
        // @ts-ignore: Deno.createHttpClient is available in Supabase Edge Functions
        const httpClient = Deno.createHttpClient({
            certChain: certPem,
            privateKey: keyPem,
        });

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Buscar dados do produtor e configuração EFI
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

        // 3. Calcular taxas (split)
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

        // 4. Obter access token do EFI (usando mTLS)
        const accessToken = await getEfiAccessToken(httpClient);

        // 5. Gerar txid único
        const txid = generateTxid();
        const externalReference = `efi_${producerId}_${Date.now()}`;

        // 6. Configurações da plataforma
        const efiAccountProducer = producer.efi_config.account_identifier;
        const efiAccountPlatform = Deno.env.get('EFI_ACCOUNT_ID');
        const platformPixKey = Deno.env.get('EFI_PIX_KEY');

        if (!platformPixKey) {
            throw new Error('Configuração incompleta: EFI_PIX_KEY não configurada');
        }

        // 7. Criar cobrança PIX com SPLIT automático do EFI Bank
        // Documentação EFI: O split deve ser enviado no campo 'split' dentro do 'cob'
        const cobPayload: any = {
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
            chave: platformPixKey,
            solicitacaoPagador: `Compra: ${paymentData.title}`,
            infoAdicionais: [
                { nome: 'Produto', valor: paymentData.title },
                { nome: 'Referência', valor: externalReference }
            ],
            // Configuração do Split Automático (EFI Bank)
            split: {
                minhaParte: platformFee.toFixed(2), // Valor que fica para a plataforma (dona do certificado)
                repasses: [
                    {
                        accountId: producer.efi_config.account_identifier, // ID da conta EFI do produtor
                        valor: producerAmount.toFixed(2), // Valor que vai para o produtor
                        descricao: `Venda: ${paymentData.title}`
                    }
                ]
            }
        };

        console.log('[EFI] Enviando cobrança com split:', JSON.stringify(cobPayload, null, 2));

        const cobResponse = await fetch(`${EFI_API_URL}/v2/cob/${txid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cobPayload),
            // @ts-ignore
            client: httpClient
        });

        if (!cobResponse.ok) {
            const error = await cobResponse.json();
            console.error('[EFI] Erro ao criar cobrança:', error);
            throw new Error(`Erro EFI: ${error.mensagem || JSON.stringify(error)}`);
        }

        const cobData = await cobResponse.json();
        console.log('[EFI] Cobrança criada:', cobData);

        // 8. Gerar QR Code
        const qrResponse = await fetch(`${EFI_API_URL}/v2/loc/${cobData.loc.id}/qrcode`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            // @ts-ignore
            client: httpClient
        });

        let qrData = { qrcode: '', imagemQrcode: '' };
        if (qrResponse.ok) {
            qrData = await qrResponse.json();
        } else {
            console.warn('[EFI] Não foi possível gerar QR Code, usando fallback');
        }

        // 9. Salvar pagamento no banco de dados
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
