import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl, cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, CheckCircle, Clock, Building, MapPin, User, DoorOpen, Loader2, Search, LogOut, Package, Eye, Shield, History, AlertCircle, Plus, ChevronsUpDown, Check as CheckIcon, LayoutGrid, List, ArrowLeftRight, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Collect, Manufacturer, Yard, Driver, Vehicle, Transport, Client, DeliveryLocation } from "@shared/schema";

interface TransferWithRelations {
  id: string;
  vehicleChassi: string;
  originYardId: string;
  destinationYardId: string;
  status: "pendente" | "autorizada" | "em_transito" | "concluida" | "cancelada";
  notes: string | null;
  createdAt: string;
  vehicle?: Vehicle;
  originYard?: Yard;
  destinationYard?: Yard;
}

const newCollectFormSchema = z.object({
  vehicleChassi: z.string().min(17, "Chassi deve ter no mínimo 17 caracteres"),
  manufacturerId: z.string().min(1, "Montadora é obrigatória"),
  yardId: z.string().min(1, "Pátio de destino é obrigatório"),
  driverId: z.string().optional(),
  collectDate: z.string().optional(),
  notes: z.string().optional(),
});

type NewCollectFormData = z.infer<typeof newCollectFormSchema>;

interface CollectWithRelations extends Collect {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver;
  vehicle?: Vehicle;
  checkoutApprovedBy?: {
    firstName: string | null;
    lastName: string | null;
    username: string;
  };
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
  const [selectedCollectId, setSelectedCollectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [confirmExitWithoutCheckin, setConfirmExitWithoutCheckin] = useState<string | null>(null);
  const [exitAuthorizationReason, setExitAuthorizationReason] = useState("");
  const [showNewCollectDialog, setShowNewCollectDialog] = useState(false);
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedYardId, setSelectedYardId] = useState<string>("all");
  const [openManufacturer, setOpenManufacturer] = useState(false);
  const [openYard, setOpenYard] = useState(false);
  const [openDriver, setOpenDriver] = useState(false);

