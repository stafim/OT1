import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, LogIn, LogOut, Loader2, Truck, MapPin, Calendar, User, Building, Clock, Camera, ImageIcon, ExternalLink, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Collect } from "@shared/schema";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CollectWithRelations extends Collect {
  manufacturer?: { name: string };
  yard?: { name: string };
  driver?: { name: string };
  checkoutApprovedBy?: { firstName: string; lastName?: string; username: string };
}

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "em_transito", label: "Em Trânsito" },
  { value: "aguardando_checkout", label: "Aguardando Checkout" },
  { value: "finalizada", label: "Finalizada" },
];

function MapImage({ lat, lng, title }: { lat: string; lng: string; title: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          `/api/integrations/google-maps/static-image?lat=${lat}&lng=${lng}&zoom=15&size=600x200`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!response.ok) throw new Error("Failed to load map");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadMap();
  }, [lat, lng]);

  if (error) return null;
  if (loading) {
    return (
      <div className="rounded-md border h-[150px] flex items-center justify-center bg-muted/50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border">
      <img 
        src={imageSrc || ""}
        alt={`Mapa da localização do ${title}`}
        className="w-full h-[150px] object-cover"
      />
    </div>
  );
}

export default function CollectsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("em_transito");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkinCollect, setCheckinCollect] = useState<CollectWithRelations | null>(null);
  const [checkoutCollect, setCheckoutCollect] = useState<CollectWithRelations | null>(null);
  const [viewingCollect, setViewingCollect] = useState<CollectWithRelations | null>(null);
  const { toast } = useToast();

  const { data: collects, isLoading } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/collects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
      toast({ title: "Coleta excluída com sucesso" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir coleta", variant: "destructive" });
    },
  });

  const [generatingPDF, setGeneratingPDF] = useState(false);

  const loadImageWithDimensions = async (url: string): Promise<{ base64: string; width: number; height: number } | null> => {
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error("Failed to load image:", url, response.status);
        return null;
      }
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 1, height: 1 });
        img.src = base64;
      });
      
      return { base64, ...dimensions };
    } catch {
      return null;
    }
  };

  const generatePDF = async (collect: CollectWithRelations) => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      const addField = (label: string, value: string | undefined | null) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(value || "-", 70, y);
        y += 7;
      };

      const addSection = (title: string) => {
        y += 5;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(title, 20, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
      };

      const addPageHeader = (title: string) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title, pageWidth / 2, 15, { align: "center" });
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 20, pageWidth - 20, 20);
      };

      // Page 1: Information
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhes da Coleta", pageWidth / 2, y, { align: "center" });
      y += 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      addSection("Informações da Coleta");
      addField("Chassi", collect.vehicleChassi);
      addField("Status", collect.status === "em_transito" ? "Em Trânsito" : collect.status === "aguardando_checkout" ? "Aguardando Checkout" : collect.status === "finalizada" ? "Finalizada" : collect.status);
      addField("Data Coleta", collect.collectDate ? format(new Date(collect.collectDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-");
      addField("Criada em", collect.createdAt ? format(new Date(collect.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-");

      addSection("Origem e Destino");
      addField("Montadora", collect.manufacturer?.name);
      addField("Pátio", collect.yard?.name);
      addField("Motorista", collect.driver?.name);

      if (collect.notes) {
        addSection("Observações");
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(collect.notes, pageWidth - 40);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 5;
      }

      addSection("Check-in (Retirada)");
      addField("Data/Hora", collect.checkinDateTime ? format(new Date(collect.checkinDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não realizado");
      if (collect.checkinLatitude && collect.checkinLongitude) {
        addField("Localização", `${collect.checkinLatitude}, ${collect.checkinLongitude}`);
      } else {
        addField("Localização", "-");
      }
      addField("Observações", collect.checkinNotes || "-");

      addSection("Check-out (Entrega)");
      addField("Data/Hora", collect.checkoutDateTime ? format(new Date(collect.checkoutDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não realizado");
      if (collect.checkoutLatitude && collect.checkoutLongitude) {
        addField("Localização", `${collect.checkoutLatitude}, ${collect.checkoutLongitude}`);
      } else {
        addField("Localização", "-");
      }
      addField("Observações", collect.checkoutNotes || "-");

      // Footer page 1
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // Helper to add photos page
      const addPhotosPage = async (title: string, photos: { label: string; url: string | null | undefined }[]) => {
        const validPhotos = photos.filter(p => p.url);
        if (validPhotos.length === 0) return;

        doc.addPage();
        addPageHeader(title);

        const maxImgWidth = 80;
        const maxImgHeight = 80;
        const margin = 20;
        const cols = 2;
        let col = 0;
        let imgY = 30;

        for (const photo of validPhotos) {
          if (!photo.url) continue;
          
          const imageData = await loadImageWithDimensions(photo.url);
          if (!imageData) continue;

          // Calculate dimensions maintaining aspect ratio
          const aspectRatio = imageData.width / imageData.height;
          let finalWidth = maxImgWidth;
          let finalHeight = maxImgWidth / aspectRatio;
          
          if (finalHeight > maxImgHeight) {
            finalHeight = maxImgHeight;
            finalWidth = maxImgHeight * aspectRatio;
          }

          const x = margin + col * (maxImgWidth + 10);
          
          if (imgY + maxImgHeight + 15 > pageHeight - 20) {
            doc.addPage();
            addPageHeader(title + " (cont.)");
            imgY = 30;
            col = 0;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(photo.label, x, imgY);
          
          try {
            doc.addImage(imageData.base64, "JPEG", x, imgY + 2, finalWidth, finalHeight);
          } catch {
            doc.setFontSize(8);
            doc.text("Erro ao carregar", x, imgY + 30);
          }

          col++;
          if (col >= cols) {
            col = 0;
            imgY += maxImgHeight + 20;
          }
        }
      };

      // Check-in photos
      const checkinPhotosList = [
        { label: "Frontal", url: collect.checkinFrontalPhoto },
        { label: "Lateral 1", url: collect.checkinLateral1Photo },
        { label: "Lateral 2", url: collect.checkinLateral2Photo },
        { label: "Traseira", url: collect.checkinTraseiraPhoto },
        { label: "Odômetro", url: collect.checkinOdometerPhoto },
        { label: "Selfie", url: collect.checkinSelfiePhoto },
        ...(collect.checkinDamagePhotos || []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
      ];
      await addPhotosPage("Fotos Check-in (Retirada)", checkinPhotosList);

      // Check-out photos
      const checkoutPhotosList = [
        { label: "Frontal", url: collect.checkoutFrontalPhoto },
        { label: "Lateral 1", url: collect.checkoutLateral1Photo },
        { label: "Lateral 2", url: collect.checkoutLateral2Photo },
        { label: "Traseira", url: collect.checkoutTraseiraPhoto },
        { label: "Odômetro", url: collect.checkoutOdometerPhoto },
        { label: "Selfie", url: collect.checkoutSelfiePhoto },
        ...(collect.checkoutDamagePhotos || []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
      ];
      await addPhotosPage("Fotos Check-out (Entrega)", checkoutPhotosList);

      // Maps page - add Google Maps static images for check-in and check-out locations
      const hasCheckinLocation = collect.checkinLatitude && collect.checkinLongitude;
      const hasCheckoutLocation = collect.checkoutLatitude && collect.checkoutLongitude;
      
      if (hasCheckinLocation || hasCheckoutLocation) {
        doc.addPage();
        addPageHeader("Localização - Mapas");
        
        const mapWidth = 160;
        const mapHeight = 100;
        let mapY = 35;

        if (hasCheckinLocation) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Check-in (Retirada)", 20, mapY);
          mapY += 5;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Coordenadas: ${collect.checkinLatitude}, ${collect.checkinLongitude}`, 20, mapY);
          mapY += 5;
          
          try {
            const mapUrl = `/api/integrations/google-maps/static-image?lat=${collect.checkinLatitude}&lng=${collect.checkinLongitude}&zoom=15&size=640x400`;
            const mapData = await loadImageWithDimensions(mapUrl);
            if (mapData) {
              doc.addImage(mapData.base64, "PNG", 20, mapY, mapWidth, mapHeight);
            }
          } catch {
            doc.setFontSize(8);
            doc.text("Erro ao carregar mapa", 20, mapY + 20);
          }
          mapY += mapHeight + 15;
        }

        if (hasCheckoutLocation) {
          if (mapY + mapHeight + 30 > pageHeight - 20) {
            doc.addPage();
            addPageHeader("Localização - Mapas (cont.)");
            mapY = 35;
          }
          
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Check-out (Entrega)", 20, mapY);
          mapY += 5;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Coordenadas: ${collect.checkoutLatitude}, ${collect.checkoutLongitude}`, 20, mapY);
          mapY += 5;
          
          try {
            const mapUrl = `/api/integrations/google-maps/static-image?lat=${collect.checkoutLatitude}&lng=${collect.checkoutLongitude}&zoom=15&size=640x400`;
            const mapData = await loadImageWithDimensions(mapUrl);
            if (mapData) {
              doc.addImage(mapData.base64, "PNG", 20, mapY, mapWidth, mapHeight);
            }
          } catch {
            doc.setFontSize(8);
            doc.text("Erro ao carregar mapa", 20, mapY + 20);
          }
        }
      }

      doc.save(`coleta-${collect.vehicleChassi}.pdf`);
      toast({ title: "PDF gerado com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const filteredData = collects
    ?.filter((c) => {
      const matchesSearch =
        c.vehicleChassi.toLowerCase().includes(search.toLowerCase()) ||
        c.manufacturer?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Finalizadas primeiro
      if (a.status === "finalizada" && b.status !== "finalizada") return -1;
      if (a.status !== "finalizada" && b.status === "finalizada") return 1;
      return 0;
    });

  const columns = [
    {
      key: "status",
      label: "Status",
      render: (c: CollectWithRelations) => <StatusBadge status={c.status} />,
    },
    { key: "vehicleChassi", label: "Chassi" },
    {
      key: "manufacturer",
      label: "Origem (Montadora)",
      render: (c: CollectWithRelations) => c.manufacturer?.name || "-",
    },
    {
      key: "yard",
      label: "Destino (Pátio)",
      render: (c: CollectWithRelations) => c.yard?.name || "-",
    },
    {
      key: "driver",
      label: "Motorista",
      render: (c: CollectWithRelations) => c.driver?.name || "-",
    },
    {
      key: "collectDate",
      label: "Data Coleta",
      render: (c: CollectWithRelations) =>
        c.collectDate ? format(new Date(c.collectDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
    },
    {
      key: "createdAt",
      label: "Criada em",
      render: (c: CollectWithRelations) =>
        c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
    },
    {
      key: "actions",
      label: "",
      className: "w-40",
      render: (c: CollectWithRelations) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={c.checkinDateTime ? "default" : "outline"}
                className={c.checkinDateTime ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setCheckinCollect(c);
                }}
                data-testid={`button-checkin-${c.id}`}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {c.checkinDateTime ? "Check-in Realizado" : "Fazer Check-in"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={c.checkoutDateTime ? "default" : "outline"}
                className={c.checkoutDateTime ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setCheckoutCollect(c);
                }}
                data-testid={`button-checkout-${c.id}`}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {c.checkoutDateTime ? "Check-out Realizado" : "Fazer Check-out"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  generatePDF(c);
                }}
                data-testid={`button-pdf-${c.id}`}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar PDF</TooltipContent>
          </Tooltip>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(c.id);
            }}
            data-testid={`button-delete-${c.id}`}
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
        title="Coletas"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Coletas" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por chassi ou montadora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-collects"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate("/coletas/novo")} data-testid="button-add-collect">
            <Plus className="mr-2 h-4 w-4" />
            Nova Coleta
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="id"
          onRowClick={(c) => setViewingCollect(c)}
          emptyMessage="Nenhuma coleta encontrada"
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta coleta? Esta ação não pode ser desfeita.
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

      {checkinCollect && (
        <CheckInOutModal
          collect={checkinCollect}
          type="checkin"
          onClose={() => setCheckinCollect(null)}
        />
      )}

      {checkoutCollect && (
        <CheckInOutModal
          collect={checkoutCollect}
          type="checkout"
          onClose={() => setCheckoutCollect(null)}
        />
      )}

      {viewingCollect && (
        <CollectDetailDialog
          collect={viewingCollect}
          onClose={() => setViewingCollect(null)}
        />
      )}
    </div>
  );
}

interface SinglePhotoUploadProps {
  label: string;
  photo: string;
  setPhoto: (val: string) => void;
  onView: (photo: string) => void;
  isCompleted: boolean;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function SinglePhotoUpload({ label, photo, setPhoto, onView, isCompleted, isUploading, onUpload }: SinglePhotoUploadProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-sm font-medium text-center">{label}</label>
      {photo ? (
        <div className="relative">
          <img 
            src={photo} 
            alt={label} 
            className="h-20 w-20 rounded-lg object-cover border-2 cursor-pointer hover:opacity-80 transition-opacity shadow-sm" 
            onClick={() => onView(photo)}
          />
          {!isCompleted && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
              onClick={() => setPhoto("")}
            >
              <span className="text-[10px]">X</span>
            </Button>
          )}
        </div>
      ) : (
        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={isUploading || isCompleted}
          />
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Plus className="h-6 w-6 text-primary/50" />}
        </label>
      )}
    </div>
  );
}

interface CheckInOutModalProps {
  collect: CollectWithRelations;
  type: "checkin" | "checkout";
  onClose: () => void;
}

function CheckInOutModal({ collect, type, onClose }: CheckInOutModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [frontalPhoto, setFrontalPhoto] = useState(
    type === "checkin" ? collect.checkinFrontalPhoto || "" : collect.checkoutFrontalPhoto || ""
  );
  const [lateral1Photo, setLateral1Photo] = useState(
    type === "checkin" ? collect.checkinLateral1Photo || "" : collect.checkoutLateral1Photo || ""
  );
  const [lateral2Photo, setLateral2Photo] = useState(
    type === "checkin" ? collect.checkinLateral2Photo || "" : collect.checkoutLateral2Photo || ""
  );
  const [traseiraPhoto, setTraseiraPhoto] = useState(
    type === "checkin" ? collect.checkinTraseiraPhoto || "" : collect.checkoutTraseiraPhoto || ""
  );
  const [odometerPhoto, setOdometerPhoto] = useState(
    type === "checkin" ? collect.checkinOdometerPhoto || "" : collect.checkoutOdometerPhoto || ""
  );
  const [fuelLevelPhoto, setFuelLevelPhoto] = useState(
    type === "checkin" ? collect.checkinFuelLevelPhoto || "" : collect.checkoutFuelLevelPhoto || ""
  );
  const [damagePhotos, setDamagePhotos] = useState<string[]>(
    type === "checkin" ? collect.checkinDamagePhotos || [] : collect.checkoutDamagePhotos || []
  );
  const [selfiePhoto, setSelfiePhoto] = useState(
    type === "checkin" ? collect.checkinSelfiePhoto || "" : collect.checkoutSelfiePhoto || ""
  );
  const [notes, setNotes] = useState(
    type === "checkin" ? collect.checkinNotes || "" : collect.checkoutNotes || ""
  );
  const [latitude, setLatitude] = useState(
    type === "checkin" ? collect.checkinLatitude || "" : collect.checkoutLatitude || ""
  );
  const [longitude, setLongitude] = useState(
    type === "checkin" ? collect.checkinLongitude || "" : collect.checkoutLongitude || ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const isCompleted = type === "checkin" ? !!collect.checkinDateTime : !!collect.checkoutDateTime;
  const title = type === "checkin" ? "Check-in (Retirada)" : "Check-out (Entrega)";

  const mutation = useMutation({
    mutationFn: async () => {
      const data = type === "checkin" ? {
        checkinDateTime: new Date().toISOString(),
        checkinLatitude: latitude,
        checkinLongitude: longitude,
        checkinFrontalPhoto: frontalPhoto,
        checkinLateral1Photo: lateral1Photo,
        checkinLateral2Photo: lateral2Photo,
        checkinTraseiraPhoto: traseiraPhoto,
        checkinOdometerPhoto: odometerPhoto,
        checkinFuelLevelPhoto: fuelLevelPhoto,
        checkinDamagePhotos: damagePhotos,
        checkinSelfiePhoto: selfiePhoto,
        checkinNotes: notes,
      } : {
        checkoutDateTime: new Date().toISOString(),
        checkoutLatitude: latitude,
        checkoutLongitude: longitude,
        checkoutApprovedById: user?.id,
        checkoutFrontalPhoto: frontalPhoto,
        checkoutLateral1Photo: lateral1Photo,
        checkoutLateral2Photo: lateral2Photo,
        checkoutTraseiraPhoto: traseiraPhoto,
        checkoutOdometerPhoto: odometerPhoto,
        checkoutFuelLevelPhoto: fuelLevelPhoto,
        checkoutDamagePhotos: damagePhotos,
        checkoutSelfiePhoto: selfiePhoto,
        checkoutNotes: notes,
      };
      return apiRequest("PATCH", `/api/collects/${collect.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
      toast({ title: `${type === "checkin" ? "Check-in" : "Check-out"} realizado com sucesso` });
      onClose();
    },
    onError: () => {
      toast({ title: `Erro ao realizar ${type === "checkin" ? "check-in" : "check-out"}`, variant: "destructive" });
    },
  });

  const uploadPhoto = async (file: File): Promise<string> => {
    try {
      // Try Object Storage first
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!response.ok) throw new Error("Object Storage unavailable");
      const { uploadURL, objectPath } = await response.json();
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      return objectPath;
    } catch {
      // Fallback to local upload
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
      return objectPath;
    }
  };

  const handleSingleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const path = await uploadPhoto(file);
      setter(path);
      toast({ title: "Foto enviada" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMultiUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    current: string[],
    setter: (val: string[]) => void,
    max: number
  ) => {
    const file = e.target.files?.[0];
    if (!file || current.length >= max) return;
    setIsUploading(true);
    try {
      const path = await uploadPhoto(file);
      setter([...current, path]);
      toast({ title: "Foto enviada" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Chassi: <span className="font-medium">{collect.vehicleChassi}</span> | 
            Motorista: <span className="font-medium">{collect.driver?.name || "-"}</span>
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {isCompleted && (
            <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300 my-4">
              {type === "checkin" ? "Check-in" : "Check-out"} já foi realizado para esta coleta.
            </div>
          )}

          <div className="space-y-6 py-4">
            {/* Seção: Localização */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Localização</h3>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-25.4284"
                    className="w-full rounded-md border p-2 bg-background text-sm"
                    disabled={isCompleted}
                    data-testid="input-modal-latitude"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Longitude</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-49.2733"
                    className="w-full rounded-md border p-2 bg-background text-sm"
                    disabled={isCompleted}
                    data-testid="input-modal-longitude"
                  />
                </div>
              </div>
            </div>

            {/* Seção: Fotos do Veículo */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Veículo</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Foto Frontal */}
                <SinglePhotoUpload
                  label="Frontal"
                  photo={frontalPhoto}
                  setPhoto={setFrontalPhoto}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setFrontalPhoto)}
                />
                {/* Foto Lateral 1 */}
                <SinglePhotoUpload
                  label="Lateral 1"
                  photo={lateral1Photo}
                  setPhoto={setLateral1Photo}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setLateral1Photo)}
                />
                {/* Foto Lateral 2 */}
                <SinglePhotoUpload
                  label="Lateral 2"
                  photo={lateral2Photo}
                  setPhoto={setLateral2Photo}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setLateral2Photo)}
                />
                {/* Foto Traseira */}
                <SinglePhotoUpload
                  label="Traseira"
                  photo={traseiraPhoto}
                  setPhoto={setTraseiraPhoto}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setTraseiraPhoto)}
                />
              </div>
            </div>

            {/* Seção: Fotos do Painel */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Fotos do Painel</h3>
              <div className="grid grid-cols-2 gap-4 justify-items-center">
                <SinglePhotoUpload
                  label="Foto do Odômetro"
                  photo={odometerPhoto}
                  setPhoto={setOdometerPhoto}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setOdometerPhoto)}
                />
                <SinglePhotoUpload
                  label="Nível de Combustível"
                  photo={fuelLevelPhoto}
                  setPhoto={setFuelLevelPhoto}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setFuelLevelPhoto)}
                />
              </div>
            </div>

            {/* Seção: Avarias */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Avarias <span className="text-muted-foreground font-normal">({damagePhotos.length}/10)</span></h3>
              <div className="flex flex-wrap gap-3">
                {damagePhotos.map((photo, i) => (
                  <div key={i} className="relative">
                    <img 
                      src={photo} 
                      alt={`Avaria ${i + 1}`} 
                      className="h-20 w-20 rounded-lg object-cover border-2 border-orange-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm" 
                      onClick={() => setViewingPhoto(photo)}
                    />
                    {!isCompleted && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
                        onClick={() => setDamagePhotos(damagePhotos.filter((_, idx) => idx !== i))}
                      >
                        <span className="text-[10px]">X</span>
                      </Button>
                    )}
                  </div>
                ))}
                {damagePhotos.length < 10 && !isCompleted && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-orange-300/50 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleMultiUpload(e, damagePhotos, setDamagePhotos, 10)}
                      disabled={isUploading}
                    />
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6 text-orange-400" />}
                  </label>
                )}
              </div>
            </div>

            {/* Seção: Selfie */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Selfie do Motorista</h3>
              <div className="flex justify-center">
                <SinglePhotoUpload
                  label="Selfie"
                  photo={selfiePhoto}
                  setPhoto={setSelfiePhoto}
                  onView={setViewingPhoto}
                  isCompleted={isCompleted}
                  isUploading={isUploading}
                  onUpload={(e) => handleSingleUpload(e, setSelfiePhoto)}
                />
              </div>
            </div>

            {/* Seção: Observações */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Observações</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva avarias ou observações..."
                className="w-full rounded-md border p-2 min-h-[80px] bg-background text-sm"
                disabled={isCompleted}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {isCompleted ? "Fechar" : "Cancelar"}
          </Button>
          {!isCompleted && (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Realizar {type === "checkin" ? "Check-in" : "Check-out"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {viewingPhoto && (
      <Dialog open onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <div className="flex items-center justify-center">
            <img 
              src={viewingPhoto} 
              alt="Foto em tamanho real" 
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

interface CollectDetailDialogProps {
  collect: CollectWithRelations;
  onClose: () => void;
}

function CollectDetailDialog({ collect, onClose }: CollectDetailDialogProps) {
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || "-"}</p>
      </div>
    </div>
  );

  const PhotoCard = ({ src, label }: { src: string; label: string }) => (
    <button
      onClick={() => setViewingPhoto(normalizeImageUrl(src))}
      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover-elevate transition-all"
    >
      <img src={normalizeImageUrl(src)} alt={label} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <p className="text-[10px] text-white font-medium truncate">{label}</p>
      </div>
    </button>
  );

  const EmptyPhotoSlot = ({ label }: { label: string }) => (
    <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 bg-muted/30">
      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
      <p className="text-[10px] text-muted-foreground/60">{label}</p>
    </div>
  );

  const PhotoSection = ({ type }: { type: "checkin" | "checkout" }) => {
    const title = type === "checkin" ? "Check-in (Retirada)" : "Check-out (Entrega)";
    const dateTime = type === "checkin" ? collect.checkinDateTime : collect.checkoutDateTime;
    const latitude = type === "checkin" ? collect.checkinLatitude : collect.checkoutLatitude;
    const longitude = type === "checkin" ? collect.checkinLongitude : collect.checkoutLongitude;
    const notes = type === "checkin" ? collect.checkinNotes : collect.checkoutNotes;
    
    const frontalPhoto = type === "checkin" ? collect.checkinFrontalPhoto : collect.checkoutFrontalPhoto;
    const lateral1Photo = type === "checkin" ? collect.checkinLateral1Photo : collect.checkoutLateral1Photo;
    const lateral2Photo = type === "checkin" ? collect.checkinLateral2Photo : collect.checkoutLateral2Photo;
    const traseiraPhoto = type === "checkin" ? collect.checkinTraseiraPhoto : collect.checkoutTraseiraPhoto;
    const odometerPhoto = type === "checkin" ? collect.checkinOdometerPhoto : collect.checkoutOdometerPhoto;
    const fuelLevelPhoto = type === "checkin" ? collect.checkinFuelLevelPhoto : collect.checkoutFuelLevelPhoto;
    const selfiePhoto = type === "checkin" ? collect.checkinSelfiePhoto : collect.checkoutSelfiePhoto;
    const damagePhotos = type === "checkin" ? collect.checkinDamagePhotos : collect.checkoutDamagePhotos;

    if (!dateTime) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Camera className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">{title} ainda não realizado</p>
        </div>
      );
    }

    const hasVehiclePhotos = frontalPhoto || lateral1Photo || lateral2Photo || traseiraPhoto;
    const hasOtherPhotos = odometerPhoto || fuelLevelPhoto || selfiePhoto;
    const hasDamagePhotos = damagePhotos && damagePhotos.length > 0;

    const approvedUser = type === "checkout" && collect.checkoutApprovedBy ? 
      `${collect.checkoutApprovedBy.firstName || ''} ${collect.checkoutApprovedBy.lastName || ''}`.trim() || collect.checkoutApprovedBy.username 
      : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(dateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          {type === "checkout" && approvedUser && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Aprovado por: <strong>{approvedUser}</strong></span>
            </div>
          )}
          {latitude && longitude && (
            <a
              href={`https://maps.google.com/?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              Ver no Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        
        {latitude && longitude && (
          <MapImage lat={latitude} lng={longitude} title={title} />
        )}

        {hasVehiclePhotos && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Fotos do Veículo</p>
            <div className="grid grid-cols-4 gap-2">
              {frontalPhoto ? <PhotoCard src={frontalPhoto} label="Frontal" /> : <EmptyPhotoSlot label="Frontal" />}
              {lateral1Photo ? <PhotoCard src={lateral1Photo} label="Lateral 1" /> : <EmptyPhotoSlot label="Lateral 1" />}
              {lateral2Photo ? <PhotoCard src={lateral2Photo} label="Lateral 2" /> : <EmptyPhotoSlot label="Lateral 2" />}
              {traseiraPhoto ? <PhotoCard src={traseiraPhoto} label="Traseira" /> : <EmptyPhotoSlot label="Traseira" />}
            </div>
          </div>
        )}

        {(hasOtherPhotos || hasDamagePhotos) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Registros Adicionais</p>
            <div className="grid grid-cols-5 gap-2">
              {odometerPhoto && <PhotoCard src={odometerPhoto} label="Odômetro" />}
              {fuelLevelPhoto && <PhotoCard src={fuelLevelPhoto} label="Combustível" />}
              {selfiePhoto && <PhotoCard src={selfiePhoto} label="Selfie" />}
              {damagePhotos && damagePhotos.map((photo: string, i: number) => (
                <PhotoCard key={i} src={photo} label={`Avaria ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        {!hasVehiclePhotos && !hasOtherPhotos && !hasDamagePhotos && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma foto registrada</p>
          </div>
        )}

        {notes && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
            <p className="text-sm bg-muted/50 rounded-md p-2">{notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="flex-shrink-0 p-4 pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">{collect.vehicleChassi}</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={collect.status} />
                  {collect.collectDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(collect.collectDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Building} label="Origem" value={collect.manufacturer?.name || "-"} />
                <InfoItem icon={MapPin} label="Destino" value={collect.yard?.name || "-"} />
                <InfoItem icon={User} label="Motorista" value={collect.driver?.name || "-"} />
                <InfoItem icon={Calendar} label="Criada em" value={collect.createdAt ? format(new Date(collect.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"} />
              </div>

              {collect.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observações Gerais</p>
                  <p className="text-sm">{collect.notes}</p>
                </div>
              )}

              <Separator />

              <Tabs defaultValue="checkin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="checkin" className="gap-1.5 text-sm">
                    <Camera className="h-3.5 w-3.5" />
                    Check-in
                    {collect.checkinDateTime && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">OK</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="checkout" className="gap-1.5 text-sm">
                    <Camera className="h-3.5 w-3.5" />
                    Check-out
                    {collect.checkoutDateTime && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">OK</Badge>}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="checkin" className="mt-4">
                  <PhotoSection type="checkin" />
                </TabsContent>
                <TabsContent value="checkout" className="mt-4">
                  <PhotoSection type="checkout" />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-4 pt-3 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewingPhoto && (
        <Dialog open onOpenChange={() => setViewingPhoto(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
            <div className="flex items-center justify-center">
              <img 
                src={viewingPhoto} 
                alt="Foto em tamanho real" 
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
