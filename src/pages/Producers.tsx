import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Trash2,
  FileText,
  Edit,
  CreditCard,
  Banknote,
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
  efi_connected?: boolean;
  efi_account_id?: string | null;
  efi_pix_key?: string | null;
  status: string;
  platform_fee_percentage: number;
  created_at: string;
}

export default function Producers() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEfiDialogOpen, setIsEfiDialogOpen] = useState(false);
  const [efiFormData, setEfiFormData] = useState({
    producerId: "",
    efiAccountId: "",
    pixKey: "",
    pixKeyType: "cpf" as "cpf" | "cnpj" | "email" | "phone" | "random",
  });
  const [connectingEfi, setConnectingEfi] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    email: "",
    document_type: "CPF",
    document_number: "",
    platform_fee_percentage: "10.00",
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducers();
  }, []);

  const fetchProducers = async () => {
    try {
      // Fetch only the producer account associated with the current user
      const { data, error } = await supabase
        .from("producers")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducers(data || []);

      // If user has no producer account, open the creation dialog automatically
      if (!data || data.length === 0) {
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching producers:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar conta",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProducer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing producer
        const { error } = await supabase
          .from("producers")
          .update({
            business_name: formData.business_name,
            email: formData.email,
            document_type: formData.document_type,
            document_number: formData.document_number,
            // Security: Prevent user from changing the fee
            // platform_fee_percentage: parseFloat(formData.platform_fee_percentage),
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Conta atualizada!",
          description: "Seus dados foram salvos com sucesso.",
        });
      } else {
        // Create new producer
        const { error } = await supabase.from("producers").insert({
          user_id: user?.id,
          business_name: formData.business_name,
          email: formData.email,
          document_type: formData.document_type,
          document_number: formData.document_number,
          // Force Default Fee (10% for Production, 0% for testing if needed)
          platform_fee_percentage: 10.00,
          status: "pending",
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Agora conecte seu Mercado Pago para receber.",
        });
      }

      closeDialog();
      fetchProducers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `Erro ao ${editingId ? "atualizar" : "criar"} conta`,
        description: error.message,
      });
    }
  };

  const handleEdit = (producer: Producer) => {
    setEditingId(producer.id);
    setFormData({
      business_name: producer.business_name,
      email: producer.email,
      document_type: producer.document_type || "CPF",
      document_number: producer.document_number || "",
      platform_fee_percentage: producer.platform_fee_percentage.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este recebedor? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("producers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Recebedor excluído",
        description: "O recebedor foi removido com sucesso.",
      });
      fetchProducers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      business_name: "",
      email: "",
      document_type: "CPF",
      document_number: "",
      platform_fee_percentage: "10.00",
    });
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

  const openEfiConnectDialog = (producerId: string) => {
    setEfiFormData({
      producerId,
      efiAccountId: "",
      pixKey: "",
      pixKeyType: "cpf",
    });
    setIsEfiDialogOpen(true);
  };

  const handleConnectEfi = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingEfi(true);

    try {
      console.log("[EFI] Iniciando conexão direta com o banco...");

      // 1. Atualizar a tabela de produtores
      const { error: producerError } = await supabase
        .from("producers")
        .update({
          efi_connected: true,
          efi_account_id: efiFormData.efiAccountId,
          efi_pix_key: efiFormData.pixKey,
        })
        .eq("id", efiFormData.producerId);

      if (producerError) throw producerError;

      // 2. Inserir ou atualizar na tabela efi_config
      const { error: configError } = await supabase
        .from("efi_config")
        .upsert({
          producer_id: efiFormData.producerId,
          account_identifier: efiFormData.efiAccountId,
          pix_key: efiFormData.pixKey,
          pix_key_type: efiFormData.pixKeyType,
          is_valid: true,
        }, { onConflict: 'producer_id' });

      if (configError) throw configError;

      toast({
        title: "EFI Bank conectado!",
        description: "Sua conta EFI foi vinculada com sucesso no banco de dados.",
      });

      setIsEfiDialogOpen(false);
      fetchProducers();
    } catch (error: any) {
      console.error("[EFI] Erro na conexão:", error);
      toast({
        variant: "destructive",
        title: "Erro ao conectar EFI Bank",
        description: error.message,
      });
    } finally {
      setConnectingEfi(false);
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">
              Configure sua conta para receber pagamentos e gerencie suas taxas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            // Prevent closing if no producer exists
            if (!open && producers.length > 0) closeDialog();
            else if (open) setIsDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              {producers.length === 0 && (
                <Button className="bg-gradient-primary hover:opacity-90" onClick={() => {
                  setEditingId(null);
                  setFormData({
                    business_name: "",
                    email: "",
                    document_type: "CPF",
                    document_number: "",
                    platform_fee_percentage: "10.00",
                  });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ativar Recebimentos
                </Button>
              )}
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveProducer}>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Meus Dados" : "Ativar Recebimentos"}</DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? "Atualize seus dados comerciais abaixo."
                      : "Preencha seus dados para começar a vender."}
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
                  <div className="space-y-2 hidden">
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
                      Taxa fixa da plataforma (10%).
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-primary hover:opacity-90">
                    {editingId ? "Salvar Alterações" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Alert className="bg-muted/50 border-primary/20">
          <AlertTitle className="font-semibold flex items-center gap-2 text-primary">
            <CheckCircle className="h-4 w-4" />
            Configuração da Conta
          </AlertTitle>
          <AlertDescription className="mt-3">
            <p className="mb-2 font-medium">Para começar a vender:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-1">
              <li>Preencha seus dados comerciais no formulário.</li>
              <li>Conecte sua conta do Mercado Pago para receber os pagamentos.</li>
              <li>A plataforma cobrará automaticamente uma taxa de 10% sobre as vendas.</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Search - Hidden since it's personal profile */}
        {/* <div className="flex items-center gap-4"> ... </div> */}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Status da Conta
            </CardTitle>
            <CardDescription>
              Seus dados de recebimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Conta não configurada</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Complete seu cadastro para começar a vender
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ativar Agora
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mercado Pago</TableHead>
                    <TableHead>EFI Bank</TableHead>
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
                        {producer.efi_connected ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Conectado</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEfiConnectDialog(producer.id)}
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          >
                            <Banknote className="mr-2 h-3 w-3" />
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
                            <DropdownMenuItem onClick={() => handleEdit(producer)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(producer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigate("/payments");
                              toast({
                                title: "Dica",
                                description: `Você pode filtrar por "${producer.business_name}" na aba de pagamentos.`,
                              });
                            }}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Ver pagamentos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(producer.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
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

      {/* EFI Bank Connection Dialog */}
      <Dialog open={isEfiDialogOpen} onOpenChange={setIsEfiDialogOpen}>
        <DialogContent>
          <form onSubmit={handleConnectEfi}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-orange-500" />
                Conectar EFI Bank
              </DialogTitle>
              <DialogDescription>
                Informe os dados da sua conta EFI Bank para receber pagamentos via PIX.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="efi_account_id">Identificador da Conta EFI *</Label>
                <Input
                  id="efi_account_id"
                  value={efiFormData.efiAccountId}
                  onChange={(e) =>
                    setEfiFormData({ ...efiFormData, efiAccountId: e.target.value })
                  }
                  placeholder="Ex: conta_123456"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Encontre este identificador no painel da sua conta EFI Bank.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX (opcional)</Label>
                <Input
                  id="pix_key"
                  value={efiFormData.pixKey}
                  onChange={(e) =>
                    setEfiFormData({ ...efiFormData, pixKey: e.target.value })
                  }
                  placeholder="Sua chave PIX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key_type">Tipo da Chave PIX</Label>
                <Select
                  value={efiFormData.pixKeyType}
                  onValueChange={(value: "cpf" | "cnpj" | "email" | "phone" | "random") =>
                    setEfiFormData({ ...efiFormData, pixKeyType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEfiDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={connectingEfi}
              >
                {connectingEfi ? "Conectando..." : "Conectar EFI Bank"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
