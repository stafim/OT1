import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, MapPin, AlertCircle } from "lucide-react";

interface IntegrationStatus {
  googleMapsApiKey: boolean;
}

export default function IntegrationsPage() {
  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Integrações"
        breadcrumbs={[
          { label: "Configurações", href: "/" },
          { label: "Integrações" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Google Maps</CardTitle>
                    <CardDescription>API para mapas e geolocalização</CardDescription>
                  </div>
                </div>
                <Badge variant={status?.googleMapsApiKey ? "default" : "secondary"}>
                  {status?.googleMapsApiKey ? "Configurado" : "Não configurado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.googleMapsApiKey ? (
                <div className="flex items-center gap-3 rounded-md border bg-green-50 dark:bg-green-950/30 p-4">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Chave da API configurada
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      A integração com o Google Maps está ativa
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Chave da API não configurada
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Para configurar a integração com o Google Maps, adicione a chave da API como um secret no Replit:
                      </p>
                      <ol className="text-xs text-orange-600 dark:text-orange-400 list-decimal ml-4 space-y-1">
                        <li>Acesse o Google Cloud Console e obtenha sua chave da API do Google Maps</li>
                        <li>No Replit, clique na aba "Secrets" no painel lateral</li>
                        <li>Adicione um novo secret com a chave <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">GOOGLE_MAPS_API_KEY</code></li>
                        <li>Cole o valor da sua chave da API</li>
                        <li>Reinicie a aplicação para aplicar as mudanças</li>
                      </ol>
                      <p className="text-xs text-muted-foreground pt-2">
                        Obtenha sua chave em{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Google Cloud Console
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Mais integrações serão adicionadas em breve
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
