import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart } from "lucide-react";

interface Producer {
  id: string;
  business_name: string;
  mp_connected: boolean;
}

export default function Products() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [productName, setProductName] = useState("Produto Teste");
  const [productPrice, setProductPrice] = useState("10.00");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnectedProducers();
  }, []);

  const fetchConnectedProducers = async () => {
    try {
      const { data, error } = await supabase
        .from("producers")
        .select("id, business_name, mp_connected")
        .eq("mp_connected", true);

      if (error) throw error;
      setProducers(data || []);
    } catch (error) {
      console.error("Error fetching producers:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtores",
        description: "Não foi possível carregar a lista de produtores conectados.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!selectedProducer) {
      toast({
        variant: "destructive",
        title: "Selecione um produtor",
        description: "É necessário selecionar um produtor para simular a venda.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Get Session Token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Usuário não autenticado");

      // 2. Direct Fetch to Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`;
      console.log("Chamando Edge Function:", functionUrl);

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          producerId: selectedProducer,
          paymentData: {
            title: productName,
            price: parseFloat(productPrice),
            successUrl: window.location.origin + "/dashboard",
            failureUrl: window.location.origin + "/dashboard",
          },
        }),
      });

      const data = await response.json();
      console.log("Resposta Edge Function:", data);

      if (!response.ok) {
        throw new Error(data.error || `Erro Edge Function: ${response.status} ${response.statusText}`);
      }

      if (data.error) throw new Error(data.error);

      // Redirect to Mercado Pago Checkout
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Link de pagamento (init_point) não retornado pelo Mercado Pago.");
      }

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar pagamento",
        description: error.message || "Verifique o console para mais detalhes.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Simulador de Vendas</h2>
          <p className="text-muted-foreground">
            Crie um produto fictício e simule uma compra para testar o split de pagamentos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Novo Pedido</CardTitle>
              <CardDescription>Simule a compra de um cliente final.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Produtor (Vendedor)</Label>
                <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produtor" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : producers.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhum produtor conectado</SelectItem>
                    ) : (
                      producers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.business_name || "Sem nome"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  placeholder="Ex: Curso de Marketing" 
                />
              </div>

              <div className="space-y-2">
                <Label>Preço (BRL)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={productPrice} 
                  onChange={(e) => setProductPrice(e.target.value)} 
                  placeholder="0.00" 
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleBuy} 
                disabled={isProcessing || !selectedProducer}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Comprar Agora (Teste)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