  const { data: collects, isLoading: collectsLoading } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects"],
  });

  const { data: selectedCollect, isLoading: selectedCollectLoading } = useQuery<CollectWithRelations>({
    queryKey: ["/api/collects", selectedCollectId],
    enabled: !!selectedCollectId,
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

  const { data: transfers = [], isLoading: transfersLoading } = useQuery<TransferWithRelations[]>({
    queryKey: ["/api/transfers"],
  });

  const pendingTransfersList = transfers.filter((t) => {
    if (t.status !== "pendente") return false;
    if (selectedYardId !== "all" && t.originYardId !== selectedYardId) return false;
    return true;
  });

  const authorizeTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return apiRequest("POST", `/api/portaria/authorize-transfer/${transferId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Transferência autorizada! Veículo em trânsito para o pátio de destino." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao autorizar transferência", description: err?.message, variant: "destructive" });
    },
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

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const newCollectForm = useForm<NewCollectFormData>({
    resolver: zodResolver(newCollectFormSchema),
    defaultValues: {
      vehicleChassi: "",
      manufacturerId: "",
      yardId: "",
      driverId: "",
      collectDate: formatDateTimeLocal(new Date()),
      notes: "",
    },
  });

  const createCollectMutation = useMutation({
    mutationFn: async (data: NewCollectFormData) => {
      return apiRequest("POST", "/api/collects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Coleta registrada com sucesso!" });
      setShowNewCollectDialog(false);
      newCollectForm.reset({
        vehicleChassi: "",
        manufacturerId: "",
        yardId: "",
        driverId: "",
        collectDate: formatDateTimeLocal(new Date()),
        notes: "",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao registrar coleta";
      toast({ title: message, variant: "destructive" });
    },
  });

  const activeDrivers = drivers?.filter((d) => d.isActive === "true" && d.isApto === "true");
  const activeManufacturers = manufacturers?.filter((m) => m.isActive === "true");
  const activeYards = yards?.filter((y) => y.isActive === "true");

  const getManufacturer = (id: string) => manufacturers?.find((m) => m.id === id);
  const getYard = (id: string) => yards?.find((y) => y.id === id);
  const getDriver = (id: string) => drivers?.find((d) => d.id === id);
  const getVehicle = (chassi: string) => vehicles?.find((v) => v.chassi === chassi);

  const pendingCollects = collects?.filter((c) => {
    if (c.status !== "em_transito") return false;
    if (selectedYardId !== "all" && c.yardId !== selectedYardId) return false;
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase().trim();
    const chassiMatch = c.vehicleChassi?.toLowerCase().includes(search);
    const driver = c.driverId ? getDriver(c.driverId) : null;
    const driverMatch = driver?.name?.toLowerCase().includes(search);
    return chassiMatch || driverMatch;
  }) || [];

  const finalizedCollects = collects?.filter((c) => {
    if (c.status !== "finalizada") return false;
    if (selectedYardId !== "all" && c.yardId !== selectedYardId) return false;
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase().trim();
    const chassiMatch = c.vehicleChassi?.toLowerCase().includes(search);
    const driver = c.driverId ? getDriver(c.driverId) : null;
    const driverMatch = driver?.name?.toLowerCase().includes(search);
    return chassiMatch || driverMatch;
  }).sort((a, b) => {
    const dateA = a.checkoutDateTime ? new Date(a.checkoutDateTime).getTime() : 0;
    const dateB = b.checkoutDateTime ? new Date(b.checkoutDateTime).getTime() : 0;
    return dateB - dateA;
  }).slice(0, 20) || [];

  const getApproverName = (collect: CollectWithRelations) => {
    if (!collect.checkoutApprovedBy) return null;
    const { firstName, lastName, username } = collect.checkoutApprovedBy;
    return `${firstName || ''} ${lastName || ''}`.trim() || username;
  };

  const pendingTransports = transports?.filter((t) => {
    if (t.status !== "aguardando_saida" && t.status !== "pendente") return false;
    if (selectedYardId !== "all" && t.originYardId !== selectedYardId) return false;
    if (!transportSearchTerm.trim()) return true;
    const search = transportSearchTerm.toLowerCase().trim();
    const chassiMatch = t.vehicleChassi?.toLowerCase().includes(search);
    const driver = t.driverId ? getDriver(t.driverId) : null;
    const driverMatch = driver?.name?.toLowerCase().includes(search);
    const requestNumberMatch = t.requestNumber?.toLowerCase().includes(search);
    return chassiMatch || driverMatch || requestNumberMatch;
  }) || [];

  const selectedTransport = selectedTransportId
    ? (transports?.find((t) => t.id === selectedTransportId) as TransportWithRelations | undefined) || null
    : null;

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
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedYardId} onValueChange={setSelectedYardId}>
              <SelectTrigger className="w-64" data-testid="select-yard-filter">
                <SelectValue placeholder="Filtrar por pátio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pátios</SelectItem>
                {(yards ?? []).map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3 gap-1.5"
              onClick={() => setViewMode("cards")}
              data-testid="button-view-cards"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3 gap-1.5"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Controle de Entrada</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Autorize a entrada de veículos no pátio
                </p>
              </div>
              <Button
                onClick={() => {
                  newCollectForm.reset({
                    vehicleChassi: "",
                    manufacturerId: "",
                    yardId: "",
                    driverId: "",
                    collectDate: formatDateTimeLocal(new Date()),
                    notes: "",
                  });
                  setShowNewCollectDialog(true);
                }}
                data-testid="button-new-collect-portaria"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Coleta
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "history")} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="tab-pending">
              <Clock className="h-4 w-4" />
              Aguardando
              {pendingCollects.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingCollects.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="mb-4">
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
            ) : viewMode === "cards" ? (
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
                                src={normalizeImageUrl(collect.checkinSelfiePhoto)} 
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
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] gap-0 bg-muted/50 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Chassi</span>
                  <span>Origem</span>
                  <span>Destino</span>
                  <span>Motorista</span>
                  <span>Data</span>
                  <span></span>
                  <span></span>
                </div>
                {pendingCollects.map((collect, idx) => {
                  const manufacturer = getManufacturer(collect.manufacturerId);
                  const yard = getYard(collect.yardId);
                  const driver = collect.driverId ? getDriver(collect.driverId) : null;
                  const isAuthorizing = authorizeMutation.isPending;
                  const dateStr = collect.collectDate ? (() => {
                    const s = String(collect.collectDate);
                    const m = s.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "-";
                  })() : "-";

                  return (
                    <div
                      key={collect.id}
                      className={cn(
                        "grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] gap-0 items-center px-4 py-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        "border-b last:border-b-0"
                      )}
                      onClick={() => setSelectedCollectId(collect.id)}
                      data-testid={`row-collect-${collect.id}`}
                    >
                      <span className="font-mono font-medium text-xs">{collect.vehicleChassi}</span>
                      <span className="text-muted-foreground truncate pr-2">{manufacturer?.name || "-"}</span>
                      <span className="text-muted-foreground truncate pr-2">{yard?.name || "-"}</span>
                      <span className="truncate pr-2">{driver?.name || <span className="text-muted-foreground">-</span>}</span>
                      <span className="text-muted-foreground text-xs">{dateStr}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedCollectId(collect.id); }}
                        className="text-muted-foreground"
                        data-testid={`button-detail-list-${collect.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); authorizeMutation.mutate(collect.id); }}
                        disabled={isAuthorizing}
                        className="whitespace-nowrap"
                        data-testid={`button-authorize-list-${collect.id}`}
                      >
                        {isAuthorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        Autorizar
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="mb-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por chassi ou motorista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-history"
                />
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
            ) : finalizedCollects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhuma coleta finalizada
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {finalizedCollects.map((collect) => {
                  const manufacturer = getManufacturer(collect.manufacturerId);
                  const yard = getYard(collect.yardId);
                  const driver = collect.driverId ? getDriver(collect.driverId) : null;
                  const approverName = getApproverName(collect);

                  return (
                    <Card 
                      key={collect.id} 
                      className="overflow-hidden cursor-pointer hover-elevate" 
                      onClick={() => setSelectedCollectId(collect.id)}
                      data-testid={`card-history-${collect.id}`}
                    >
                      <CardHeader className="pb-2 bg-gradient-to-r from-green-500/10 to-green-500/5 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span className="font-mono text-sm font-semibold">{collect.vehicleChassi}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                            Finalizada
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <div className="space-y-1.5 text-sm">
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
                          {collect.checkoutDateTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Entrada:</span>
                              <span className="font-medium">
                                {format(new Date(collect.checkoutDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          )}
                          {approverName && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              <Shield className="h-3.5 w-3.5 text-primary" />
                              <span className="text-muted-foreground">Autorizado por:</span>
                              <span className="font-medium text-primary">{approverName}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" data-testid={`button-view-${collect.id}`}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Ver Detalhes
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-0 bg-muted/50 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Chassi</span>
                  <span>Origem</span>
                  <span>Destino</span>
                  <span>Motorista</span>
                  <span>Entrada</span>
                  <span></span>
                </div>
                {finalizedCollects.map((collect, idx) => {
                  const manufacturer = getManufacturer(collect.manufacturerId);
                  const yard = getYard(collect.yardId);
                  const driver = collect.driverId ? getDriver(collect.driverId) : null;
                  const approverName = getApproverName(collect);

                  return (
                    <div
                      key={collect.id}
                      className={cn(
                        "grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        "border-b last:border-b-0"
                      )}
                      onClick={() => setSelectedCollectId(collect.id)}
                      data-testid={`row-history-${collect.id}`}
                    >
                      <span className="font-mono font-medium text-xs">{collect.vehicleChassi}</span>
                      <span className="text-muted-foreground truncate pr-2">{manufacturer?.name || "-"}</span>
                      <span className="text-muted-foreground truncate pr-2">{yard?.name || "-"}</span>
                      <span className="truncate pr-2">{driver?.name || <span className="text-muted-foreground">-</span>}</span>
                      <div className="text-xs text-muted-foreground">
                        <div>{collect.checkoutDateTime ? format(new Date(collect.checkoutDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</div>
                        {approverName && <div className="text-primary text-xs">{approverName}</div>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCollectId(collect.id); }} data-testid={`button-view-list-${collect.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTransports.map((transport) => {
              const originYard = getYard(transport.originYardId);
              const vehicle = getVehicle(transport.vehicleChassi);
              const isAuthorizing = authorizeExitMutation.isPending;
              // Use relations from API response
              const client = (transport as any).client;
              const deliveryLocation = (transport as any).deliveryLocation;
              const driver = (transport as any).driver;

              const isPendingCheckin = transport.status === "pendente";

              return (
                <Card key={transport.id} className={`overflow-hidden ${isPendingCheckin ? "border-orange-400/50" : ""}`} data-testid={`card-transport-${transport.id}`}>
                  <CardHeader className={`pb-2 border-b ${isPendingCheckin ? "bg-gradient-to-r from-orange-500/10 to-orange-500/5" : "bg-gradient-to-r from-blue-500/10 to-blue-500/5"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className={`h-4 w-4 ${isPendingCheckin ? "text-orange-600" : "text-blue-600"}`} />
                        <span className="font-mono text-sm font-semibold">{transport.requestNumber}</span>
                      </div>
                      {isPendingCheckin ? (
                        <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Falta Check-in
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-700">
                          Aguardando Saída
                        </Badge>
                      )}
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

                    {transport.checkinSelfiePhoto && (
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <button
                          type="button"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxPhoto(transport.checkinSelfiePhoto || null)}
                        >
                          <img
                            src={transport.checkinSelfiePhoto}
                            alt="Selfie do motorista"
                            className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                          />
                        </button>
                        <div className="text-sm">
                          <p className="font-medium">{driver?.name || "Motorista"}</p>
                          <p className="text-muted-foreground text-xs">
                            Check-in: {transport.checkinDateTime ? new Date(transport.checkinDateTime).toLocaleString('pt-BR') : "-"}
                          </p>
                        </div>
                      </div>
                    )}

                    {isPendingCheckin ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md text-center">
                          <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center justify-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Aguardando motorista fazer check-in
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-orange-400 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          onClick={() => setConfirmExitWithoutCheckin(transport.id)}
                          disabled={isAuthorizing}
                          data-testid={`button-authorize-exit-no-checkin-${transport.id}`}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Autorizar Saída Mesmo Assim
                        </Button>
                      </div>
                    ) : (
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
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto_auto] gap-0 bg-muted/50 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="pr-4">OTD</span>
              <span>Chassi</span>
              <span>Origem</span>
              <span>Cliente</span>
              <span>Destino</span>
              <span>Motorista</span>
              <span>Status</span>
              <span></span>
              <span></span>
            </div>
            {pendingTransports.map((transport, idx) => {
              const originYard = getYard(transport.originYardId);
              const isAuthorizing = authorizeExitMutation.isPending;
              const client = (transport as any).client;
              const deliveryLocation = (transport as any).deliveryLocation;
              const driver = (transport as any).driver;
              const isPendingCheckin = transport.status === "pendente";

              return (
                <div
                  key={transport.id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto_auto] gap-0 items-center px-4 py-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    "border-b last:border-b-0"
                  )}
                  onClick={() => setSelectedTransportId(transport.id)}
                  data-testid={`row-transport-${transport.id}`}
                >
                  <span className="font-mono text-xs font-semibold pr-4">{transport.requestNumber}</span>
                  <span className="font-mono text-xs pr-2">{transport.vehicleChassi}</span>
                  <span className="text-muted-foreground truncate pr-2">{originYard?.name || "-"}</span>
                  <span className="truncate pr-2">{client?.name || "-"}</span>
                  <span className="text-muted-foreground truncate pr-2">
                    {deliveryLocation ? `${deliveryLocation.city}/${deliveryLocation.state}` : "-"}
                  </span>
                  <span className="truncate pr-2">{driver?.name || <span className="text-muted-foreground">-</span>}</span>
                  <span className="pr-3">
                    {isPendingCheckin ? (
                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-700 whitespace-nowrap">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Falta Check-in
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-700 whitespace-nowrap">
                        Aguard. Saída
                      </Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedTransportId(transport.id); }}
                    className="text-muted-foreground"
                    data-testid={`button-detail-transport-${transport.id}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {isPendingCheckin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-400 text-orange-700 hover:bg-orange-50 whitespace-nowrap"
                      onClick={(e) => { e.stopPropagation(); setConfirmExitWithoutCheckin(transport.id); }}
                      disabled={isAuthorizing}
                      data-testid={`button-authorize-exit-list-nocheckin-${transport.id}`}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      Autorizar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); authorizeExitMutation.mutate(transport.id); }}
                      disabled={isAuthorizing}
                      className="whitespace-nowrap"
                      data-testid={`button-authorize-exit-list-${transport.id}`}
                    >
                      {isAuthorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
                      Autorizar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Transfer Authorization Section */}
        <Card className="mt-8 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                <ArrowLeftRight className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Controle de Transferências</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Autorize a saída de veículos sendo transferidos entre pátios
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-10">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
            Transferências Pendentes de Autorização
            {pendingTransfersList.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingTransfersList.length}</Badge>
            )}
          </h2>

          {transfersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-48 mb-4" /><Skeleton className="h-8 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : pendingTransfersList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhuma transferência aguardando autorização</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingTransfersList.map((t) => (
                <Card key={t.id} className="border-purple-200 dark:border-purple-800" data-testid={`card-transfer-portaria-${t.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold text-sm" data-testid={`text-chassi-transfer-${t.id}`}>{t.vehicleChassi}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />Pendente
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t.originYard?.name ?? t.originYardId}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-medium">{t.destinationYard?.name ?? t.destinationYardId}</span>
                      </div>
                    </div>
                    {t.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 line-clamp-2">{t.notes}</p>
                    )}
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="sm"
                      onClick={() => authorizeTransferMutation.mutate(t.id)}
                      disabled={authorizeTransferMutation.isPending}
                      data-testid={`button-authorize-transfer-${t.id}`}
                    >
                      {authorizeTransferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Autorizar Transferência
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-none">
          {lightboxPhoto && (
            <img
              src={normalizeImageUrl(lightboxPhoto)}
              alt="Foto check-in motorista"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCollectId} onOpenChange={() => setSelectedCollectId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Detalhes da Coleta
            </DialogTitle>
          </DialogHeader>
          
          {selectedCollectLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCollect ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Chassi</p>
                  <p className="font-mono font-medium">{selectedCollect.vehicleChassi}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedCollect.status === "finalizada" ? "Finalizada" : selectedCollect.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Origem (Fabricante)</p>
                  <p className="font-medium">{selectedCollect.manufacturer?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destino (Pátio)</p>
                  <p className="font-medium">{selectedCollect.yard?.name || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Motorista</p>
                  <p className="font-medium">{selectedCollect.driver?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data da Coleta</p>
                  <p className="font-medium">
                    {selectedCollect.collectDate
                      ? format(new Date(selectedCollect.collectDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedCollect.checkinDateTime && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Check-in (Coleta)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data/Hora</p>
                      <p className="font-medium">
                        {format(new Date(selectedCollect.checkinDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {selectedCollect.checkinLatitude && selectedCollect.checkinLongitude && (
                      <div>
                        <p className="text-muted-foreground">Localização</p>
                        <a
                          href={`https://maps.google.com/?q=${selectedCollect.checkinLatitude},${selectedCollect.checkinLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Ver no Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCollect.checkoutDateTime && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Check-out (Entrada no Pátio)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data/Hora</p>
                      <p className="font-medium">
                        {format(new Date(selectedCollect.checkoutDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {selectedCollect.checkoutLatitude && selectedCollect.checkoutLongitude && (
                      <div>
                        <p className="text-muted-foreground">Localização</p>
                        <a
                          href={`https://maps.google.com/?q=${selectedCollect.checkoutLatitude},${selectedCollect.checkoutLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Ver no Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedCollect.checkoutApprovedBy && (
                    <div className="mt-4 pt-4 border-t border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Autorizado por</p>
                          <p className="font-medium text-green-700 dark:text-green-300">
                            {`${selectedCollect.checkoutApprovedBy.firstName || ''} ${selectedCollect.checkoutApprovedBy.lastName || ''}`.trim() || selectedCollect.checkoutApprovedBy.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedCollect.checkinNotes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações do Check-in</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedCollect.checkinNotes}</p>
                </div>
              )}

              {selectedCollect.checkoutNotes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações do Check-out</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedCollect.checkoutNotes}</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTransportId} onOpenChange={() => setSelectedTransportId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Detalhes do Transporte
            </DialogTitle>
            <DialogDescription>
              Informações completas do transporte aguardando saída
            </DialogDescription>
          </DialogHeader>

          {selectedTransport ? (() => {
            const t = selectedTransport;
            const originYard = getYard(t.originYardId);
            const client = (t as any).client;
            const deliveryLocation = (t as any).deliveryLocation;
            const driver = (t as any).driver;
            const isPendingCheckin = t.status === "pendente";

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Número OTD</p>
                    <p className="font-mono font-semibold text-lg">{t.requestNumber}</p>
                  </div>
                  {isPendingCheckin ? (
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-700">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      Aguardando Check-in
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">
                      Aguardando Saída
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Chassi</p>
                    <p className="font-mono font-medium">{t.vehicleChassi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                    <p className="font-medium">
                      {t.deliveryDate ? (() => {
                        const d = String(t.deliveryDate);
                        const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
                        return m ? `${m[3]}/${m[2]}/${m[1]}` : "-";
                      })() : "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{client?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pátio de Origem</p>
                    <p className="font-medium">{originYard?.name || "-"}</p>
                  </div>
                </div>

                {deliveryLocation && (
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Local de Entrega
                    </p>
                    <p className="font-medium">{deliveryLocation.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[deliveryLocation.address, deliveryLocation.addressNumber, deliveryLocation.neighborhood, deliveryLocation.city, deliveryLocation.state]
                        .filter(Boolean).join(", ")}
                    </p>
                    {deliveryLocation.responsibleName && (
                      <p className="text-sm text-muted-foreground">
                        Responsável: <span className="text-foreground">{deliveryLocation.responsibleName}</span>
                        {deliveryLocation.responsiblePhone && ` — ${deliveryLocation.responsiblePhone}`}
                      </p>
                    )}
                  </div>
                )}

                {driver && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                    {t.checkinSelfiePhoto ? (
                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(t.checkinSelfiePhoto || null)}
                        className="shrink-0"
                      >
                        <img
                          src={normalizeImageUrl(t.checkinSelfiePhoto)}
                          alt="Selfie motorista"
                          className="h-14 w-14 rounded-full object-cover border-2 border-primary cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Motorista</p>
                      <p className="font-medium">{driver.name}</p>
                      {driver.cpf && <p className="text-xs text-muted-foreground">CPF: {driver.cpf}</p>}
                    </div>
                  </div>
                )}

                {t.checkinDateTime && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Check-in realizado
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Data/Hora</p>
                        <p className="font-medium">
                          {format(new Date(t.checkinDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {t.checkinLatitude && t.checkinLongitude && (
                        <div>
                          <p className="text-muted-foreground">Localização</p>
                          <a
                            href={`https://maps.google.com/?q=${t.checkinLatitude},${t.checkinLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Ver no Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {t.checkinNotes && (
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <p className="text-sm text-muted-foreground">Observações:</p>
                        <p className="text-sm">{t.checkinNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {isPendingCheckin && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md text-center">
                    <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Motorista ainda não realizou o check-in
                    </p>
                  </div>
                )}

                {t.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{t.notes}</p>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCollectDialog} onOpenChange={(open) => {
        if (!open) {
          setShowNewCollectDialog(false);
          setOpenManufacturer(false);
          setOpenYard(false);
          setOpenDriver(false);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Registrar Nova Coleta
            </DialogTitle>
            <DialogDescription>
              Registre uma coleta para um veículo que chegou sem registro prévio.
            </DialogDescription>
          </DialogHeader>
          <Form {...newCollectForm}>
            <form onSubmit={newCollectForm.handleSubmit((data) => createCollectMutation.mutate(data))} className="space-y-4">
              <FormField
                control={newCollectForm.control}
                name="vehicleChassi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassi do Veículo *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Digite o chassi (17 caracteres)"
                        maxLength={17}
                        className="uppercase"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-new-collect-chassi"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCollectForm.control}
                name="manufacturerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Origem (Montadora) *</FormLabel>
                    <Popover open={openManufacturer} onOpenChange={setOpenManufacturer}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-new-collect-manufacturer"
                          >
                            {field.value
                              ? activeManufacturers?.find((m) => m.id === field.value)?.name
                              : "Selecione a montadora"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar montadora..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma montadora encontrada.</CommandEmpty>
                            <CommandGroup>
                              {activeManufacturers?.map((manufacturer) => (
                                <CommandItem
                                  key={manufacturer.id}
                                  value={manufacturer.name}
                                  onSelect={() => {
                                    field.onChange(manufacturer.id);
                                    setOpenManufacturer(false);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === manufacturer.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {manufacturer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCollectForm.control}
                name="yardId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Destino (Pátio) *</FormLabel>
                    <Popover open={openYard} onOpenChange={setOpenYard}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-new-collect-yard"
                          >
                            {field.value
                              ? activeYards?.find((y) => y.id === field.value)?.name
                              : "Selecione o pátio"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar pátio..." />
                          <CommandList>
                            <CommandEmpty>Nenhum pátio encontrado.</CommandEmpty>
                            <CommandGroup>
                              {activeYards?.map((yard) => (
                                <CommandItem
                                  key={yard.id}
                                  value={yard.name}
                                  onSelect={() => {
                                    field.onChange(yard.id);
                                    setOpenYard(false);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === yard.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {yard.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCollectForm.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Motorista</FormLabel>
                    <Popover open={openDriver} onOpenChange={setOpenDriver}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-new-collect-driver"
                          >
                            {field.value
                              ? activeDrivers?.find((d) => d.id === field.value)?.name
                              : "Selecione o motorista"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar motorista..." />
                          <CommandList>
                            <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                            <CommandGroup>
                              {activeDrivers?.map((driver) => (
                                <CommandItem
                                  key={driver.id}
                                  value={driver.name}
                                  onSelect={() => {
                                    field.onChange(driver.id);
                                    setOpenDriver(false);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === driver.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {driver.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCollectForm.control}
                name="collectDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Coleta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                        data-testid="input-new-collect-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCollectForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações adicionais..."
                        rows={3}
                        data-testid="input-new-collect-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCollectDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCollectMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-new-collect"
                >
                  {createCollectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Coleta
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmExitWithoutCheckin} onOpenChange={(open) => {
        if (!open) {
          setConfirmExitWithoutCheckin(null);
          setExitAuthorizationReason("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Autorização Sem Check-in
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base space-y-4">
                <p className="text-muted-foreground">
                  O motorista ainda não realizou o check-in para este transporte.
                </p>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md text-orange-800 dark:text-orange-300 font-medium">
                  Ao confirmar, você assume total responsabilidade pela autorização desta saída sem a verificação do check-in do motorista.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorization-reason" className="text-foreground font-medium">
                    Motivo da autorização / Quem autorizou *
                  </Label>
                  <Textarea
                    id="authorization-reason"
                    placeholder="Informe o motivo da autorização ou quem autorizou esta saída..."
                    value={exitAuthorizationReason}
                    onChange={(e) => setExitAuthorizationReason(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="input-authorization-reason"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-exit-no-checkin">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!exitAuthorizationReason.trim()}
              onClick={() => {
                if (confirmExitWithoutCheckin && exitAuthorizationReason.trim()) {
                  authorizeExitMutation.mutate(confirmExitWithoutCheckin);
                  setConfirmExitWithoutCheckin(null);
                  setExitAuthorizationReason("");
                }
              }}
              data-testid="button-confirm-exit-no-checkin"
            >
              Confirmo e Autorizo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
