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
import { Plus, Search, Trash2, Loader2, Truck, MapPin, Calendar, User, Building, Clock, Camera, ImageIcon, ExternalLink, FileText, ChevronsUpDown, Check, CheckCircle } from "lucide-react";
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
import type { Collect, Manufacturer, Yard, Driver } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { cn } from "@/lib/utils";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

const newCollectFormSchema = z.object({
  vehicleChassi: z.string().min(17, "Chassi deve ter no mínimo 17 caracteres"),
  manufacturerId: z.string().min(1, "Montadora é obrigatória"),
  yardId: z.string().min(1, "Pátio de destino é obrigatório"),
  driverId: z.string().optional(),
  collectDate: z.string().optional(),
  notes: z.string().optional(),
});

type NewCollectFormData = z.infer<typeof newCollectFormSchema>;

export default function CollectsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("em_transito");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingCollect, setViewingCollect] = useState<CollectWithRelations | null>(null);
  const [finalizeId, setFinalizeId] = useState<string | null>(null);
  const [showNewCollectDialog, setShowNewCollectDialog] = useState(false);
  const [openManufacturer, setOpenManufacturer] = useState(false);
  const [openYard, setOpenYard] = useState(false);
  const [openDriver, setOpenDriver] = useState(false);
  const { toast } = useToast();

  const { data: collects, isLoading } = useQuery<CollectWithRelations[]>({
    queryKey: ["/api/collects"],
  });

  const { data: manufacturers } = useQuery<Manufacturer[]>({ queryKey: ["/api/manufacturers"] });
  const { data: yards } = useQuery<Yard[]>({ queryKey: ["/api/yards"] });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const activeDrivers = drivers?.filter((d) => d.isActive === "true" && d.isApto === "true");
  const activeManufacturers = manufacturers?.filter((m) => m.isActive === "true");
  const activeYards = yards?.filter((y) => y.isActive === "true");

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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Coleta registrada - Veículo adicionado ao estoque" });
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
    onError: () => {
      toast({ title: "Erro ao salvar coleta", variant: "destructive" });
    },
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

  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/collects/${id}`, { status: "finalizada" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Coleta finalizada com sucesso" });
      setFinalizeId(null);
    },
    onError: () => {
      toast({ title: "Erro ao finalizar coleta", variant: "destructive" });
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
          {c.status !== "finalizada" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="text-green-600 hover:bg-green-50 hover:text-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFinalizeId(c.id);
                  }}
                  data-testid={`button-finalize-${c.id}`}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Finalizar Coleta</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  disabled
                  data-testid={`button-finalized-${c.id}`}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Coleta Finalizada</TooltipContent>
            </Tooltip>
          )}
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
          <Button onClick={() => setShowNewCollectDialog(true)} data-testid="button-add-collect">
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

      <Dialog open={showNewCollectDialog} onOpenChange={setShowNewCollectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Registrar Nova Coleta
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para registrar uma nova coleta de veículo.
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
                        data-testid="input-chassi"
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
                            data-testid="select-manufacturer"
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
                                  <Check
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
                            data-testid="select-yard"
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
                                  <Check
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
                            data-testid="select-driver"
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
                                  <Check
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
                        data-testid="input-collect-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCollectDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCollectMutation.isPending}
                  data-testid="button-submit"
                >
                  {createCollectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Coleta
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!finalizeId} onOpenChange={() => setFinalizeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Coleta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar esta coleta? O status será alterado para "Finalizada".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finalizeId && finalizeMutation.mutate(finalizeId)}
              className="bg-green-600 hover:bg-green-700"
            >
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingCollect && (
        <CollectDetailDialog
          collect={viewingCollect}
          onClose={() => setViewingCollect(null)}
        />
      )}
    </div>
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
