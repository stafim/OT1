import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, LogIn, LogOut, MapPin, Loader2, Camera, Upload, X, CheckCircle, XCircle, Eye } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transport } from "@shared/schema";
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
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");

      const { signedUrl, objectPath } = await response.json();

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const publicUrl = `/api/object-storage${objectPath}`;
      onChange(publicUrl);
    } catch (error) {
      console.error("Upload failed:", error);
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
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");

      const { signedUrl, objectPath } = await response.json();

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const publicUrl = `/api/object-storage/${encodeURIComponent(objectPath)}`;
      onChange([...values, publicUrl]);
    } catch (error) {
      console.error("Upload failed:", error);
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkinTransport, setCheckinTransport] = useState<TransportWithRelations | null>(null);
  const [checkoutTransport, setCheckoutTransport] = useState<TransportWithRelations | null>(null);
  const [checkinData, setCheckinData] = useState<CheckFormData>(initialCheckFormData);
  const [checkoutData, setCheckoutData] = useState<CheckFormData>(initialCheckFormData);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [clearCheckinId, setClearCheckinId] = useState<string | null>(null);
  const [clearCheckoutId, setClearCheckoutId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: transports, isLoading } = useQuery<TransportWithRelations[]>({
    queryKey: ["/api/transports"],
  });

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

  const filteredData = transports?.filter(
    (t) =>
      t.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicleChassi.toLowerCase().includes(search.toLowerCase()) ||
      t.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <Button onClick={() => navigate("/transportes/novo")} data-testid="button-add-transport">
            <Plus className="mr-2 h-4 w-4" />
            Novo Transporte
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="id"
          onRowClick={(t) => navigate(`/transportes/${t.id}`)}
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
    </div>
  );
}
