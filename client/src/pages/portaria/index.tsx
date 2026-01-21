import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, CheckCircle, Clock, Building, MapPin, User, DoorOpen, Loader2, Search, LogOut, Package } from "lucide-react";
import type { Collect, Manufacturer, Yard, Driver, Vehicle, Transport } from "@shared/schema";

interface CollectWithRelations extends Collect {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver;
  vehicle?: Vehicle;
}

interface TransportWithRelations extends Transport {
  client?: Client;
  originYard?: Yard;
  deliveryLocation?: DeliveryLocation;
  driver?: Driver;
  vehicle?: Vehicle;
}

export default function PortariaPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [transportSearchTerm, setTransportSearchTerm] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const { data: collects, isLoading: collectsLoading } = useQuery<Collect[]>({
    queryKey: ["/api/collects"],
  });

  const { data: transports, isLoading: transportsLoading } = useQuery<TransportWithRelations[]>({
    queryKey: ["/api/transports"],
  });

  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: yards } = useQuery<Yard[]>({
    queryKey: ["/api/yards"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const authorizeMutation = useMutation({
    mutationFn: async (collectId: string) => {
      return apiRequest("POST", `/api/portaria/authorize/${collectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Entrada autorizada! Veículo atualizado para Em Estoque." });
    },
    onError: () => {
      toast({ title: "Erro ao autorizar entrada", variant: "destructive" });
    },
  });

  const authorizeExitMutation = useMutation({
    mutationFn: async (transportId: string) => {
      return apiRequest("POST", `/api/portaria/authorize-exit/${transportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Saída autorizada! Veículo despachado para entrega." });
    },
    onError: () => {
      toast({ title: "Erro ao autorizar saída", variant: "destructive" });
    },
  });

  const getManufacturer = (id: string) => manufacturers?.find((m) => m.id === id);
  const getYard = (id: string) => yards?.find((y) => y.id === id);
  const getDriver = (id: string) => drivers?.find((d) => d.id === id);
  const getVehicle = (chassi: string) => vehicles?.find((v) => v.chassi === chassi);

  const pendingCollects = collects?.filter((c) => {
    if (c.status !== "em_transito") return false;
    
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase().trim();
    const chassiMatch = c.vehicleChassi?.toLowerCase().includes(search);
    const driver = c.driverId ? getDriver(c.driverId) : null;
    const driverMatch = driver?.name?.toLowerCase().includes(search);
    
    return chassiMatch || driverMatch;
  }) || [];

  const pendingTransports = transports?.filter((t) => {
    if (t.status !== "pendente") return false;
    
    if (!transportSearchTerm.trim()) return true;
    
    const search = transportSearchTerm.toLowerCase().trim();
    const chassiMatch = t.vehicleChassi?.toLowerCase().includes(search);
    const driver = t.driverId ? getDriver(t.driverId) : null;
    const driverMatch = driver?.name?.toLowerCase().includes(search);
    const requestNumberMatch = t.requestNumber?.toLowerCase().includes(search);
    
    return chassiMatch || driverMatch || requestNumberMatch;
  }) || [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Portaria"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Portaria" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Controle de Entrada</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Autorize a entrada de veículos no pátio
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Coletas Aguardando Autorização
              {pendingCollects.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCollects.length}
                </Badge>
              )}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por chassi ou motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-portaria"
              />
            </div>
          </div>
        </div>

        {collectsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingCollects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma coleta aguardando autorização
              </p>
              <p className="text-sm text-muted-foreground">
                Todas as coletas em trânsito já foram autorizadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingCollects.map((collect) => {
              const manufacturer = getManufacturer(collect.manufacturerId);
              const yard = getYard(collect.yardId);
              const driver = collect.driverId ? getDriver(collect.driverId) : null;
              const vehicle = getVehicle(collect.vehicleChassi);
              const isAuthorizing = authorizeMutation.isPending;

              return (
                <Card key={collect.id} className="overflow-hidden" data-testid={`card-collect-${collect.id}`}>
                  <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-600" />
                        <span className="font-mono text-sm font-semibold">{collect.vehicleChassi}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Em Trânsito
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-3">
                      {collect.checkinSelfiePhoto && (
                        <Avatar 
                          className="h-12 w-12 shrink-0 border border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={() => setLightboxPhoto(collect.checkinSelfiePhoto || null)}
                          data-testid={`avatar-photo-${collect.id}`}
                        >
                          <AvatarImage 
                            src={collect.checkinSelfiePhoto} 
                            alt="Foto check-in motorista" 
                            className="object-cover"
                          />
                          <AvatarFallback>
                            <User className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="space-y-1.5 text-sm flex-1">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Origem:</span>
                          <span className="font-medium">{manufacturer?.name || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Destino:</span>
                          <span className="font-medium">{yard?.name || "-"}</span>
                        </div>
                        {driver && (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Motorista:</span>
                            <span className="font-medium">{driver.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Data:</span>
                          <span className="font-medium">
                            {collect.collectDate
                              ? (() => {
                                  const dateStr = String(collect.collectDate);
                                  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                                  if (match) {
                                    const [, year, month, day, hour, minute] = match;
                                    return `${day}/${month}/${year} ${hour}:${minute}`;
                                  }
                                  return "-";
                                })()
                              : "-"}
                          </span>
                        </div>
                        {vehicle && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {vehicle.status === "pre_estoque" ? "Pré-Estoque" : vehicle.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => authorizeMutation.mutate(collect.id)}
                      disabled={isAuthorizing}
                      data-testid={`button-authorize-${collect.id}`}
                    >
                      {isAuthorizing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Autorizar Entrada
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Transport Exit Section */}
        <Card className="mt-8 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                <LogOut className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Controle de Saída</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Autorize a saída de veículos para entrega
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Transportes Aguardando Saída
              {pendingTransports.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingTransports.length}
                </Badge>
              )}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OTD, chassi ou motorista..."
                value={transportSearchTerm}
                onChange={(e) => setTransportSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-transport-exit"
              />
            </div>
          </div>
        </div>

        {transportsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingTransports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum transporte aguardando saída
              </p>
              <p className="text-sm text-muted-foreground">
                Todos os transportes pendentes já foram liberados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTransports.map((transport) => {
              const originYard = getYard(transport.originYardId);
              const vehicle = getVehicle(transport.vehicleChassi);
              const isAuthorizing = authorizeExitMutation.isPending;
              // Use relations from API response
              const client = (transport as any).client;
              const deliveryLocation = (transport as any).deliveryLocation;
              const driver = (transport as any).driver;

              return (
                <Card key={transport.id} className="overflow-hidden" data-testid={`card-transport-${transport.id}`}>
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="font-mono text-sm font-semibold">{transport.requestNumber}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Pendente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Chassi:</span>
                        <span className="font-mono font-medium">{transport.vehicleChassi}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Origem:</span>
                        <span className="font-medium">{originYard?.name || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{client?.name || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Destino:</span>
                        <span className="font-medium">
                          {deliveryLocation ? `${deliveryLocation.city}/${deliveryLocation.state}` : "-"}
                        </span>
                      </div>
                      {driver && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Motorista:</span>
                          <span className="font-medium">{driver.name}</span>
                        </div>
                      )}
                      {transport.deliveryDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Previsão:</span>
                          <span className="font-medium">
                            {(() => {
                              const dateStr = String(transport.deliveryDate);
                              const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                              if (match) {
                                const [, year, month, day] = match;
                                return `${day}/${month}/${year}`;
                              }
                              return "-";
                            })()}
                          </span>
                        </div>
                      )}
                      {vehicle && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {vehicle.status === "em_estoque" ? "Em Estoque" : vehicle.status}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => authorizeExitMutation.mutate(transport.id)}
                      disabled={isAuthorizing}
                      data-testid={`button-authorize-exit-${transport.id}`}
                    >
                      {isAuthorizing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      Autorizar Saída
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-none">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Foto check-in motorista"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
