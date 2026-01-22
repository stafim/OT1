import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, History, User, Clock, Truck, Building2, Navigation, Camera, Car, Gauge, AlertTriangle, Download, MapPin, Loader2 } from "lucide-react";
import { VehicleFormDialog } from "./form-dialog";
import * as XLSX from "xlsx";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle, Manufacturer, Client, Collect, Driver, Yard, DeliveryLocation } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CollectWithRelations = Collect & {
  manufacturer?: Manufacturer;
  yard?: Yard;
  driver?: Driver | null;
};

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "pre_estoque", label: "Pré-estoque" },
  { value: "em_estoque", label: "Em estoque" },
  { value: "despachado", label: "Despachado" },
  { value: "entregue", label: "Entregue" },
  { value: "retirado", label: "Retirado" },
];

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [deleteChassi, setDeleteChassi] = useState<string | null>(null);
  const [historyChassi, setHistoryChassi] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChassi, setEditingChassi] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Transport creation dialog state
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [transportVehicle, setTransportVehicle] = useState<Vehicle | null>(null);
  const [transportClientId, setTransportClientId] = useState("");
  const [transportDeliveryLocationId, setTransportDeliveryLocationId] = useState("");
  const [transportDriverId, setTransportDriverId] = useState("");
  const [transportDeliveryDate, setTransportDeliveryDate] = useState("");
  const [transportNotes, setTransportNotes] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeSummary, setRouteSummary] = useState<{
    distance: { value: number; text: string };
    duration: { value: number; text: string };
    durationInTraffic?: { value: number; text: string };
    originAddress: string;
    destinationAddress: string;
    tollCost?: { amount: string; isEstimate?: boolean };
    fuelCost: number;
  } | null>(null);

  const { data: chassiHistory, isLoading: isLoadingHistory } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects/by-chassi", historyChassi],
    enabled: !!historyChassi,
  });

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: manufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: yards } = useQuery<Yard[]>({
    queryKey: ["/api/yards"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: transportLocations } = useQuery<DeliveryLocation[]>({
    queryKey: ["/api/clients", transportClientId, "locations"],
    enabled: !!transportClientId,
  });

  const getManufacturerName = (manufacturerId: string | null) => {
    if (!manufacturerId) return "-";
    const manufacturer = manufacturers?.find(m => m.id === manufacturerId);
    return manufacturer?.name || "-";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "-";
  };

  const getYardName = (yardId: string | null | undefined) => {
    if (!yardId) return "-";
    const yard = yards?.find(y => y.id === yardId);
    return yard?.name || "-";
  };

  const deleteMutation = useMutation({
    mutationFn: async (chassi: string) => {
      await apiRequest("DELETE", `/api/vehicles/${chassi}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo excluído com sucesso" });
      setDeleteChassi(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir veículo", variant: "destructive" });
    },
  });

  const transportMutation = useMutation({
    mutationFn: async (data: {
      vehicleChassi: string;
      clientId: string;
      originYardId: string;
      deliveryLocationId: string;
      driverId?: string | null;
      deliveryDate?: string | null;
      notes?: string | null;
      documents?: string[] | null;
    }) => {
      return apiRequest("POST", "/api/transports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Transporte criado com sucesso" });
      closeTransportDialog();
    },
    onError: () => {
      toast({ title: "Erro ao criar transporte", variant: "destructive" });
    },
  });

  const openTransportDialog = (vehicle: Vehicle) => {
    setTransportVehicle(vehicle);
    setTransportClientId(vehicle.clientId || "");
    setTransportDeliveryLocationId("");
    setTransportDriverId("");
    setTransportDeliveryDate("");
    setTransportNotes("");
    setTransportDialogOpen(true);
  };

  const closeTransportDialog = () => {
    setTransportDialogOpen(false);
    setTransportVehicle(null);
    setTransportClientId("");
    setTransportDeliveryLocationId("");
    setTransportDriverId("");
    setTransportDeliveryDate("");
    setTransportNotes("");
    setRouteSummary(null);
  };

  // Calculate route when origin yard and delivery location are selected
  useEffect(() => {
    const fetchRouteSummary = async () => {
      const originYardId = transportVehicle?.yardId;
      const deliveryLocationId = transportDeliveryLocationId;

      if (!originYardId || !deliveryLocationId) {
        setRouteSummary(null);
        return;
      }

      const originYard = yards?.find(y => y.id === originYardId);
      const destLocation = transportLocations?.find(l => l.id === deliveryLocationId);

      if (!originYard?.latitude || !originYard?.longitude || !destLocation?.latitude || !destLocation?.longitude) {
        setRouteSummary(null);
        return;
      }

      setLoadingRoute(true);
      try {
        const response = await apiRequest("POST", "/api/routing/calculate", {
          origin: { lat: parseFloat(originYard.latitude), lng: parseFloat(originYard.longitude) },
          destination: { lat: parseFloat(destLocation.latitude), lng: parseFloat(destLocation.longitude) },
        });

        const data = await response.json();
        
        const distanceKm = data.distance.value / 1000;
        const litersNeeded = distanceKm / 4;
        const fuelPricePerLiter = 6.50;
        const fuelCost = litersNeeded * fuelPricePerLiter;

        setRouteSummary({
          ...data,
          fuelCost,
        });
      } catch (error) {
        console.error("Error fetching route:", error);
        setRouteSummary(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRouteSummary();
  }, [transportVehicle?.yardId, transportDeliveryLocationId, yards, transportLocations]);

  const handleCreateTransport = () => {
    if (!transportVehicle) return;
    if (!transportClientId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (!transportDeliveryLocationId) {
      toast({ title: "Selecione um local de entrega", variant: "destructive" });
      return;
    }
    if (!transportVehicle.yardId) {
      toast({ title: "O veículo precisa estar em um pátio", variant: "destructive" });
      return;
    }

    transportMutation.mutate({
      vehicleChassi: transportVehicle.chassi,
      clientId: transportClientId,
      originYardId: transportVehicle.yardId,
      deliveryLocationId: transportDeliveryLocationId,
      driverId: transportDriverId || null,
      deliveryDate: transportDeliveryDate || null,
      notes: transportNotes || null,
    });
  };

  const filteredData = vehicles?.filter((v) => {
    const manufacturerName = getManufacturerName(v.manufacturerId);
    const matchesSearch =
      v.chassi.toLowerCase().includes(search.toLowerCase()) ||
      manufacturerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesClient = clientFilter === "all" || v.clientId === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const statusLabels: Record<string, string> = {
    pre_estoque: "Pré-estoque",
    em_estoque: "Em estoque",
    despachado: "Despachado",
    entregue: "Entregue",
    retirado: "Retirado",
  };

  const handleNew = () => {
    setEditingChassi(null);
    setDialogOpen(true);
  };

  const handleEdit = (v: Vehicle) => {
    setEditingChassi(v.chassi);
    setDialogOpen(true);
  };

  const handleExportExcel = () => {
    if (!vehicles || vehicles.length === 0) {
      toast({ title: "Nenhum veículo para exportar", variant: "destructive" });
      return;
    }

    const exportData = vehicles.map((v) => ({
      Chassi: v.chassi,
      Cliente: getClientName(v.clientId),
      Pátio: getYardName(v.yardId),
      Status: statusLabels[v.status] || v.status,
      "Data Entrada": v.yardEntryDateTime
        ? format(new Date(v.yardEntryDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      "Data Retirada": v.dispatchDateTime
        ? format(new Date(v.dispatchDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "-",
      Montadora: getManufacturerName(v.manufacturerId),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    
    const colWidths = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];
    ws["!cols"] = colWidths;

    const fileName = `estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({ title: "Planilha exportada com sucesso!" });
  };

  const columns = [
    { key: "chassi", label: "Chassi" },
    {
      key: "clientId",
      label: "Cliente",
      render: (v: Vehicle) => getClientName(v.clientId),
    },
    {
      key: "yardId",
      label: "Pátio",
      render: (v: Vehicle) => getYardName(v.yardId),
    },
    {
      key: "status",
      label: "Status",
      render: (v: Vehicle) => <StatusBadge status={v.status} />,
    },
    {
      key: "yardEntryDateTime",
      label: "Data Entrada",
      render: (v: Vehicle) =>
        v.yardEntryDateTime
          ? format(new Date(v.yardEntryDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
    },
    {
      key: "dispatchDateTime",
      label: "Data Retirada",
      render: (v: Vehicle) =>
        v.dispatchDateTime
          ? format(new Date(v.dispatchDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
    },
    {
      key: "actions",
      label: "",
      className: "w-40",
      render: (v: Vehicle) => (
        <div className="flex items-center gap-1">
          {v.status === "em_estoque" && v.yardId && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                openTransportDialog(v);
              }}
              data-testid={`button-create-transport-${v.chassi}`}
              title="Criar Transporte"
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setHistoryChassi(v.chassi);
            }}
            data-testid={`button-history-${v.chassi}`}
            title="Histórico do chassi"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(v);
            }}
            data-testid={`button-edit-${v.chassi}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteChassi(v.chassi);
            }}
            data-testid={`button-delete-${v.chassi}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Estoque de Veículos"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Estoque" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por chassi ou montadora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-vehicles"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48" data-testid="select-client-filter">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="text-total-count">
              {filteredData?.length || 0} chassis
            </span>
            <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-excel">
              <Download className="mr-2 h-4 w-4" />
              Baixar planilha
            </Button>
            <Button onClick={handleNew} data-testid="button-add-vehicle">
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="chassi"
          onRowClick={handleEdit}
          emptyMessage="Nenhum veículo cadastrado"
        />
      </div>

      <AlertDialog open={!!deleteChassi} onOpenChange={() => setDeleteChassi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteChassi && deleteMutation.mutate(deleteChassi)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyChassi} onOpenChange={() => setHistoryChassi(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico do Chassi
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-medium">{historyChassi}</span>
            </div>

            {isLoadingHistory ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : chassiHistory && chassiHistory.length > 0 ? (
              <div className="space-y-4">
                {chassiHistory.map((collect, index) => (
                  <Card key={collect.id} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-b">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-sm">Coleta #{index + 1}</CardTitle>
                        <Badge variant={collect.status === "finalizada" ? "default" : "secondary"}>
                          {collect.status === "finalizada" ? "Finalizada" : "Em Trânsito"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            Motorista
                          </div>
                          <p className="text-sm font-medium">
                            {collect.driver?.name || "Não atribuído"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            Pátio Destino
                          </div>
                          <p className="text-sm font-medium">
                            {collect.yard?.name || "-"}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Check-in (Saída da Montadora)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Horário
                            </div>
                            <p className="text-sm">
                              {collect.checkinDateTime
                                ? format(new Date(collect.checkinDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Navigation className="h-3 w-3" />
                              Localização
                            </div>
                            <p className="text-sm font-mono text-xs">
                              {collect.checkinLatitude && collect.checkinLongitude
                                ? `${collect.checkinLatitude}, ${collect.checkinLongitude}`
                                : "-"}
                            </p>
                          </div>
                        </div>

                        {(collect.checkinSelfiePhoto || collect.checkinOdometerPhoto || collect.checkinFrontalPhoto || collect.checkinLateral1Photo || collect.checkinLateral2Photo || collect.checkinTraseiraPhoto || (collect.checkinDamagePhotos && collect.checkinDamagePhotos.length > 0)) && (
                          <div className="space-y-2 pt-2">
                            <p className="text-xs text-muted-foreground">Fotos</p>
                            <div className="grid grid-cols-4 gap-2">
                              {collect.checkinSelfiePhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkinSelfiePhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinSelfiePhoto)} alt="Selfie" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Camera className="h-2.5 w-2.5" /> Selfie</p>
                                </div>
                              )}
                              {collect.checkinOdometerPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkinOdometerPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinOdometerPhoto)} alt="Odômetro" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Gauge className="h-2.5 w-2.5" /> Odômetro</p>
                                </div>
                              )}
                              {collect.checkinFrontalPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkinFrontalPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinFrontalPhoto)} alt="Frontal" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Frontal</p>
                                </div>
                              )}
                              {collect.checkinLateral1Photo && (
                                <div className="space-y-1">
                                  <a href={collect.checkinLateral1Photo} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinLateral1Photo)} alt="Lateral 1" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Lateral 1</p>
                                </div>
                              )}
                              {collect.checkinLateral2Photo && (
                                <div className="space-y-1">
                                  <a href={collect.checkinLateral2Photo} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinLateral2Photo)} alt="Lateral 2" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Lateral 2</p>
                                </div>
                              )}
                              {collect.checkinTraseiraPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkinTraseiraPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkinTraseiraPhoto)} alt="Traseira" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Traseira</p>
                                </div>
                              )}
                              {collect.checkinDamagePhotos?.map((photo: string, i: number) => (
                                <div key={`checkin-damage-${i}`} className="space-y-1">
                                  <a href={photo} target="_blank" rel="noopener noreferrer">
                                    <img src={photo} alt={`Avaria ${i + 1}`} className="w-full h-16 object-cover rounded border border-orange-300 hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-orange-600 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Avaria</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {collect.checkinNotes && (
                          <div className="space-y-1 pt-2">
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <p className="text-sm">{collect.checkinNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Check-out (Chegada no Pátio)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Horário
                            </div>
                            <p className="text-sm">
                              {collect.checkoutDateTime
                                ? format(new Date(collect.checkoutDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Navigation className="h-3 w-3" />
                              Localização
                            </div>
                            <p className="text-sm font-mono text-xs">
                              {collect.checkoutLatitude && collect.checkoutLongitude
                                ? `${collect.checkoutLatitude}, ${collect.checkoutLongitude}`
                                : "-"}
                            </p>
                          </div>
                        </div>

                        {(collect.checkoutSelfiePhoto || collect.checkoutOdometerPhoto || collect.checkoutFrontalPhoto || collect.checkoutLateral1Photo || collect.checkoutLateral2Photo || collect.checkoutTraseiraPhoto || (collect.checkoutDamagePhotos && collect.checkoutDamagePhotos.length > 0)) && (
                          <div className="space-y-2 pt-2">
                            <p className="text-xs text-muted-foreground">Fotos</p>
                            <div className="grid grid-cols-4 gap-2">
                              {collect.checkoutSelfiePhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutSelfiePhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutSelfiePhoto)} alt="Selfie" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Camera className="h-2.5 w-2.5" /> Selfie</p>
                                </div>
                              )}
                              {collect.checkoutOdometerPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutOdometerPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutOdometerPhoto)} alt="Odômetro" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Gauge className="h-2.5 w-2.5" /> Odômetro</p>
                                </div>
                              )}
                              {collect.checkoutFrontalPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutFrontalPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutFrontalPhoto)} alt="Frontal" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Frontal</p>
                                </div>
                              )}
                              {collect.checkoutLateral1Photo && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutLateral1Photo} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutLateral1Photo)} alt="Lateral 1" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Lateral 1</p>
                                </div>
                              )}
                              {collect.checkoutLateral2Photo && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutLateral2Photo} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutLateral2Photo)} alt="Lateral 2" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Lateral 2</p>
                                </div>
                              )}
                              {collect.checkoutTraseiraPhoto && (
                                <div className="space-y-1">
                                  <a href={collect.checkoutTraseiraPhoto} target="_blank" rel="noopener noreferrer">
                                    <img src={normalizeImageUrl(collect.checkoutTraseiraPhoto)} alt="Traseira" className="w-full h-16 object-cover rounded border hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Traseira</p>
                                </div>
                              )}
                              {collect.checkoutDamagePhotos?.map((photo: string, i: number) => (
                                <div key={`checkout-damage-${i}`} className="space-y-1">
                                  <a href={photo} target="_blank" rel="noopener noreferrer">
                                    <img src={photo} alt={`Avaria ${i + 1}`} className="w-full h-16 object-cover rounded border border-orange-300 hover:opacity-80 transition" />
                                  </a>
                                  <p className="text-[10px] text-orange-600 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Avaria</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {collect.checkoutNotes && (
                          <div className="space-y-1 pt-2">
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <p className="text-sm">{collect.checkoutNotes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma coleta encontrada para este chassi</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <VehicleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleChassi={editingChassi}
      />

      <Dialog open={transportDialogOpen} onOpenChange={closeTransportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Transporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo (Chassi) *</Label>
                <Input
                  value={transportVehicle?.chassi || ""}
                  disabled
                  className="bg-muted font-mono"
                  data-testid="input-transport-chassi"
                />
              </div>

              <div className="space-y-2">
                <Label>Pátio de Origem *</Label>
                <Input
                  value={yards?.find(y => y.id === transportVehicle?.yardId)?.name || ""}
                  disabled
                  className="bg-muted"
                  data-testid="input-transport-origin-yard"
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={transportClientId}
                  onValueChange={(value) => {
                    setTransportClientId(value);
                    setTransportDeliveryLocationId("");
                  }}
                >
                  <SelectTrigger data-testid="select-transport-client">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local de Entrega *</Label>
                <Select
                  value={transportDeliveryLocationId}
                  onValueChange={setTransportDeliveryLocationId}
                  disabled={!transportClientId}
                >
                  <SelectTrigger data-testid="select-transport-delivery-location">
                    <SelectValue placeholder={transportClientId ? "Selecione o local" : "Selecione o cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {transportLocations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} - {location.city}/{location.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transportClientId && transportLocations?.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum local de entrega cadastrado para este cliente</p>
                )}
              </div>
            </div>

            {/* Route Summary Card */}
            {(loadingRoute || routeSummary) && (
              <Card className="bg-muted/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Resumo da Viagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  {loadingRoute ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Calculando rota...</span>
                    </div>
                  ) : routeSummary ? (
                    <div className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 p-2 bg-background rounded">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Origem</p>
                            <p className="font-medium break-words" title={routeSummary.originAddress}>
                              {routeSummary.originAddress}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-background rounded">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Destino</p>
                            <p className="font-medium break-words" title={routeSummary.destinationAddress}>
                              {routeSummary.destinationAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                        <div className="text-center p-2 bg-background rounded">
                          <p className="text-xs text-muted-foreground">Distância</p>
                          <p className="font-semibold text-primary">{routeSummary.distance.text}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                          <p className="text-xs text-muted-foreground">Tempo Estimado</p>
                          <p className="font-semibold text-primary">{routeSummary.duration.text}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                          <p className="text-xs text-muted-foreground">
                            Pedágios{routeSummary.tollCost?.isEstimate ? " (est.)" : ""}
                          </p>
                          <p className="font-semibold text-orange-600">
                            {routeSummary.tollCost 
                              ? `R$ ${parseFloat(routeSummary.tollCost.amount).toFixed(2)}`
                              : "Sem pedágios"}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-background rounded">
                          <p className="text-xs text-muted-foreground">Combustível (4km/L)</p>
                          <p className="font-semibold text-blue-600">
                            R$ {routeSummary.fuelCost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Custo Total Estimado:</span>
                          <span className="font-bold text-lg">
                            R$ {(routeSummary.fuelCost + (routeSummary.tollCost ? parseFloat(routeSummary.tollCost.amount) : 0)).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          * Baseado em consumo de 4 km/litro e diesel a R$ 6,50/litro
                        </p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select
                  value={transportDriverId}
                  onValueChange={setTransportDriverId}
                >
                  <SelectTrigger data-testid="select-transport-driver">
                    <SelectValue placeholder="Selecione o motorista (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isApto === "true" && d.isActive === "true").map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Previsão de Entrega</Label>
                <Input
                  type="datetime-local"
                  value={transportDeliveryDate}
                  onChange={(e) => setTransportDeliveryDate(e.target.value)}
                  data-testid="input-transport-delivery-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={transportNotes}
                onChange={(e) => setTransportNotes(e.target.value)}
                placeholder="Observações adicionais..."
                data-testid="textarea-transport-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeTransportDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTransport}
              disabled={
                transportMutation.isPending ||
                !transportVehicle?.chassi ||
                !transportClientId ||
                !transportVehicle?.yardId ||
                !transportDeliveryLocationId
              }
              data-testid="button-save-transport"
            >
              {transportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
