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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Webhook,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookLog {
  id: string;
  event_id: string | null;
  event_type: string;
  action: string;
  data_id: string | null;
  raw_payload: any;
  signature_valid: boolean | null;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      // Note: This would normally use service role, but for demo we'll show placeholder
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.log("Webhooks require service role access");
        setWebhooks([]);
      } else {
        setWebhooks(data || []);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWebhooks = webhooks.filter(
    (w) =>
      w.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.data_id?.includes(searchTerm) ?? false)
  );

  const stats = {
    total: webhooks.length,
    processed: webhooks.filter((w) => w.processed).length,
    failed: webhooks.filter((w) => w.error_message).length,
    pending: webhooks.filter((w) => !w.processed && !w.error_message).length,
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Monitor de eventos recebidos do Mercado Pago
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-muted-foreground">Processados</span>
              </div>
              <div className="text-2xl font-bold text-success">{stats.processed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-muted-foreground">Pendentes</span>
              </div>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-muted-foreground">Com Erro</span>
              </div>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Endpoint info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">URL do Webhook</p>
                <p className="text-sm text-muted-foreground">
                  Configure esta URL no painel do Mercado Pago para receber notificações
                </p>
              </div>
              <code className="rounded bg-background px-3 py-2 font-mono text-sm">
                {window.location.origin}/api/webhooks/mercadopago
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchWebhooks}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Log de Eventos
            </CardTitle>
            <CardDescription>
              Histórico de webhooks recebidos e processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredWebhooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Webhook className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum webhook registrado</p>
                <p className="text-sm text-muted-foreground/70">
                  Os eventos do Mercado Pago aparecerão aqui quando forem recebidos
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>ID do Recurso</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWebhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{webhook.event_type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{webhook.action}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {webhook.data_id || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {webhook.signature_valid === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : webhook.signature_valid ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>
                        {webhook.error_message ? (
                          <StatusBadge status="rejected">Erro</StatusBadge>
                        ) : webhook.processed ? (
                          <StatusBadge status="approved">Processado</StatusBadge>
                        ) : (
                          <StatusBadge status="pending">Pendente</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{webhook.retry_count}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(webhook.created_at), "dd/MM/yy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedWebhook(webhook)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Webhook</DialogTitle>
                              <DialogDescription>
                                {webhook.event_type} - {webhook.action}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[400px]">
                              <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
                                {JSON.stringify(webhook.raw_payload, null, 2)}
                              </pre>
                            </ScrollArea>
                            {webhook.error_message && (
                              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                                <strong>Erro:</strong> {webhook.error_message}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
