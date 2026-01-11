import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Link as LinkIcon, ExternalLink, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  created_at: string;
  producer_id?: string;
}

interface Producer {
  id: string;
  business_name: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", producer_id: "" });
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchProducers();
    }
  }, [user]);

  const fetchProducers = async () => {
    try {
      const { data, error } = await supabase
        .from("producers")
        .select("id, business_name")
        .eq("user_id", user?.id)
        .order("business_name");

      if (error) throw error;
      setProducers(data || []);
    } catch (error) {
      console.error("Error fetching producers:", error);
    }
  };

  const fetchProducts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch products where the associated producer belongs to the current user
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          producers!inner (
            user_id
          )
        `)
        .eq("producers.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar",
        description: "Não foi possível carregar seus produtos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    // Auto-select producer if only one exists
    let selectedProducerId = newProduct.producer_id;
    if (!selectedProducerId && producers.length === 1) {
      selectedProducerId = producers[0].id;
    }

    if (!newProduct.name || !newProduct.price || !selectedProducerId) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha nome, preço e certifique-se de ter uma conta de recebimento configurada.",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("products").insert({
        producer_id: selectedProducerId,
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        description: newProduct.description,
      });

      if (error) throw error;

      toast({
        title: "Produto criado!",
        description: "Agora você pode compartilhar o link de checkout.",
      });
      
      setIsCreateOpen(false);
      setNewProduct({ name: "", price: "", description: "", producer_id: "" });
      fetchProducts();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "Link de checkout copiado para a área de transferência.",
    });
  };

  const openCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    window.open(link, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Meus Produtos</h2>
            <p className="text-muted-foreground">
              Gerencie seus produtos e gere links de pagamento.
            </p>
          </div>
          
          {producers.length === 0 && !loading ? (
            <Button onClick={() => navigate("/producers")}>
              Configurar Conta para Vender
            </Button>
          ) : (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Produto</DialogTitle>
                  <DialogDescription>
                    Defina os detalhes do produto para começar a vender.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {producers.length > 1 && (
                    <div className="space-y-2">
                      <Label>Recebedor</Label>
                      <Select
                        value={newProduct.producer_id}
                        onValueChange={(value) => setNewProduct({...newProduct, producer_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um recebedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {producers.map((producer) => (
                            <SelectItem key={producer.id} value={producer.id}>
                              {producer.business_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nome do Produto</Label>
                  <Input 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Ex: Consultoria Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Input 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Breve descrição do produto"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateProduct} disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Produto"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-4">
                Você ainda não criou nenhum produto. Comece agora para gerar seus links de pagamento.
              </p>
              {producers.length === 0 ? (
                <Button onClick={() => navigate("/producers")}>Configurar Conta para Vender</Button>
              ) : (
                <Button onClick={() => setIsCreateOpen(true)}>Criar Primeiro Produto</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{product.name}</CardTitle>
                      <CardDescription>{product.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {product.price.toFixed(2)}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => copyCheckoutLink(product.id)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copiar Link
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => openCheckoutLink(product.id)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
