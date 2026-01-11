import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { formatCurrency, statusLabels, paymentTypeLabels } from "@/lib/mercadopago";
import {
  Search,
  CreditCard,
  RefreshCw,
  Filter,
  Download,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payment {
  id: string;
  external_reference: string;
  mp_payment_id: string | null;
  total_amount: number;
  platform_fee: number;
  producer_amount: number;
  status: string;
  payment_type: string | null;
  payer_email: string | null;
  payer_name: string | null;
  split_confirmed: boolean;
  created_at: string;
  approved_at: string | null;
  producer?: {
    business_name: string;
  };
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          producer:producers(business_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data as unknown as Payment[]);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.external_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.payer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (p.mp_payment_id?.includes(searchTerm) ?? false);
    
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const totalFees = filteredPayments.reduce((sum, p) => sum + Number(p.platform_fee), 0);

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
            <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
            <p className="text-muted-foreground">
              Histórico de transações e splits processados
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Total Filtrado</div>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Taxas da Plataforma</div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalFees)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Transações</div>
              <div className="text-2xl font-bold">{filteredPayments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por referência, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="in_process">Em Processamento</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
              <SelectItem value="charged_back">Estornado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transações
            </CardTitle>
            <CardDescription>
              Lista completa de pagamentos com detalhes do split
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                <p className="text-sm text-muted-foreground/70">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Os pagamentos aparecerão aqui quando forem processados"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead>Pagador</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Valor
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Split</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {payment.external_reference}
                            </p>
                            {payment.mp_payment_id && (
                              <p className="text-xs text-muted-foreground">
                                MP: {payment.mp_payment_id}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.producer?.business_name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{payment.payer_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.payer_email || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.total_amount)}
                        </TableCell>
                        <TableCell className="text-primary font-medium">
                          {formatCurrency(payment.platform_fee)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(payment.producer_amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status as any} pulse={payment.status === "pending" || payment.status === "in_process"}>
                            {statusLabels[payment.status as keyof typeof statusLabels] || payment.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {payment.split_confirmed ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" />
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              Pendente
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
