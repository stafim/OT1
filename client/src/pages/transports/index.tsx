import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, LogIn, LogOut, MapPin, Loader2, Camera, Upload, X, CheckCircle, XCircle, Eye, Navigation, Clock, Fuel, Receipt, Route, Car, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Transport, Client, Yard, Vehicle, DeliveryLocation, Driver } from "@shared/schema";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransportWithRelations extends Transport {
  client?: { name: string };
  driver?: { name: string; phone: string };
  deliveryLocation?: { name: string; city: string; state: string };
  createdByUser?: { id: string; username: string; firstName: string | null; lastName: string | null };
  driverAssignedByUser?: { id: string; username: string; firstName: string | null; lastName: string | null };
}

interface PhotoUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  testId: string;
}

function PhotoUpload({ label, value, onChange, testId }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Try Object Storage first
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Object Storage unavailable");

      const { uploadURL, objectPath } = await response.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      onChange(objectPath);
    } catch {
      // Fallback to local upload
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const token = localStorage.getItem("accessToken");
        const localResponse = await fetch("/api/uploads/local", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: base64,
            filename: file.name,
            contentType: file.type,
          }),
        });
        if (!localResponse.ok) throw new Error("Failed to upload locally");
        const { objectPath } = await localResponse.json();
        onChange(objectPath);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{label}</p>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-16 w-16 rounded-md object-cover border" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5"
            onClick={() => onChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
            data-testid={testId}
          />
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="h-4 w-4 text-muted-foreground" />
          )}
        </label>
      )}
    </div>
  );
}

interface MultiPhotoUploadProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  testId: string;
  maxPhotos?: number;
}

function MultiPhotoUpload({ label, values = [], onChange, testId, maxPhotos = 5 }: MultiPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Try Object Storage first
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Object Storage unavailable");

      const { uploadURL, objectPath } = await response.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      onChange([...values, objectPath]);
    } catch {
      // Fallback to local upload
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const token = localStorage.getItem("accessToken");
        const localResponse = await fetch("/api/uploads/local", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: base64,
            filename: file.name,
            contentType: file.type,
          }),
        });
        if (!localResponse.ok) throw new Error("Failed to upload locally");
        const { objectPath } = await localResponse.json();
        onChange([...values, objectPath]);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((url, index) => (
          <div key={index} className="relative">
            <img src={url} alt={`${label} ${index + 1}`} className="h-14 w-14 rounded-md object-cover border" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 w-4"
              onClick={() => removePhoto(index)}
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
        ))}
        {values.length < maxPhotos && (
          <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
              data-testid={testId}
            />
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
          </label>
        )}
      </div>
    </div>
  );
}

interface CheckFormData {
  latitude: string;
  longitude: string;
  frontalPhoto: string;
  lateral1Photo: string;
  lateral2Photo: string;
  traseiraPhoto: string;
  odometerPhoto: string;
  fuelLevelPhoto: string;
  damagePhotos: string[];
  selfiePhoto: string;
  notes: string;
}

const initialCheckFormData: CheckFormData = {
  latitude: "",
  longitude: "",
  frontalPhoto: "",
  lateral1Photo: "",
  lateral2Photo: "",
  traseiraPhoto: "",
  odometerPhoto: "",
  fuelLevelPhoto: "",
  damagePhotos: [],
  selfiePhoto: "",
  notes: "",
};

