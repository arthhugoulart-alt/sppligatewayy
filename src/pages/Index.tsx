import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  ArrowRight,
  CreditCard,
  Users,
  BarChart3,
  CheckCircle,
  Lock,
  RefreshCw,
} from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm mb-8">
              <Zap className="h-4 w-4 text-primary" />
              <span>Sistema de Split de Pagamentos</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Split automático com
              <span className="block text-gradient mt-2">Mercado Pago</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Integre sua plataforma de produtos digitais e receba suas comissões automaticamente em cada venda. OAuth seguro, webhooks em tempo real e logs financeiros completos.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-lg px-8"
              >
                <Link to="/auth">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8"
              >
                <Link to="/dashboard">Ver Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Como funciona o Split</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            O sistema divide automaticamente o valor de cada venda entre o produtor e a plataforma usando o modelo de Marketplace do Mercado Pago.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: "OAuth Seguro",
              description: "Produtores conectam suas contas Mercado Pago de forma segura, sem compartilhar senhas.",
            },
            {
              icon: CreditCard,
              title: "Application Fee",
              description: "Taxa da plataforma é descontada automaticamente no momento do pagamento.",
            },
            {
              icon: BarChart3,
              title: "Webhooks em Tempo Real",
              description: "Receba notificações instantâneas sobre o status de cada transação.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 mb-6 group-hover:shadow-glow transition-shadow">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="container mx-auto px-4 py-20">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Segurança de Nível Financeiro</h2>
              <p className="text-white/70 mb-6">
                Construído com as melhores práticas de segurança para sistemas de pagamento.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Lock, text: "Tokens OAuth criptografados" },
                  { icon: Shield, text: "Validação de assinatura em webhooks" },
                  { icon: RefreshCw, text: "Idempotência em todas as operações" },
                  { icon: CheckCircle, text: "Logs de auditoria completos" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Shield className="relative h-48 w-48 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-white/40 text-sm">
          © 2024 SplitPay - Sistema de Split de Pagamentos para Marketplaces
        </div>
      </footer>
    </div>
  );
}
