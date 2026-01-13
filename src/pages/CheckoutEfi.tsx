import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Users, CheckCircle, Copy, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    producer_id: string;
    producers?: {
        business_name: string;
    };
}

interface PixData {
    txid: string;
    pixCopiaECola: string;
    qrCodeBase64: string;
    expiresAt: string | null;
    amount: number;
    platformFee: number;
    producerAmount: number;
}

export default function CheckoutEfi() {
    const { productId } = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [pixData, setPixData] = useState<PixData | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>("pending");
    const [checkingStatus, setCheckingStatus] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (productId) {
            fetchProduct(productId);
        }
    }, [productId]);

    // Verificar status do pagamento periodicamente quando tiver pixData
    useEffect(() => {
        if (!pixData?.txid || paymentStatus === 'approved') return;

        const interval = setInterval(() => {
            checkPaymentStatus(pixData.txid);
        }, 5000); // Verificar a cada 5 segundos

        return () => clearInterval(interval);
    }, [pixData?.txid, paymentStatus]);

    const fetchProduct = async (id: string) => {
        try {
            console.log("[EFI Checkout] Buscando produto:", id);
            const { data, error } = await supabase
                .from("products")
                .select(`
          *,
          producers (
            business_name,
            efi_connected
          )
        `)
                .eq("id", id)
                .single();

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            // Verificar se o produtor está conectado ao EFI
            const producerData = Array.isArray(data.producers) ? data.producers[0] : data.producers;
            if (!producerData?.efi_connected) {
                toast({
                    variant: "destructive",
                    title: "EFI não configurado",
                    description: "Este vendedor ainda não configurou pagamentos via EFI Bank.",
                });
            }

            const productWithProducer = {
                ...data,
                producers: producerData
            };

            setProduct(productWithProducer as any);
        } catch (error) {
            console.error("Erro ao buscar produto:", error);
        } finally {
            setLoading(false);
        }
    };

    const createPixPayment = async () => {
        if (!product) return;

        setCreatingPayment(true);

        try {
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/efi-create-payment`;

            const response = await fetch(functionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    producerId: product.producer_id,
                    paymentData: {
                        title: product.name,
                        price: product.price,
                        productId: product.id,
                    },
                }),
            });

            const result = await response.json();
            console.log("[EFI Checkout] Resultado:", result);

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Erro ao criar pagamento");
            }

            setPixData({
                txid: result.txid,
                pixCopiaECola: result.pixCopiaECola,
                qrCodeBase64: result.qrCodeBase64,
                expiresAt: result.expiresAt,
                amount: result.amount,
                platformFee: result.platformFee,
                producerAmount: result.producerAmount,
            });

            toast({
                title: "PIX gerado com sucesso!",
                description: "Escaneie o QR Code ou copie o código para pagar.",
            });
        } catch (error: any) {
            console.error("[EFI Checkout] Erro:", error);
            toast({
                variant: "destructive",
                title: "Erro ao gerar PIX",
                description: error.message,
            });
        } finally {
            setCreatingPayment(false);
        }
    };

    const checkPaymentStatus = async (txid: string) => {
        try {
            setCheckingStatus(true);

            // Buscar status do pagamento no banco
            const { data, error } = await supabase
                .from("payments")
                .select("status")
                .eq("efi_txid", txid)
                .single();

            if (data?.status === 'approved') {
                setPaymentStatus('approved');
                toast({
                    title: "Pagamento confirmado!",
                    description: "Seu pagamento foi recebido com sucesso.",
                });
            }
        } catch (error) {
            console.log("Verificando status...");
        } finally {
            setCheckingStatus(false);
        }
    };

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Código copiado!",
            description: "Cole no seu app do banco para pagar.",
        });
    }, [toast]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Produto não encontrado</AlertTitle>
                    <AlertDescription>
                        Este produto não existe ou não está mais disponível.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Pagamento aprovado
    if (paymentStatus === 'approved') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-lg border-green-200">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-700 mb-2">Pagamento Confirmado!</h2>
                        <p className="text-gray-600 text-center mb-6">
                            Seu pagamento de <span className="font-semibold">R$ {product.price.toFixed(2)}</span> foi recebido com sucesso.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 w-full">
                            <p className="text-sm text-gray-500 mb-1">Produto</p>
                            <p className="font-medium">{product.name}</p>
                        </div>
                        <Button
                            className="mt-6 w-full"
                            variant="outline"
                            onClick={() => window.location.href = '/'}
                        >
                            Voltar ao início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{product.name}</CardTitle>
                            <CardDescription className="mt-2">{product.description || "Sem descrição"}</CardDescription>
                        </div>
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                            R$ {product.price.toFixed(2)}
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full border border-gray-200">
                            <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Vendedor Responsável</p>
                            <p className="font-medium text-gray-900 text-sm">
                                {product.producers?.business_name || "Vendedor Parceiro"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 justify-center">
                        <AlertCircle className="h-3 w-3" />
                        <span>Pagamento processado de forma segura pelo EFI Bank</span>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="bg-white p-4 rounded-md border border-gray-100 mb-4">
                        <p className="text-sm text-gray-500 mb-1">Resumo do pedido</p>
                        <div className="flex justify-between items-center font-medium">
                            <span>1x {product.name}</span>
                            <span>R$ {product.price.toFixed(2)}</span>
                        </div>
                    </div>

                    {pixData ? (
                        <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in zoom-in duration-300">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-lg text-green-600">Pague com PIX</h3>
                                <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o código abaixo</p>
                            </div>

                            {/* QR Code Image */}
                            {pixData.qrCodeBase64 && (
                                <div className="border-2 border-dashed border-gray-200 p-2 rounded-lg bg-white">
                                    <img
                                        src={pixData.qrCodeBase64.startsWith('data:')
                                            ? pixData.qrCodeBase64
                                            : `data:image/png;base64,${pixData.qrCodeBase64}`}
                                        alt="QR Code PIX"
                                        className="w-48 h-48 object-contain"
                                    />
                                </div>
                            )}

                            {/* Status indicator */}
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                {checkingStatus ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                <span>Aguardando pagamento...</span>
                            </div>

                            {/* Copia e Cola */}
                            <div className="w-full space-y-2">
                                <p className="text-xs text-gray-500 font-medium text-center uppercase tracking-wider">
                                    PIX Copia e Cola
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={pixData.pixCopiaECola}
                                        className="flex-1 text-xs border rounded px-3 py-2 bg-gray-50 font-mono text-gray-600 truncate focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(pixData.pixCopiaECola)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Expiration */}
                            {pixData.expiresAt && (
                                <p className="text-xs text-orange-500">
                                    Válido até: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                                </p>
                            )}

                            <div className="text-xs text-center text-gray-400 mt-4 max-w-xs">
                                Após o pagamento, a confirmação será exibida automaticamente.
                            </div>

                            <Button
                                className="w-full mt-4"
                                variant="ghost"
                                onClick={() => {
                                    setPixData(null);
                                    setPaymentStatus('pending');
                                }}
                            >
                                Voltar / Novo Pagamento
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* EFI Bank Logo/Badge */}
                            <div className="flex items-center justify-center gap-2 py-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">EFI</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">Pagar com PIX</p>
                                    <p className="text-xs text-gray-500">Via EFI Bank</p>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                size="lg"
                                onClick={createPixPayment}
                                disabled={creatingPayment}
                            >
                                {creatingPayment ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Gerando PIX...
                                    </>
                                ) : (
                                    <>
                                        Gerar QR Code PIX
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-gray-400">
                                Pague instantaneamente usando qualquer banco
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