export default function TransportsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTransport, setViewTransport] = useState<TransportWithRelations | null>(null);
  const [checkinTransport, setCheckinTransport] = useState<TransportWithRelations | null>(null);
  const [checkoutTransport, setCheckoutTransport] = useState<TransportWithRelations | null>(null);
  const [checkinData, setCheckinData] = useState<CheckFormData>(initialCheckFormData);
  const [checkoutData, setCheckoutData] = useState<CheckFormData>(initialCheckFormData);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [clearCheckinId, setClearCheckinId] = useState<string | null>(null);
  const [clearCheckoutId, setClearCheckoutId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTransportData, setNewTransportData] = useState({
    vehicleChassi: "",
    clientId: "",
    originYardId: "",
    deliveryLocationId: "",
    driverId: "",
    deliveryDate: "",
    notes: "",
  });
  const [routeSummary, setRouteSummary] = useState<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    durationInTraffic: { text: string; value: number } | null;
    tollCost: { amount: string; currency: string; isEstimate?: boolean } | null;
    originAddress: string;
    destinationAddress: string;
    fuelCost: number;
  } | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const { toast } = useToast();

  const { data: transports, isLoading } = useQuery<TransportWithRelations[]>({
    queryKey: ["/api/transports"],
  });

  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: yards } = useQuery<Yard[]>({ queryKey: ["/api/yards"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: deliveryLocations } = useQuery<DeliveryLocation[]>({ queryKey: ["/api/delivery-locations"] });

  const availableVehicles = vehicles?.filter(v => v.status === "em_estoque") || [];
  const activeDrivers = drivers?.filter(d => d.isActive === "true") || [];

  const clientDeliveryLocations = deliveryLocations?.filter(
    loc => loc.clientId === newTransportData.clientId
  ) || [];

  // Fetch route summary when origin and destination are selected
  useEffect(() => {
    // Reset summary immediately when inputs change
    setRouteSummary(null);
    
    const originYardId = newTransportData.originYardId;
    const deliveryLocationId = newTransportData.deliveryLocationId;
    
    if (!originYardId || !deliveryLocationId) {
      return;
    }

    const originYard = yards?.find(y => y.id === originYardId);
    const destLocation = deliveryLocations?.find(l => l.id === deliveryLocationId);

    if (!originYard?.latitude || !originYard?.longitude || !destLocation?.latitude || !destLocation?.longitude) {
      return;
    }

    const fetchRouteSummary = async () => {
      setLoadingRoute(true);
      try {
        const response = await apiRequest("POST", "/api/routing/calculate", {
          origin: { lat: parseFloat(originYard.latitude!), lng: parseFloat(originYard.longitude!) },
          destination: { lat: parseFloat(destLocation.latitude!), lng: parseFloat(destLocation.longitude!) },
        });

        const data = await response.json();
        
        // Calculate fuel cost based on 4 km/liter consumption
        // Assuming average diesel price of R$ 6.50/liter
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
  }, [newTransportData.originYardId, newTransportData.deliveryLocationId, yards, deliveryLocations]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      toast({ title: "Transporte excluído com sucesso" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir transporte", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTransportData) => {
      return apiRequest("POST", "/api/transports", {
        ...data,
        driverId: data.driverId || null,
        deliveryDate: data.deliveryDate || null,
        notes: data.notes || null,
        status: "pendente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Transporte criado com sucesso" });
      setShowNewDialog(false);
      setNewTransportData({
        vehicleChassi: "",
        clientId: "",
        originYardId: "",
        deliveryLocationId: "",
        driverId: "",
        deliveryDate: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao criar transporte", variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CheckFormData }) => {
      return apiRequest("PATCH", `/api/transports/${id}/checkin`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-in realizado com sucesso" });
      setCheckinTransport(null);
      setCheckinData(initialCheckFormData);
    },
    onError: () => {
      toast({ title: "Erro ao realizar check-in", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CheckFormData }) => {
      return apiRequest("PATCH", `/api/transports/${id}/checkout`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-out realizado com sucesso" });
      setCheckoutTransport(null);
      setCheckoutData(initialCheckFormData);
    },
    onError: () => {
      toast({ title: "Erro ao realizar check-out", variant: "destructive" });
    },
  });

  const clearCheckinMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transports/${id}/checkin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-in excluído com sucesso" });
      setClearCheckinId(null);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao excluir check-in", variant: "destructive" });
    },
  });

  const clearCheckoutMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transports/${id}/checkout`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-out excluído com sucesso" });
      setClearCheckoutId(null);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao excluir check-out", variant: "destructive" });
    },
  });

  const getLocation = (setter: (data: CheckFormData) => void, data: CheckFormData) => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setter({
          ...data,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({ title: "Erro ao obter localização", variant: "destructive" });
        setGettingLocation(false);
      }
    );
  };

  const filteredData = transports?.filter((t) => {
    const matchesSearch =
      t.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicleChassi.toLowerCase().includes(search.toLowerCase()) ||
      t.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: "status",
      label: "Status",
      render: (t: TransportWithRelations) => <StatusBadge status={t.status} />,
    },
    { key: "requestNumber", label: "Nº Solicitação" },
    { key: "vehicleChassi", label: "Chassi" },
    {
      key: "clientName",
      label: "Cliente",
      render: (t: TransportWithRelations) => t.client?.name || "-",
    },
    {
      key: "deliveryLocation",
      label: "Local de Entrega",
      render: (t: TransportWithRelations) =>
        t.deliveryLocation
          ? `${t.deliveryLocation.name} - ${t.deliveryLocation.city}/${t.deliveryLocation.state}`
          : "-",
    },
    {
      key: "createdAt",
      label: "Data Criação",
      render: (t: TransportWithRelations) =>
        t.createdAt ? format(new Date(t.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "-",
    },
    {
      key: "driverName",
      label: "Motorista",
      render: (t: TransportWithRelations) => t.driver?.name || "-",
    },
    {
      key: "actions",
      label: "",
      className: "w-52",
      render: (t: TransportWithRelations) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={t.checkinDateTime ? "secondary" : "default"}
                disabled={!!t.checkinDateTime}
                onClick={(e) => {
                  e.stopPropagation();
                  setCheckinTransport(t);
                }}
                data-testid={`button-checkin-${t.id}`}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t.checkinDateTime ? "Check-in realizado" : "Realizar Check-in"}
            </TooltipContent>
          </Tooltip>
          {t.checkinDateTime && !t.checkoutDateTime && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClearCheckinId(t.id);
                  }}
                  data-testid={`button-clear-checkin-${t.id}`}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir Check-in</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={t.checkoutDateTime ? "secondary" : "default"}
                disabled={!t.checkinDateTime || !!t.checkoutDateTime}
                onClick={(e) => {
                  e.stopPropagation();
                  setCheckoutTransport(t);
                }}
                data-testid={`button-checkout-${t.id}`}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t.checkoutDateTime 
                ? "Check-out realizado" 
                : !t.checkinDateTime 
                  ? "Faça o check-in primeiro" 
                  : "Realizar Check-out"}
            </TooltipContent>
          </Tooltip>
          {t.checkoutDateTime && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClearCheckoutId(t.id);
                  }}
                  data-testid={`button-clear-checkout-${t.id}`}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir Check-out</TooltipContent>
            </Tooltip>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/transportes/${t.id}`);
            }}
            data-testid={`button-edit-${t.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(t.id);
            }}
            data-testid={`button-delete-${t.id}`}
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
        title="Transportes"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Transportes" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº solicitação, chassi ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-transports"
              />
            </div>
            <Button onClick={() => setShowNewDialog(true)} data-testid="button-add-transport">
              <Plus className="mr-2 h-4 w-4" />
              Novo Transporte
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              data-testid="filter-all"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "pendente" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pendente")}
              data-testid="filter-pendente"
            >
              Pendente
            </Button>
            <Button
              variant={statusFilter === "aguardando_saida" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("aguardando_saida")}
              data-testid="filter-aguardando-saida"
            >
              Aguardando Saída
            </Button>
            <Button
              variant={statusFilter === "em_transito" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("em_transito")}
              data-testid="filter-em-transito"
            >
              Em Trânsito
            </Button>
            <Button
              variant={statusFilter === "entregue" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("entregue")}
              data-testid="filter-entregue"
            >
              Entregue
            </Button>
            <Button
              variant={statusFilter === "cancelado" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("cancelado")}
              data-testid="filter-cancelado"
            >
              Cancelado
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="id"
          onRowClick={(t) => setViewTransport(t)}
          emptyMessage="Nenhum transporte encontrado"
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este transporte? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewTransport} onOpenChange={() => setViewTransport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Transporte
              {viewTransport && <StatusBadge status={viewTransport.status} />}
            </DialogTitle>
          </DialogHeader>
          {viewTransport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Informações Gerais</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Nº Solicitação:</span> {viewTransport.requestNumber}</p>
                    <p><span className="font-medium">Chassi:</span> {viewTransport.vehicleChassi}</p>
                    <p><span className="font-medium">Cliente:</span> {viewTransport.client?.name || "-"}</p>
                    <p><span className="font-medium">Local de Entrega:</span> {viewTransport.deliveryLocation ? `${viewTransport.deliveryLocation.name} - ${viewTransport.deliveryLocation.city}/${viewTransport.deliveryLocation.state}` : "-"}</p>
                    <p><span className="font-medium">Motorista:</span> {viewTransport.driver?.name || "-"}</p>
                    <p><span className="font-medium">Data de Entrega:</span> {viewTransport.deliveryDate ? format(new Date(viewTransport.deliveryDate), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
                    {viewTransport.notes && <p><span className="font-medium">Observações:</span> {viewTransport.notes}</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Rastreabilidade</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Criado por:</span> {viewTransport.createdByUser ? `${viewTransport.createdByUser.firstName || ''} ${viewTransport.createdByUser.lastName || ''} (${viewTransport.createdByUser.username})`.trim() : "-"}</p>
                    <p><span className="font-medium">Criado em:</span> {viewTransport.createdAt ? format(new Date(viewTransport.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
                    <p><span className="font-medium">Motorista adicionado por:</span> {viewTransport.driverAssignedByUser ? `${viewTransport.driverAssignedByUser.firstName || ''} ${viewTransport.driverAssignedByUser.lastName || ''} (${viewTransport.driverAssignedByUser.username})`.trim() : "-"}</p>
                    <p><span className="font-medium">Motorista adicionado em:</span> {viewTransport.driverAssignedAt ? format(new Date(viewTransport.driverAssignedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
                    <p><span className="font-medium">Saída para trânsito:</span> {viewTransport.transitStartedAt ? format(new Date(viewTransport.transitStartedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
                    <p><span className="font-medium">Check-in:</span> {viewTransport.checkinDateTime ? format(new Date(viewTransport.checkinDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
                    <p><span className="font-medium">Check-out:</span> {viewTransport.checkoutDateTime ? format(new Date(viewTransport.checkoutDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Check-in (Retirada do Pátio)
                  </h3>
                  {viewTransport.checkinDateTime ? (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Realizado em {format(new Date(viewTransport.checkinDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        {(viewTransport.checkinLatitude && viewTransport.checkinLongitude) && (
                          <p><span className="font-medium">Localização:</span> {viewTransport.checkinLatitude}, {viewTransport.checkinLongitude}</p>
                        )}
                        {viewTransport.checkinNotes && <p><span className="font-medium">Observações:</span> {viewTransport.checkinNotes}</p>}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {viewTransport.checkinFrontalPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Frontal</p>
                            <img src={normalizeImageUrl(viewTransport.checkinFrontalPhoto)} alt="Frontal" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinLateral1Photo && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Lateral 1</p>
                            <img src={normalizeImageUrl(viewTransport.checkinLateral1Photo)} alt="Lateral 1" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinLateral2Photo && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Lateral 2</p>
                            <img src={normalizeImageUrl(viewTransport.checkinLateral2Photo)} alt="Lateral 2" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinTraseiraPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Traseira</p>
                            <img src={normalizeImageUrl(viewTransport.checkinTraseiraPhoto)} alt="Traseira" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinOdometerPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Hodômetro</p>
                            <img src={normalizeImageUrl(viewTransport.checkinOdometerPhoto)} alt="Hodômetro" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinFuelLevelPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Combustível</p>
                            <img src={normalizeImageUrl(viewTransport.checkinFuelLevelPhoto)} alt="Combustível" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkinSelfiePhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Selfie</p>
                            <img src={normalizeImageUrl(viewTransport.checkinSelfiePhoto)} alt="Selfie" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                      </div>
                      {viewTransport.checkinDamagePhotos && viewTransport.checkinDamagePhotos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Fotos de Avarias ({viewTransport.checkinDamagePhotos.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {viewTransport.checkinDamagePhotos.map((photo, idx) => (
                              <img key={idx} src={normalizeImageUrl(photo)} alt={`Avaria ${idx + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                      Check-in não realizado
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Check-out (Entrega ao Cliente)
                  </h3>
                  {viewTransport.checkoutDateTime ? (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Realizado em {format(new Date(viewTransport.checkoutDateTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        {(viewTransport.checkoutLatitude && viewTransport.checkoutLongitude) && (
                          <p><span className="font-medium">Localização:</span> {viewTransport.checkoutLatitude}, {viewTransport.checkoutLongitude}</p>
                        )}
                        {viewTransport.checkoutNotes && <p><span className="font-medium">Observações:</span> {viewTransport.checkoutNotes}</p>}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {viewTransport.checkoutFrontalPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Frontal</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutFrontalPhoto)} alt="Frontal" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutLateral1Photo && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Lateral 1</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutLateral1Photo)} alt="Lateral 1" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutLateral2Photo && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Lateral 2</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutLateral2Photo)} alt="Lateral 2" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutTraseiraPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Traseira</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutTraseiraPhoto)} alt="Traseira" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutOdometerPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Hodômetro</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutOdometerPhoto)} alt="Hodômetro" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutFuelLevelPhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Combustível</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutFuelLevelPhoto)} alt="Combustível" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                        {viewTransport.checkoutSelfiePhoto && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Selfie</p>
                            <img src={normalizeImageUrl(viewTransport.checkoutSelfiePhoto)} alt="Selfie" className="h-16 w-16 rounded-md object-cover border" />
                          </div>
                        )}
                      </div>
                      {viewTransport.checkoutDamagePhotos && viewTransport.checkoutDamagePhotos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Fotos de Avarias ({viewTransport.checkoutDamagePhotos.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {viewTransport.checkoutDamagePhotos.map((photo, idx) => (
                              <img key={idx} src={normalizeImageUrl(photo)} alt={`Avaria ${idx + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                      Check-out não realizado
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTransport(null)}>
              Fechar
            </Button>
            <Button onClick={() => {
              if (viewTransport) navigate(`/transportes/${viewTransport.id}`);
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkinTransport} onOpenChange={() => setCheckinTransport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check-in - Retirada do Pátio</DialogTitle>
          </DialogHeader>
          {checkinTransport && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md text-sm">
                <p><strong>Solicitação:</strong> {checkinTransport.requestNumber}</p>
                <p><strong>Chassi:</strong> {checkinTransport.vehicleChassi}</p>
                <p><strong>Cliente:</strong> {checkinTransport.client?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    value={checkinData.latitude}
                    onChange={(e) => setCheckinData({ ...checkinData, latitude: e.target.value })}
                    placeholder="Latitude"
                    data-testid="input-checkin-lat"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    value={checkinData.longitude}
                    onChange={(e) => setCheckinData({ ...checkinData, longitude: e.target.value })}
                    placeholder="Longitude"
                    data-testid="input-checkin-lng"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getLocation(setCheckinData, checkinData)}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Obter Localização
              </Button>

              {/* Seção: Fotos do Veículo */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Veículo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <PhotoUpload
                    label="Frontal"
                    value={checkinData.frontalPhoto}
                    onChange={(url) => setCheckinData({ ...checkinData, frontalPhoto: url })}
                    testId="upload-checkin-frontal"
                  />
                  <PhotoUpload
                    label="Lateral 1"
                    value={checkinData.lateral1Photo}
                    onChange={(url) => setCheckinData({ ...checkinData, lateral1Photo: url })}
                    testId="upload-checkin-lateral1"
                  />
                  <PhotoUpload
                    label="Lateral 2"
                    value={checkinData.lateral2Photo}
                    onChange={(url) => setCheckinData({ ...checkinData, lateral2Photo: url })}
                    testId="upload-checkin-lateral2"
                  />
                  <PhotoUpload
                    label="Traseira"
                    value={checkinData.traseiraPhoto}
                    onChange={(url) => setCheckinData({ ...checkinData, traseiraPhoto: url })}
                    testId="upload-checkin-traseira"
                  />
                </div>
              </div>

              {/* Seção: Fotos do Painel */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Painel</h3>
                <div className="grid grid-cols-2 gap-3 justify-items-center">
                  <PhotoUpload
                    label="Foto do Odômetro"
                    value={checkinData.odometerPhoto}
                    onChange={(url) => setCheckinData({ ...checkinData, odometerPhoto: url })}
                    testId="upload-checkin-odometer"
                  />
                  <PhotoUpload
                    label="Nível de Combustível"
                    value={checkinData.fuelLevelPhoto}
                    onChange={(url) => setCheckinData({ ...checkinData, fuelLevelPhoto: url })}
                    testId="upload-checkin-fuel"
                  />
                </div>
              </div>

              {/* Seção: Avarias */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Avarias <span className="font-normal">({checkinData.damagePhotos.length}/10)</span>
                </h3>
                <MultiPhotoUpload
                  label=""
                  values={checkinData.damagePhotos}
                  onChange={(urls) => setCheckinData({ ...checkinData, damagePhotos: urls })}
                  testId="upload-checkin-damage"
                  maxPhotos={10}
                />
              </div>

              {/* Seção: Selfie */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Selfie do Motorista</h3>
                <PhotoUpload
                  label=""
                  value={checkinData.selfiePhoto}
                  onChange={(url) => setCheckinData({ ...checkinData, selfiePhoto: url })}
                  testId="upload-checkin-selfie"
                />
              </div>

              {/* Seção: Observações */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Observações</h3>
                <Textarea
                  value={checkinData.notes}
                  onChange={(e) => setCheckinData({ ...checkinData, notes: e.target.value })}
                  placeholder="Observações sobre o veículo..."
                  data-testid="input-checkin-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinTransport(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => checkinTransport && checkinMutation.mutate({ id: checkinTransport.id, data: checkinData })}
              disabled={checkinMutation.isPending}
              data-testid="button-confirm-checkin"
            >
              {checkinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutTransport} onOpenChange={() => setCheckoutTransport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check-out - Entrega ao Cliente</DialogTitle>
          </DialogHeader>
          {checkoutTransport && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md text-sm">
                <p><strong>Solicitação:</strong> {checkoutTransport.requestNumber}</p>
                <p><strong>Chassi:</strong> {checkoutTransport.vehicleChassi}</p>
                <p><strong>Cliente:</strong> {checkoutTransport.client?.name}</p>
                <p><strong>Local:</strong> {checkoutTransport.deliveryLocation?.name} - {checkoutTransport.deliveryLocation?.city}/{checkoutTransport.deliveryLocation?.state}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    value={checkoutData.latitude}
                    onChange={(e) => setCheckoutData({ ...checkoutData, latitude: e.target.value })}
                    placeholder="Latitude"
                    data-testid="input-checkout-lat"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    value={checkoutData.longitude}
                    onChange={(e) => setCheckoutData({ ...checkoutData, longitude: e.target.value })}
                    placeholder="Longitude"
                    data-testid="input-checkout-lng"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getLocation(setCheckoutData, checkoutData)}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Obter Localização
              </Button>

              {/* Seção: Fotos do Veículo */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Veículo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <PhotoUpload
                    label="Frontal"
                    value={checkoutData.frontalPhoto}
                    onChange={(url) => setCheckoutData({ ...checkoutData, frontalPhoto: url })}
                    testId="upload-checkout-frontal"
                  />
                  <PhotoUpload
                    label="Lateral 1"
                    value={checkoutData.lateral1Photo}
                    onChange={(url) => setCheckoutData({ ...checkoutData, lateral1Photo: url })}
                    testId="upload-checkout-lateral1"
                  />
                  <PhotoUpload
                    label="Lateral 2"
                    value={checkoutData.lateral2Photo}
                    onChange={(url) => setCheckoutData({ ...checkoutData, lateral2Photo: url })}
                    testId="upload-checkout-lateral2"
                  />
                  <PhotoUpload
                    label="Traseira"
                    value={checkoutData.traseiraPhoto}
                    onChange={(url) => setCheckoutData({ ...checkoutData, traseiraPhoto: url })}
                    testId="upload-checkout-traseira"
                  />
                </div>
              </div>

              {/* Seção: Fotos do Painel */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Painel</h3>
                <div className="grid grid-cols-2 gap-3 justify-items-center">
                  <PhotoUpload
                    label="Foto do Odômetro"
                    value={checkoutData.odometerPhoto}
                    onChange={(url) => setCheckoutData({ ...checkoutData, odometerPhoto: url })}
                    testId="upload-checkout-odometer"
                  />
                  <PhotoUpload
                    label="Nível de Combustível"
                    value={checkoutData.fuelLevelPhoto}
                    onChange={(url) => setCheckoutData({ ...checkoutData, fuelLevelPhoto: url })}
                    testId="upload-checkout-fuel"
                  />
                </div>
              </div>

              {/* Seção: Avarias */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Avarias <span className="font-normal">({checkoutData.damagePhotos.length}/10)</span>
                </h3>
                <MultiPhotoUpload
                  label=""
                  values={checkoutData.damagePhotos}
                  onChange={(urls) => setCheckoutData({ ...checkoutData, damagePhotos: urls })}
                  testId="upload-checkout-damage"
                  maxPhotos={10}
                />
              </div>

              {/* Seção: Selfie */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Selfie do Motorista</h3>
                <PhotoUpload
                  label=""
                  value={checkoutData.selfiePhoto}
                  onChange={(url) => setCheckoutData({ ...checkoutData, selfiePhoto: url })}
                  testId="upload-checkout-selfie"
                />
              </div>

              {/* Seção: Observações */}
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Observações</h3>
                <Textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                  placeholder="Observações sobre o veículo..."
                  data-testid="input-checkout-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutTransport(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => checkoutTransport && checkoutMutation.mutate({ id: checkoutTransport.id, data: checkoutData })}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clearCheckinId} onOpenChange={() => setClearCheckinId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este check-in? O transporte voltará ao status "Pendente" e o veículo voltará ao status "Em Estoque". Esta ação permitirá refazer o check-in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => clearCheckinId && clearCheckinMutation.mutate(clearCheckinId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clearCheckoutId} onOpenChange={() => setClearCheckoutId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Check-out</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este check-out? O transporte voltará ao status "Em Trânsito" e o veículo voltará ao status "Despachado". Esta ação permitirá refazer o check-out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => clearCheckoutId && clearCheckoutMutation.mutate(clearCheckoutId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Check-out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Novo Transporte */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Transporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo (Chassi) *</Label>
                <Select
                  value={newTransportData.vehicleChassi}
                  onValueChange={(value) => setNewTransportData(prev => ({ ...prev, vehicleChassi: value }))}
                >
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.chassi} value={vehicle.chassi}>
                        {vehicle.chassi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableVehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum veículo em estoque disponível</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Pátio de Origem *</Label>
                <Select
                  value={newTransportData.originYardId}
                  onValueChange={(value) => setNewTransportData(prev => ({ ...prev, originYardId: value }))}
                >
                  <SelectTrigger data-testid="select-origin-yard">
                    <SelectValue placeholder="Selecione o pátio" />
                  </SelectTrigger>
                  <SelectContent>
                    {yards?.map((yard) => (
                      <SelectItem key={yard.id} value={yard.id}>
                        {yard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={newTransportData.clientId}
                  onValueChange={(value) => setNewTransportData(prev => ({ 
                    ...prev, 
                    clientId: value, 
                    deliveryLocationId: "" 
                  }))}
                >
                  <SelectTrigger data-testid="select-client">
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
                  value={newTransportData.deliveryLocationId}
                  onValueChange={(value) => setNewTransportData(prev => ({ ...prev, deliveryLocationId: value }))}
                  disabled={!newTransportData.clientId}
                >
                  <SelectTrigger data-testid="select-delivery-location">
                    <SelectValue placeholder={newTransportData.clientId ? "Selecione o local" : "Selecione o cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientDeliveryLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} - {loc.city}/{loc.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newTransportData.clientId && clientDeliveryLocations.length === 0 && (
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
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">
                            * Baseado em consumo de 4 km/litro e diesel a R$ 6,50/litro
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRouteDetails(true)}
                            data-testid="button-view-route-details"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
                          </Button>
                        </div>
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
                  value={newTransportData.driverId}
                  onValueChange={(value) => setNewTransportData(prev => ({ ...prev, driverId: value }))}
                >
                  <SelectTrigger data-testid="select-driver">
                    <SelectValue placeholder="Selecione o motorista (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((driver) => (
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
                  value={newTransportData.deliveryDate}
                  onChange={(e) => setNewTransportData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  data-testid="input-delivery-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={newTransportData.notes}
                onChange={(e) => setNewTransportData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(newTransportData)}
              disabled={
                createMutation.isPending ||
                !newTransportData.vehicleChassi ||
                !newTransportData.clientId ||
                !newTransportData.originYardId ||
                !newTransportData.deliveryLocationId
              }
              data-testid="button-save-transport"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Details Dialog */}
      <Dialog open={showRouteDetails} onOpenChange={setShowRouteDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Detalhes da Rota
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre a rota calculada
            </DialogDescription>
          </DialogHeader>
          
          {routeSummary && (
            <div className="space-y-4">
              {/* Origin and Destination */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                  <MapPin className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">ORIGEM</p>
                    <p className="text-sm font-medium break-words">{routeSummary.originAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                  <MapPin className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">DESTINO</p>
                    <p className="text-sm font-medium break-words">{routeSummary.destinationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Route Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Distância</span>
                  </div>
                  <p className="text-lg font-bold">{routeSummary.distance.text}</p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tempo Estimado</span>
                  </div>
                  <p className="text-lg font-bold">{routeSummary.duration.text}</p>
                </div>
                
                {routeSummary.durationInTraffic && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-xs text-muted-foreground">Com Trânsito</span>
                    </div>
                    <p className="text-lg font-bold text-orange-600">{routeSummary.durationInTraffic.text}</p>
                  </div>
                )}
                
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Consumo Estimado</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {(routeSummary.distance.value / 1000 / 4).toFixed(1)} L
                  </p>
                  <p className="text-xs text-muted-foreground">Base: 4 km/litro</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Custos Estimados
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Combustível</span>
                    </div>
                    <span className="font-medium">R$ {routeSummary.fuelCost.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">
                        Pedágios{routeSummary.tollCost?.isEstimate ? " (est.)" : ""}
                      </span>
                    </div>
                    <span className="font-medium">
                      {routeSummary.tollCost 
                        ? `R$ ${parseFloat(routeSummary.tollCost.amount).toFixed(2)}`
                        : "Sem pedágios"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="font-medium">Total Estimado</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {(routeSummary.fuelCost + (routeSummary.tollCost ? parseFloat(routeSummary.tollCost.amount) : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-muted-foreground">
                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Observações:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Combustível calculado a R$ 6,50/litro (diesel)</li>
                    <li>Consumo base de 4 km/litro</li>
                    <li>Pedágios são estimativas para veículos comerciais</li>
                    <li>Valores podem variar conforme condições da viagem</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
