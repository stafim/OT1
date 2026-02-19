import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Search,
  Truck,
  Package,
  Camera,
  Clock,
  Building,
  MapPin,
  User,
  Image,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Collect, Transport, Manufacturer, Yard, Driver, Client, DeliveryLocation } from "@shared/schema";

interface CollectWithRelations extends Collect {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver;
}

interface TransportWithRelations extends Transport {
  client?: Client;
  originYard?: Yard;
  deliveryLocation?: DeliveryLocation;
  driver?: Driver;
}

function getDamagePhotos(record: CollectWithRelations | TransportWithRelations): string[] {
  const photos: string[] = [];
  if (record.checkinDamagePhotos && Array.isArray(record.checkinDamagePhotos)) {
    photos.push(...record.checkinDamagePhotos.filter((p) => p && p.trim() !== ""));
  }
  if (record.checkoutDamagePhotos && Array.isArray(record.checkoutDamagePhotos)) {
    photos.push(...record.checkoutDamagePhotos.filter((p) => p && p.trim() !== ""));
  }
  return photos;
}

function DamagePhotoGallery({ photos, onPhotoClick }: { photos: string[]; onPhotoClick: (url: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((photo, index) => (
        <button
          key={index}
          type="button"
          className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all group"
          onClick={() => onPhotoClick(photo)}
          data-testid={`button-damage-photo-${index}`}
        >
          <img
            src={normalizeImageUrl(photo)}
            alt={`Avaria ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Image className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))}
    </div>
  );
}

export default function DamageReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "collects" | "transports">("all");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: collects, isLoading: collectsLoading } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects"],
  });

  const { data: transports, isLoading: transportsLoading } = useQuery<TransportWithRelations[]>({
    queryKey: ["/api/transports"],
  });

  const isLoading = collectsLoading || transportsLoading;

  const collectsWithDamage = (collects || []).filter((c) => getDamagePhotos(c).length > 0);
  const transportsWithDamage = (transports || []).filter((t) => getDamagePhotos(t).length > 0);

  const filteredCollects = collectsWithDamage.filter((c) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase().trim();
    return (
      c.vehicleChassi?.toLowerCase().includes(search) ||
      c.driver?.name?.toLowerCase().includes(search) ||
      c.manufacturer?.name?.toLowerCase().includes(search) ||
      c.yard?.name?.toLowerCase().includes(search)
    );
  });

  const filteredTransports = transportsWithDamage.filter((t) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase().trim();
    return (
      t.vehicleChassi?.toLowerCase().includes(search) ||
      (t as any).driver?.name?.toLowerCase().includes(search) ||
      t.requestNumber?.toLowerCase().includes(search) ||
      (t as any).client?.name?.toLowerCase().includes(search)
    );
  });

  const totalDamageRecords = collectsWithDamage.length + transportsWithDamage.length;
  const totalDamagePhotos = [
    ...collectsWithDamage.map((c) => getDamagePhotos(c).length),
    ...transportsWithDamage.map((t) => getDamagePhotos(t).length),
  ].reduce((a, b) => a + b, 0);

  const openLightbox = (photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxPhoto(photos[index]);
  };

  const openLightboxSingle = (photo: string, allPhotos: string[]) => {
    const idx = allPhotos.indexOf(photo);
    openLightbox(allPhotos, idx >= 0 ? idx : 0);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length
      : (lightboxIndex + 1) % lightboxPhotos.length;
    setLightboxIndex(newIndex);
    setLightboxPhoto(lightboxPhotos[newIndex]);
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Relatório de Avarias"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Relatório de Avarias" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-records">{totalDamageRecords}</p>
                <p className="text-sm text-muted-foreground">Registros com Avaria</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                <Camera className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-photos">{totalDamagePhotos}</p>
                <p className="text-sm text-muted-foreground">Fotos de Avaria</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" data-testid="text-collects-count">{collectsWithDamage.length}</span>
                  <span className="text-xs text-muted-foreground">coletas</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-lg font-bold" data-testid="text-transports-count">{transportsWithDamage.length}</span>
                  <span className="text-xs text-muted-foreground">transportes</span>
                </div>
                <p className="text-sm text-muted-foreground">Distribuição</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "collects" | "transports")}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                Todos
                {totalDamageRecords > 0 && (
                  <Badge variant="secondary" className="ml-1.5">{totalDamageRecords}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="collects" data-testid="tab-collects">
                <Package className="h-4 w-4 mr-1.5" />
                Coletas
                {collectsWithDamage.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">{collectsWithDamage.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transports" data-testid="tab-transports">
                <Truck className="h-4 w-4 mr-1.5" />
                Transportes
                {transportsWithDamage.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">{transportsWithDamage.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chassi, motorista, OTD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-damage"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-4" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="aspect-square rounded-md" />
                    <Skeleton className="aspect-square rounded-md" />
                    <Skeleton className="aspect-square rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {(activeTab === "all" || activeTab === "collects") && filteredCollects.length > 0 && (
              <div className="space-y-3">
                {activeTab === "all" && filteredCollects.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Coletas com Avaria
                  </h3>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredCollects.map((collect) => {
                    const photos = getDamagePhotos(collect);
                    const checkinPhotos = (collect.checkinDamagePhotos || []).filter((p) => p && p.trim() !== "");
                    const checkoutPhotos = (collect.checkoutDamagePhotos || []).filter((p) => p && p.trim() !== "");

                    return (
                      <Card key={collect.id} data-testid={`card-damage-collect-${collect.id}`}>
                        <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/5 to-transparent border-b">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-orange-500" />
                              <span className="font-mono text-sm font-semibold">{collect.vehicleChassi}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">Coleta</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="space-y-1.5 text-sm">
                            {collect.manufacturer && (
                              <div className="flex items-center gap-2">
                                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Origem:</span>
                                <span className="font-medium">{collect.manufacturer.name}</span>
                              </div>
                            )}
                            {collect.yard && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Destino:</span>
                                <span className="font-medium">{collect.yard.name}</span>
                              </div>
                            )}
                            {collect.driver && (
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Motorista:</span>
                                <span className="font-medium">{collect.driver.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Data:</span>
                              <span className="font-medium">{formatDate(collect.collectDate)}</span>
                            </div>
                          </div>

                          {checkinPhotos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Avarias no Check-in ({checkinPhotos.length})
                              </p>
                              <DamagePhotoGallery
                                photos={checkinPhotos}
                                onPhotoClick={(photo) => openLightboxSingle(photo, photos)}
                              />
                            </div>
                          )}

                          {checkoutPhotos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Avarias no Check-out ({checkoutPhotos.length})
                              </p>
                              <DamagePhotoGallery
                                photos={checkoutPhotos}
                                onPhotoClick={(photo) => openLightboxSingle(photo, photos)}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "transports") && filteredTransports.length > 0 && (
              <div className="space-y-3">
                {activeTab === "all" && filteredTransports.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-4">
                    <Truck className="h-4 w-4" />
                    Transportes com Avaria
                  </h3>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredTransports.map((transport) => {
                    const photos = getDamagePhotos(transport);
                    const checkinPhotos = (transport.checkinDamagePhotos || []).filter((p) => p && p.trim() !== "");
                    const checkoutPhotos = (transport.checkoutDamagePhotos || []).filter((p) => p && p.trim() !== "");
                    const driver = (transport as any).driver;
                    const client = (transport as any).client;
                    const deliveryLocation = (transport as any).deliveryLocation;
                    const originYard = (transport as any).originYard;

                    return (
                      <Card key={transport.id} data-testid={`card-damage-transport-${transport.id}`}>
                        <CardHeader className="pb-2 bg-gradient-to-r from-red-500/5 to-transparent border-b">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-red-500" />
                              <span className="font-mono text-sm font-semibold">{transport.requestNumber}</span>
                              <span className="text-xs text-muted-foreground font-mono">{transport.vehicleChassi}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">Transporte</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="space-y-1.5 text-sm">
                            {originYard && (
                              <div className="flex items-center gap-2">
                                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Origem:</span>
                                <span className="font-medium">{originYard.name}</span>
                              </div>
                            )}
                            {client && (
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Cliente:</span>
                                <span className="font-medium">{client.name}</span>
                              </div>
                            )}
                            {deliveryLocation && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Destino:</span>
                                <span className="font-medium">{deliveryLocation.city}/{deliveryLocation.state}</span>
                              </div>
                            )}
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
                              <span className="font-medium">{formatDate(transport.checkinDateTime || transport.createdAt)}</span>
                            </div>
                          </div>

                          {checkinPhotos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Avarias no Check-in ({checkinPhotos.length})
                              </p>
                              <DamagePhotoGallery
                                photos={checkinPhotos}
                                onPhotoClick={(photo) => openLightboxSingle(photo, photos)}
                              />
                            </div>
                          )}

                          {checkoutPhotos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Avarias no Check-out ({checkoutPhotos.length})
                              </p>
                              <DamagePhotoGallery
                                photos={checkoutPhotos}
                                onPhotoClick={(photo) => openLightboxSingle(photo, photos)}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {((activeTab === "all" && filteredCollects.length === 0 && filteredTransports.length === 0) ||
              (activeTab === "collects" && filteredCollects.length === 0) ||
              (activeTab === "transports" && filteredTransports.length === 0)) && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhuma avaria registrada
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm.trim()
                      ? "Nenhum resultado encontrado para a busca"
                      : "Nenhuma coleta ou transporte possui fotos de avaria"}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={normalizeImageUrl(lightboxPhoto)}
                alt="Foto de avaria"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              {lightboxPhotos.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={(e) => { e.stopPropagation(); navigateLightbox("prev"); }}
                    data-testid="button-lightbox-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={(e) => { e.stopPropagation(); navigateLightbox("next"); }}
                    data-testid="button-lightbox-next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                    {lightboxIndex + 1} / {lightboxPhotos.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
