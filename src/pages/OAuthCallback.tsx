import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState("Conectando com Mercado Pago...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Código de autorização não encontrado.",
      });
      navigate("/producers");
      return;
    }

    handleConnect(code, state);
  }, []);

  const handleConnect = async (code: string, state: string) => {
    try {
      // Decode state to get producerId
      const decodedState = JSON.parse(atob(state));
      const { producerId } = decodedState;

      // Call Edge Function to exchange code for token
      const { data, error } = await supabase.functions.invoke("connect-account", {
        body: { code, producerId, redirectUri: `${window.location.origin}/oauth/callback` },
      });

      if (error) throw error;

      toast({
        title: "Conexão realizada com sucesso!",
        description: "O produtor agora está conectado ao Mercado Pago.",
      });

      navigate("/producers");
    } catch (error) {
      console.error("Erro ao conectar:", error);
      toast({
        variant: "destructive",
        title: "Falha na conexão",
        description: error instanceof Error ? error.message : "Não foi possível conectar a conta. Tente novamente.",
      });
      navigate("/producers");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Processando Conexão</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </div>
  );
}
