import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

// Initialize Mercado Pago with Platform Public Key
// IMPORTANT: Add VITE_MP_PUBLIC_KEY to your .env file
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
} else {
  console.warn("VITE_MP_PUBLIC_KEY is missing in .env");
}

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

export default function Checkout() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  const fetchProduct = async (id: string) => {
    try {
      console.log("Fetching product with ID:", id);
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          producers (
            business_name
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
         console.error("Supabase Error:", error);
         throw error;
      }
      
      console.log("Product data fetched:", data);
      
      // Force type casting if needed or map manually
      const productWithProducer = {
         ...data,
         // Handle if producers is an array (unlikely with single relationship but possible in query)
         // or object
         producers: Array.isArray(data.producers) ? data.producers[0] : data.producers
      };
      
      setProduct(productWithProducer as any);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentData: any) => {
    if (!product) return;

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`;
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          producerId: product.producer_id,
          paymentData: {
            title: product.name,
            price: product.price,
            formData: paymentData, // Send Brick data to backend
            type: 'brick' // Explicitly indicate this is a Brick payment
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Erro: ${response.status}`);
      }

      if (result.status) {
        let title = "Pagamento Processado";
        let description = `Status: ${result.status_detail || result.status}`;
        let variant: "default" | "destructive" = "destructive";

        if (result.status === 'approved') {
          title = "Pagamento Aprovado!";
          description = "Sua compra foi realizada com sucesso.";
          variant = "default";
        } else if (result.status === 'rejected') {
          if (result.status_detail === 'rejected_by_biz_rule') {
             title = "Pagamento Recusado (Auto-pagamento)";
             description = `Você está tentando pagar para ${product.producers?.business_name || 'o vendedor'}? O Mercado Pago não permite que o dono da conta pague a si mesmo.`;
          } else if (result.status_detail === 'cc_rejected_other_reason') {
             title = "Pagamento Recusado";
             description = "O pagamento foi recusado pelo banco ou operadora.";
          } else {
             title = "Pagamento Recusado";
             description = `O pagamento não foi aprovado. Detalhe: ${result.status_detail}`;
          }
        }

        toast({
          title,
          description,
          variant,
        });
      } else {
        console.warn("Unexpected response format:", result);
        toast({
          title: "Atenção",
          description: "O pagamento foi enviado, mas não recebemos o status de confirmação.",
        });
      }

      // Redirect based on status if needed, or show success message
      if (result.status === 'approved') {
         // Maybe redirect to success page
      }

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message,
      });
    }
  };

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

  if (!MP_PUBLIC_KEY) {
     return (
       <div className="flex h-screen items-center justify-center p-4">
         <Alert variant="destructive" className="max-w-md">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Configuração Pendente</AlertTitle>
           <AlertDescription>
             A chave pública do Mercado Pago (VITE_MP_PUBLIC_KEY) não foi configurada no arquivo .env.
           </AlertDescription>
         </Alert>
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
          {product.producers?.business_name && (
            <div className="mt-2 text-sm text-gray-500">
              Vendido por: <span className="font-medium text-gray-900">{product.producers.business_name}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-white p-4 rounded-md border border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-1">Resumo do pedido</p>
            <div className="flex justify-between items-center font-medium">
              <span>1x {product.name}</span>
              <span>R$ {product.price.toFixed(2)}</span>
            </div>
          </div>

          <Payment
            initialization={{
              amount: product.price,
            }}
            customization={{
              paymentMethods: {
                ticket: "all",
                bankTransfer: "all",
                creditCard: "all",
                debitCard: "all",
                mercadoPago: "all",
              },
            }}
            onSubmit={async (param) => {
              console.log("Payment Brick data:", param);
              // Ensure we extract the correct data structure
              const paymentData = param.formData || param;
              await handlePayment(paymentData);
            }}
            onReady={() => console.log("Payment Brick ready")}
            onError={(error) => console.error("Payment Brick error:", error)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
