import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, MapPin, Clock, User, Building2, Package, Navigation, AlertTriangle } from "lucide-react";
import type { Collect, Driver, Yard, Manufacturer } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type CollectWithRelations = Collect & {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver | null;
};

export default function TrafficPage() {
  const { data: collects, isLoading } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects"],
    refetchInterval: 30000,
  });

  const activeCollects = collects?.filter(
    (c) => c.status === "em_transito" || (c.checkinDateTime && !c.checkoutDateTime)
  ) || [];

  const delayedCollects = activeCollects.filter((c) => {
    if (!c.checkinDateTime) return false;
    const hoursInTransit = (Date.now() - new Date(c.checkinDateTime).getTime()) / (1000 * 60 * 60);
    return hoursInTransit > 24;
  });

  const recentCollects = collects
    ?.filter((c) => c.status === "finalizada")
    ?.sort((a, b) => {
      const dateA = a.checkoutDateTime ? new Date(a.checkoutDateTime).getTime() : 0;
      const dateB = b.checkoutDateTime ? new Date(b.checkoutDateTime).getTime() : 0;
      return dateB - dateA;
    })
    ?.slice(0, 5) || [];

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
        title="Tráfego Agora"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Tráfego Agora" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em Trânsito</CardTitle>
                <Truck className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{activeCollects.length}</p>
              <p className="text-xs text-muted-foreground mt-1">veículos em movimento</p>
            </CardContent>
          </Card>

          <Card className={delayedCollects.length > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em Atraso</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${delayedCollects.length > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${delayedCollects.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {delayedCollects.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">mais de 24h em trânsito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Finalizadas Hoje</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {collects?.filter((c) => {
                  if (!c.checkoutDateTime) return false;
                  const today = new Date();
                  const checkoutDate = new Date(c.checkoutDateTime);
                  return checkoutDate.toDateString() === today.toDateString();
                }).length || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">coletas concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Coletas</CardTitle>
                <Navigation className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{collects?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">no sistema</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              Em Trânsito Agora
            </h2>
            {activeCollects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum veículo em trânsito no momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeCollects.map((collect) => (
                  <Card key={collect.id} className="overflow-hidden">
                    <div className="h-1 bg-orange-500" />
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              Em Trânsito
                            </Badge>
                            <span className="font-mono text-sm font-medium">{collect.chassi}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span>{collect.driver?.name || "Sem motorista"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              <span>{collect.yard?.name || "-"}</span>
                            </div>
                          </div>

                          {collect.checkinDateTime && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Saiu {formatDistanceToNow(new Date(collect.checkinDateTime), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                          )}

                          {collect.checkinLatitude && collect.checkinLongitude && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">{collect.checkinLatitude}, {collect.checkinLongitude}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Últimas Finalizadas
            </h2>
            {recentCollects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma coleta finalizada recentemente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentCollects.map((collect) => (
                  <Card key={collect.id} className="overflow-hidden">
                    <div className="h-1 bg-green-500" />
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Finalizada
                          </Badge>
                          <span className="font-mono text-sm font-medium">{collect.chassi}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span>{collect.driver?.name || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{collect.yard?.name || "-"}</span>
                          </div>
                        </div>

                        {collect.checkoutDateTime && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Concluída {format(new Date(collect.checkoutDateTime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
