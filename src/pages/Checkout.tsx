import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  producer_id: string;
}

export default function Checkout() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  const fetchProduct = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!product) return;

    setIsProcessing(true);
    try {
      // Direct Fetch to Edge Function (Public)
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`;
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // No Authorization header needed as we disabled JWT enforcement
        },
        body: JSON.stringify({
          producerId: product.producer_id,
          paymentData: {
            title: product.title,
            price: product.price,
            successUrl: window.location.origin + "/dashboard", // Ideally a generic success page
            failureUrl: window.location.origin + "/dashboard",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro Edge Function: ${response.status}`);
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Link de pagamento não gerado.");
      }

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
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
        </CardHeader>
        <CardContent>
          <div className="bg-white p-4 rounded-md border border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-1">Resumo do pedido</p>
            <div className="flex justify-between items-center font-medium">
              <span>1x {product.name}</span>
              <span>R$ {product.price.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full text-lg h-12" 
            onClick={handleBuy}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Pagar com Mercado Pago
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
