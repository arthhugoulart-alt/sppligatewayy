import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  ExternalLink,
  MoreHorizontal,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Producer {
  id: string;
  business_name: string;
  email: string;
  document_type: string | null;
  document_number: string | null;
  mp_user_id: string | null;
  mp_connected: boolean;
  status: string;
  platform_fee_percentage: number;
  created_at: string;
}

export default function Producers() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    email: "",
    document_type: "CPF",
    document_number: "",
    platform_fee_percentage: "10.00",
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProducers();
  }, []);

  const fetchProducers = async () => {
    try {
      const { data, error } = await supabase
        .from("producers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducers(data || []);
    } catch (error) {
      console.error("Error fetching producers:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtores",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProducer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from("producers").insert({
        user_id: user?.id,
        business_name: formData.business_name,
        email: formData.email,
        document_type: formData.document_type,
        document_number: formData.document_number,
        platform_fee_percentage: parseFloat(formData.platform_fee_percentage),
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Produtor criado!",
        description: "O produtor foi adicionado com sucesso.",
      });

      setIsDialogOpen(false);
      setFormData({
        business_name: "",
        email: "",
        document_type: "CPF",
        document_number: "",
        platform_fee_percentage: "10.00",
      });
      fetchProducers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar produtor",
        description: error.message,
      });
    }
  };

  const initiateOAuthConnect = (producerId: string) => {
    // URL de OAuth do Mercado Pago (sandbox)
    const clientId = import.meta.env.VITE_MP_APP_ID; // Configurado via .env
    
    if (!clientId) {
      toast({
        variant: "destructive",
        title: "Configuração ausente",
        description: "Configure o VITE_MP_APP_ID no arquivo .env",
      });
      return;
    }

    const redirectUri = `${window.location.origin}/oauth/callback`;
    const state = btoa(JSON.stringify({ producerId }));
    
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.open(authUrl, "_blank");
  };

  const filteredProducers = producers.filter(
    (p) =>
      p.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtores</h1>
            <p className="text-muted-foreground">
              Gerencie os produtores conectados à plataforma
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produtor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateProducer}>
                <DialogHeader>
                  <DialogTitle>Adicionar Produtor</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo produtor para receber pagamentos via split
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Nome do Negócio</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) =>
                        setFormData({ ...formData, business_name: e.target.value })
                      }
                      placeholder="Nome da empresa ou produtor"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document_type">Tipo de Documento</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, document_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="CNPJ">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="document_number">Número</Label>
                      <Input
                        id="document_number"
                        value={formData.document_number}
                        onChange={(e) =>
                          setFormData({ ...formData, document_number: e.target.value })
                        }
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee">Taxa da Plataforma (%)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.platform_fee_percentage}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      A taxa é definida automaticamente pela plataforma.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-primary hover:opacity-90">
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchProducers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Produtores
            </CardTitle>
            <CardDescription>
              {filteredProducers.length} produtor(es) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum produtor cadastrado</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Adicione produtores para começar a processar pagamentos
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Produtor
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mercado Pago</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducers.map((producer) => (
                    <TableRow key={producer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{producer.business_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {producer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {producer.document_type && producer.document_number ? (
                          <span className="text-sm">
                            {producer.document_type}: {producer.document_number}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {producer.platform_fee_percentage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={producer.status as any}>
                          {producer.status === "active"
                            ? "Ativo"
                            : producer.status === "pending"
                            ? "Pendente"
                            : producer.status === "suspended"
                            ? "Suspenso"
                            : "Inativo"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {producer.mp_connected ? (
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Conectado</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => initiateOAuthConnect(producer.id)}
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Conectar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Ver pagamentos</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Desativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
