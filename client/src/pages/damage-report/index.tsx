import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Image,
  ChevronLeft,
  ChevronRight,
  Eye,
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

function getCheckinPhotos(record: CollectWithRelations | TransportWithRelations): string[] {
  if (record.checkinDamagePhotos && Array.isArray(record.checkinDamagePhotos)) {
    return record.checkinDamagePhotos.filter((p) => p && p.trim() !== "");
  }
  return [];
}

function getCheckoutPhotos(record: CollectWithRelations | TransportWithRelations): string[] {
  if (record.checkoutDamagePhotos && Array.isArray(record.checkoutDamagePhotos)) {
    return record.checkoutDamagePhotos.filter((p) => p && p.trim() !== "");
  }
  return [];
}

export default function DamageReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "collects" | "transports">("all");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  const showCollects = activeTab === "all" || activeTab === "collects";
  const showTransports = activeTab === "all" || activeTab === "transports";
  const hasResults = (showCollects && filteredCollects.length > 0) || (showTransports && filteredTransports.length > 0);

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
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !hasResults ? (
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
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Identificação</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Chassi</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Motorista</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Origem / Destino</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Check-in</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Check-out</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Fotos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showCollects && filteredCollects.map((collect) => {
                      const allPhotos = getDamagePhotos(collect);
                      const checkinPhotos = getCheckinPhotos(collect);
                      const checkoutPhotos = getCheckoutPhotos(collect);
                      const isExpanded = expandedRow === `collect-${collect.id}`;

                      return (
                        <CollectRow
                          key={collect.id}
                          collect={collect}
                          allPhotos={allPhotos}
                          checkinPhotos={checkinPhotos}
                          checkoutPhotos={checkoutPhotos}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedRow(isExpanded ? null : `collect-${collect.id}`)}
                          onPhotoClick={(photos, index) => openLightbox(photos, index)}
                          formatDate={formatDate}
                        />
                      );
                    })}
                    {showTransports && filteredTransports.map((transport) => {
                      const allPhotos = getDamagePhotos(transport);
                      const checkinPhotos = getCheckinPhotos(transport);
                      const checkoutPhotos = getCheckoutPhotos(transport);
                      const isExpanded = expandedRow === `transport-${transport.id}`;

                      return (
                        <TransportRow
                          key={transport.id}
                          transport={transport}
                          allPhotos={allPhotos}
                          checkinPhotos={checkinPhotos}
                          checkoutPhotos={checkoutPhotos}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedRow(isExpanded ? null : `transport-${transport.id}`)}
                          onPhotoClick={(photos, index) => openLightbox(photos, index)}
                          formatDate={formatDate}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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

function CollectRow({
  collect,
  allPhotos,
  checkinPhotos,
  checkoutPhotos,
  isExpanded,
  onToggle,
  onPhotoClick,
  formatDate,
}: {
  collect: CollectWithRelations;
  allPhotos: string[];
  checkinPhotos: string[];
  checkoutPhotos: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick: (photos: string[], index: number) => void;
  formatDate: (d: string | Date | null | undefined) => string;
}) {
  return (
    <>
      <tr
        className="border-b last:border-b-0 hover-elevate cursor-pointer"
        onClick={onToggle}
        data-testid={`row-damage-collect-${collect.id}`}
      >
        <td className="p-3">
          <Badge variant="secondary" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            Coleta
          </Badge>
        </td>
        <td className="p-3">
          <span className="font-mono text-xs font-semibold">{collect.vehicleChassi}</span>
        </td>
        <td className="p-3 hidden md:table-cell">
          <span className="font-mono text-xs">{collect.vehicleChassi}</span>
        </td>
        <td className="p-3 hidden lg:table-cell">
          <span className="text-sm">{collect.driver?.name || "-"}</span>
        </td>
        <td className="p-3 hidden lg:table-cell">
          <div className="text-xs">
            <span className="text-muted-foreground">{collect.manufacturer?.name || "-"}</span>
            <span className="mx-1 text-muted-foreground">&rarr;</span>
            <span>{collect.yard?.name || "-"}</span>
          </div>
        </td>
        <td className="p-3 hidden sm:table-cell">
          <span className="text-xs">{formatDate(collect.collectDate)}</span>
        </td>
        <td className="p-3 text-center">
          {checkinPhotos.length > 0 ? (
            <Badge variant="destructive" className="text-xs">{checkinPhotos.length}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          {checkoutPhotos.length > 0 ? (
            <Badge variant="destructive" className="text-xs">{checkoutPhotos.length}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {allPhotos.length}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onToggle(); }} data-testid={`button-expand-collect-${collect.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b last:border-b-0">
          <td colSpan={10} className="p-4 bg-muted/30">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground md:hidden">
                <span>Motorista: <strong className="text-foreground">{collect.driver?.name || "-"}</strong></span>
                <span>Origem: <strong className="text-foreground">{collect.manufacturer?.name || "-"}</strong></span>
                <span>Destino: <strong className="text-foreground">{collect.yard?.name || "-"}</strong></span>
                <span>Data: <strong className="text-foreground">{formatDate(collect.collectDate)}</strong></span>
              </div>
              {checkinPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avarias no Check-in ({checkinPhotos.length})
                  </p>
                  <PhotoThumbnails photos={checkinPhotos} allPhotos={allPhotos} onPhotoClick={onPhotoClick} />
                </div>
              )}
              {checkoutPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avarias no Check-out ({checkoutPhotos.length})
                  </p>
                  <PhotoThumbnails photos={checkoutPhotos} allPhotos={allPhotos} onPhotoClick={onPhotoClick} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TransportRow({
  transport,
  allPhotos,
  checkinPhotos,
  checkoutPhotos,
  isExpanded,
  onToggle,
  onPhotoClick,
  formatDate,
}: {
  transport: TransportWithRelations;
  allPhotos: string[];
  checkinPhotos: string[];
  checkoutPhotos: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick: (photos: string[], index: number) => void;
  formatDate: (d: string | Date | null | undefined) => string;
}) {
  const driver = (transport as any).driver;
  const client = (transport as any).client;
  const deliveryLocation = (transport as any).deliveryLocation;
  const originYard = (transport as any).originYard;

  return (
    <>
      <tr
        className="border-b last:border-b-0 hover-elevate cursor-pointer"
        onClick={onToggle}
        data-testid={`row-damage-transport-${transport.id}`}
      >
        <td className="p-3">
          <Badge variant="secondary" className="text-xs">
            <Truck className="h-3 w-3 mr-1" />
            Transporte
          </Badge>
        </td>
        <td className="p-3">
          <span className="font-mono text-xs font-semibold">{transport.requestNumber}</span>
        </td>
        <td className="p-3 hidden md:table-cell">
          <span className="font-mono text-xs">{transport.vehicleChassi}</span>
        </td>
        <td className="p-3 hidden lg:table-cell">
          <span className="text-sm">{driver?.name || "-"}</span>
        </td>
        <td className="p-3 hidden lg:table-cell">
          <div className="text-xs">
            <span className="text-muted-foreground">{originYard?.name || "-"}</span>
            <span className="mx-1 text-muted-foreground">&rarr;</span>
            <span>{deliveryLocation ? `${deliveryLocation.city}/${deliveryLocation.state}` : client?.name || "-"}</span>
          </div>
        </td>
        <td className="p-3 hidden sm:table-cell">
          <span className="text-xs">{formatDate(transport.checkinDateTime || transport.createdAt)}</span>
        </td>
        <td className="p-3 text-center">
          {checkinPhotos.length > 0 ? (
            <Badge variant="destructive" className="text-xs">{checkinPhotos.length}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          {checkoutPhotos.length > 0 ? (
            <Badge variant="destructive" className="text-xs">{checkoutPhotos.length}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {allPhotos.length}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onToggle(); }} data-testid={`button-expand-transport-${transport.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b last:border-b-0">
          <td colSpan={10} className="p-4 bg-muted/30">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground md:hidden">
                <span>Motorista: <strong className="text-foreground">{driver?.name || "-"}</strong></span>
                <span>Cliente: <strong className="text-foreground">{client?.name || "-"}</strong></span>
                <span>Destino: <strong className="text-foreground">{deliveryLocation ? `${deliveryLocation.city}/${deliveryLocation.state}` : "-"}</strong></span>
                <span>Data: <strong className="text-foreground">{formatDate(transport.checkinDateTime || transport.createdAt)}</strong></span>
              </div>
              {checkinPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avarias no Check-in ({checkinPhotos.length})
                  </p>
                  <PhotoThumbnails photos={checkinPhotos} allPhotos={allPhotos} onPhotoClick={onPhotoClick} />
                </div>
              )}
              {checkoutPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avarias no Check-out ({checkoutPhotos.length})
                  </p>
                  <PhotoThumbnails photos={checkoutPhotos} allPhotos={allPhotos} onPhotoClick={onPhotoClick} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PhotoThumbnails({
  photos,
  allPhotos,
  onPhotoClick,
}: {
  photos: string[];
  allPhotos: string[];
  onPhotoClick: (photos: string[], index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((photo, index) => {
        const globalIndex = allPhotos.indexOf(photo);
        return (
          <button
            key={index}
            type="button"
            className="relative h-16 w-16 rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all group"
            onClick={(e) => {
              e.stopPropagation();
              onPhotoClick(allPhotos, globalIndex >= 0 ? globalIndex : 0);
            }}
            data-testid={`button-damage-photo-${index}`}
          >
            <img
              src={normalizeImageUrl(photo)}
              alt={`Avaria ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Image className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
