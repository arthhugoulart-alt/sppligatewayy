import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, statusLabels } from "@/lib/mercadopago";
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalRevenue: number;
  platformFees: number;
  totalPayments: number;
  activeProducers: number;
  pendingPayments: number;
  approvedPayments: number;
}

interface RecentPayment {
  id: string;
  external_reference: string;
  total_amount: number;
  platform_fee: number;
  status: string;
  payer_email: string;
  created_at: string;
  producer?: {
    business_name: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    platformFees: 0,
    totalPayments: 0,
    activeProducers: 0,
    pendingPayments: 0,
    approvedPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch producers count
      const { count: producerCount } = await supabase
        .from("producers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch payments stats
      const { data: payments } = await supabase
        .from("payments")
        .select("total_amount, platform_fee, status");

      // Fetch recent payments with producer info
      const { data: recent } = await supabase
        .from("payments")
        .select(`
          id,
          external_reference,
          total_amount,
          platform_fee,
          status,
          payer_email,
          created_at,
          producer:producers(business_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments) {
        const approved = payments.filter((p) => p.status === "approved");
        const pending = payments.filter((p) => p.status === "pending" || p.status === "in_process");

        setStats({
          totalRevenue: approved.reduce((sum, p) => sum + Number(p.total_amount), 0),
          platformFees: approved.reduce((sum, p) => sum + Number(p.platform_fee), 0),
          totalPayments: payments.length,
          activeProducers: producerCount || 0,
          pendingPayments: pending.length,
          approvedPayments: approved.length,
        });
      }

      if (recent) {
        setRecentPayments(recent as unknown as RecentPayment[]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de split de pagamentos
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Receita Total"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="Pagamentos aprovados"
            icon={DollarSign}
            variant="primary"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Taxas da Plataforma"
            value={formatCurrency(stats.platformFees)}
            subtitle="Application fees"
            icon={TrendingUp}
            variant="success"
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatsCard
            title="Total de Pagamentos"
            value={stats.totalPayments}
            subtitle={`${stats.pendingPayments} pendentes`}
            icon={CreditCard}
            variant="default"
          />
          <StatsCard
            title="Produtores Ativos"
            value={stats.activeProducers}
            subtitle="Conectados via OAuth"
            icon={Users}
            variant="default"
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Recent payments */}
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pagamentos Recentes</CardTitle>
                <CardDescription>
                  Últimas transações processadas pelo sistema
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/payments")}>
                Ver todos
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Nenhum pagamento registrado</p>
                  <p className="text-sm text-muted-foreground/70">
                    Os pagamentos aparecerão aqui quando forem processados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.external_reference}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.payer_email || "Email não informado"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(payment.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Taxa: {formatCurrency(payment.platform_fee)}
                          </p>
                        </div>
                        <StatusBadge status={payment.status as any}>
                          {statusLabels[payment.status as keyof typeof statusLabels] || payment.status}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions & stats */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment status breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status dos Pagamentos</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success" />
                    <span className="text-sm">Aprovados</span>
                  </div>
                  <span className="font-semibold">{stats.approvedPayments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-warning" />
                    <span className="text-sm">Pendentes</span>
                  </div>
                  <span className="font-semibold">{stats.pendingPayments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                    <span className="text-sm">Outros</span>
                  </div>
                  <span className="font-semibold">
                    {stats.totalPayments - stats.approvedPayments - stats.pendingPayments}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/producers")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Produtores
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/products")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ver Produtos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/webhooks")}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Monitorar Webhooks
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
