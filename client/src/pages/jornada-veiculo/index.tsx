import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search,
  Printer,
  Truck,
  Warehouse,
  Package,
  CheckCircle2,
  Camera,
  MapPin,
  Calendar,
  User,
  FileText,
  Clock,
  Car,
  Loader2,
  ChevronDown,
  ChevronUp,
  Factory,
  ArrowRight,
  Route,
  Flag,
  FuelIcon,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type VehicleJourney = {
  vehicle: {
    chassi: string;
    status: string;
    color?: string | null;
    notes?: string | null;
    collectDateTime?: string | null;
    yardEntryDateTime?: string | null;
    dispatchDateTime?: string | null;
    deliveryDateTime?: string | null;
    manufacturer?: { id: number; name: string } | null;
    yard?: { id: number; name: string; city?: string | null; state?: string | null } | null;
    client?: { id: number; name: string } | null;
  };
  collects: Array<{
    id: string;
    status: string;
    collectDate?: string | null;
    checkinLatitude?: string | null;
    checkinLongitude?: string | null;
    checkoutLatitude?: string | null;
    checkoutLongitude?: string | null;
    checkinFrontalPhoto?: string | null;
    checkinLateral1Photo?: string | null;
    checkinLateral2Photo?: string | null;
    checkinTraseiraPhoto?: string | null;
    checkinOdometerPhoto?: string | null;
    checkinFuelLevelPhoto?: string | null;
    checkinDamagePhotos?: string[] | null;
    checkinSelfiePhoto?: string | null;
    checkoutFrontalPhoto?: string | null;
    checkoutLateral1Photo?: string | null;
    checkoutLateral2Photo?: string | null;
    checkoutTraseiraPhoto?: string | null;
    checkoutOdometerPhoto?: string | null;
    checkoutFuelLevelPhoto?: string | null;
    checkoutDamagePhotos?: string[] | null;
    checkoutSelfiePhoto?: string | null;
    manufacturer?: { id: number; name: string } | null;
    yard?: { id: number; name: string; city?: string | null; state?: string | null } | null;
    driver?: { id: number; firstName: string; lastName: string } | null;
  }>;
  transports: Array<{
    id: string;
    requestNumber?: string | null;
    status: string;
    routeDistanceKm?: number | null;
    routeDurationMinutes?: number | null;
    estimatedTolls?: string | null;
    estimatedFuel?: string | null;
    checkinLatitude?: string | null;
    checkinLongitude?: string | null;
    checkoutLatitude?: string | null;
    checkoutLongitude?: string | null;
    checkinFrontalPhoto?: string | null;
    checkinLateral1Photo?: string | null;
    checkinLateral2Photo?: string | null;
    checkinTraseiraPhoto?: string | null;
    checkinOdometerPhoto?: string | null;
    checkinFuelLevelPhoto?: string | null;
    checkinDamagePhotos?: string[] | null;
    checkinSelfiePhoto?: string | null;
    checkoutFrontalPhoto?: string | null;
    checkoutLateral1Photo?: string | null;
    checkoutLateral2Photo?: string | null;
    checkoutTraseiraPhoto?: string | null;
    checkoutOdometerPhoto?: string | null;
    checkoutFuelLevelPhoto?: string | null;
    checkoutDamagePhotos?: string[] | null;
    checkoutSelfiePhoto?: string | null;
    originYard?: { id: number; name: string; city?: string | null; state?: string | null } | null;
    deliveryLocation?: { id: string; name: string; address?: string | null; addressNumber?: string | null; city?: string | null; state?: string | null } | null;
    driver?: { id: number; firstName: string; lastName: string } | null;
    client?: { id: number; name: string } | null;
    deliveryDate?: string | null;
  }>;
};

type VehicleItem = {
  chassi: string;
  status: string;
  manufacturer?: { name: string } | null;
  client?: { name: string } | null;
};

const vehicleStatusConfig: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pre_estoque: { label: "Aguardando Coleta", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-400" },
  em_estoque:  { label: "No Pátio",          color: "text-blue-700 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-800",  dot: "bg-blue-400" },
  despachado:  { label: "Em Trânsito",        color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-400" },
  entregue:    { label: "Entregue",           color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", dot: "bg-green-400" },
  retirado:    { label: "Retirado",           color: "text-gray-700 dark:text-gray-400",  bg: "bg-gray-50 dark:bg-gray-950/30",  border: "border-gray-200 dark:border-gray-800",  dot: "bg-gray-400" },
  em_transferencia: { label: "Em Transferência", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", dot: "bg-purple-400" },
};

const collectStatusLabel: Record<string, string> = {
  em_transito: "Em Trânsito",
  aguardando_checkout: "Aguard. Check-out",
  finalizada: "Finalizada",
};

const transportStatusLabel: Record<string, string> = {
  pendente: "Pendente",
  aguardando_saida: "Aguard. Saída",
  em_transito: "Em Trânsito",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function fmtDate(val?: string | null) {
  if (!val) return "—";
  try { return format(new Date(val), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return val; }
}

function fmtDateOnly(val?: string | null) {
  if (!val) return "—";
  try { return format(new Date(val), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return val; }
}

function InfoItem({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-2">{value}</a>
        ) : (
          <p className="text-sm font-semibold text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function PhotoGallery({ photos, title }: { photos: { label: string; url: string | null | undefined }[]; title?: string }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const valid = photos.filter((p) => p.url);

  return (
    <div>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
          <Camera className="h-3.5 w-3.5" />
          {title}
        </p>
      )}
      {valid.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm text-muted-foreground">
          <Camera className="h-4 w-4 opacity-50" />
          Sem fotos registradas
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {valid.map((p) => (
              <button
                key={p.label}
                data-testid={`photo-${p.label.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => setViewing(normalizeImageUrl(p.url))}
                className="group relative aspect-square overflow-hidden rounded-xl border-2 border-transparent bg-muted transition-all hover:border-primary hover:shadow-md"
              >
                <img src={normalizeImageUrl(p.url)} alt={p.label} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 translate-y-full p-1.5 transition-transform group-hover:translate-y-0">
                  <p className="truncate text-center text-[9px] font-medium text-white">{p.label}</p>
                </div>
              </button>
            ))}
          </div>
          {viewing && (
            <Dialog open onOpenChange={() => setViewing(null)}>
              <DialogContent className="max-w-3xl p-2 bg-black/95">
                <img src={viewing} alt="Foto ampliada" className="w-full rounded-lg object-contain max-h-[82vh]" />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}

function StepNode({ done, active, icon: Icon, step }: { done: boolean; active: boolean; icon: React.ElementType; step: number }) {
  return (
    <div className={cn(
      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-all",
      done   && "border-green-500 bg-green-500 text-white shadow-green-200 dark:shadow-green-900",
      active && "border-primary bg-primary text-primary-foreground shadow-primary/30",
      !done && !active && "border-border bg-background text-muted-foreground"
    )}>
      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
    </div>
  );
}

export default function JornadaVeiculoPage() {
  const [search, setSearch] = useState("");
  const [selectedChassi, setSelectedChassi] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ coleta: true });

  const { data: vehiclesList } = useQuery<VehicleItem[]>({ queryKey: ["/api/vehicles"] });
  const { data: transportsList } = useQuery<Array<{ vehicleChassi: string; status: string }>>({ queryKey: ["/api/transports"] });
  const { data: journey, isLoading: journeyLoading } = useQuery<VehicleJourney>({
    queryKey: ["/api/vehicle-journey", selectedChassi],
    enabled: !!selectedChassi,
  });

  const [pdfGenerating, setPdfGenerating] = useState(false);

  const deliveredChassiSet = new Set(
    (transportsList ?? []).filter((t) => t.status === "entregue").map((t) => t.vehicleChassi)
  );

  const filteredVehicles = (vehiclesList ?? []).filter((v) => {
    if (!deliveredChassiSet.has(v.chassi)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      v.chassi.toLowerCase().includes(q) ||
      (v.manufacturer?.name ?? "").toLowerCase().includes(q) ||
      (v.client?.name ?? "").toLowerCase().includes(q)
    );
  });

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handlePrint() {
    if (!journey || !v) return;
    setPdfGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297, margin = 18, contentW = pageW - margin * 2;
      const orange: [number, number, number] = [234, 88, 12];
      const darkGray: [number, number, number] = [30, 30, 30];
      const medGray: [number, number, number] = [100, 100, 100];
      const lightGray: [number, number, number] = [245, 245, 245];
      const white: [number, number, number] = [255, 255, 255];
      const green: [number, number, number] = [22, 163, 74];
      const blue: [number, number, number] = [37, 99, 235];
      const yellow: [number, number, number] = [202, 138, 4];
      let y = 0, pageNum = 1;

      const checkPageBreak = (h: number) => {
        if (y + h > pageH - 15) { doc.addPage(); pageNum++; drawFooter(); y = 15; }
      };
      const drawFooter = () => {
        doc.setFontSize(8); doc.setTextColor(...medGray); doc.setFont("helvetica", "normal");
        doc.text(`OTD Logistics — Dossiê do Veículo — ${v!.chassi}`, margin, pageH - 8);
        doc.text(`Pág. ${pageNum}`, pageW - margin, pageH - 8, { align: "right" });
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      };
      const drawSection = (title: string) => {
        checkPageBreak(14);
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...orange);
        doc.text(title.toUpperCase(), margin, y);
        doc.setDrawColor(...orange); doc.setLineWidth(0.4);
        doc.line(margin, y + 1.5, margin + contentW, y + 1.5);
        y += 8;
      };
      const drawField = (label: string, value: string, x: number, fw: number) => {
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...medGray);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...darkGray);
        const max = Math.floor(fw / 2.2);
        doc.text(value.length > max ? value.slice(0, max - 1) + "…" : value, x, y + 5);
      };
      const sColor = (s: string): [number, number, number] =>
        (s === "entregue" || s === "retirado") ? green : (s === "em_transito" || s === "despachado" || s === "em_estoque") ? blue : yellow;

      doc.setFillColor(...orange);
      doc.rect(0, 0, pageW, 42, "F");
      try {
        const img = new Image(); img.crossOrigin = "anonymous";
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = "/logo-otd.png"; });
        if (img.complete && img.naturalWidth > 0) {
          const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
          const ctx = cv.getContext("2d"); if (ctx) { ctx.drawImage(img, 0, 0); const ar = img.naturalWidth / img.naturalHeight;
            const lh = 26; doc.addImage(cv.toDataURL("image/png"), "PNG", margin, 8, lh * ar, lh); }
        }
      } catch {}
      doc.setFontSize(13); doc.setTextColor(...white); doc.setFont("helvetica", "bold");
      doc.text("DOSSIÊ DO VEÍCULO", pageW - margin, 16, { align: "right" });
      doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
      doc.text("Jornada Completa — OTD Logistics", pageW - margin, 23, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Emitido: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin, 30, { align: "right" });
      y = 52;

      drawSection("Identificação do Veículo");
      doc.setFillColor(...lightGray); doc.roundedRect(margin, y - 3, contentW, 18, 2, 2, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...medGray);
      doc.text("CHASSI", margin + 4, y + 2);
      doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...darkGray);
      doc.text(v.chassi, margin + 4, y + 10);
      const sc = sColor(v.status); doc.setFillColor(...sc);
      doc.roundedRect(pageW - margin - 40, y - 1, 40, 10, 2, 2, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...white);
      doc.text(vehicleStatusConfig[v.status]?.label ?? v.status, pageW - margin - 20, y + 5.5, { align: "center" });
      y += 23;
      const cw4 = contentW / 4;
      drawField("Montadora", v.manufacturer?.name ?? "—", margin, cw4);
      drawField("Cliente", v.client?.name ?? "—", margin + cw4, cw4);
      drawField("Cor", v.color ?? "—", margin + cw4 * 2, cw4);
      drawField("Pátio", v.yard?.name ?? "—", margin + cw4 * 3, cw4);
      y += 14;

      drawSection("Linha do Tempo");
      const steps = ["Coleta", "Pátio", "Transporte", "Entrega"];
      const stepMap: Record<string, number> = { pre_estoque: 0, em_estoque: 1, despachado: 2, entregue: 3, retirado: 3 };
      const cur = stepMap[v.status] ?? 0;
      const sw = contentW / steps.length;
      steps.forEach((s, i) => {
        const cx = margin + sw * i + sw / 2;
        const done = cur > i, active = cur === i;
        doc.setFillColor(...(done ? green : active ? orange : [200, 200, 200] as [number, number, number]));
        doc.circle(cx, y + 4, 4, "F");
        if (done) { doc.setTextColor(...white); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("✓", cx, y + 6.5, { align: "center" }); }
        doc.setFontSize(7.5); doc.setFont("helvetica", active || done ? "bold" : "normal");
        doc.setTextColor(done ? 22 : active ? 234 : 150, done ? 163 : active ? 88 : 150, done ? 74 : active ? 12 : 150);
        doc.text(s, cx, y + 12, { align: "center" });
        if (i < steps.length - 1) {
          doc.setDrawColor(...(cur > i ? green : [200, 200, 200] as [number, number, number]));
          doc.setLineWidth(1); doc.line(cx + 4, y + 4, cx + sw - 4, y + 4);
        }
      });
      y += 20;

      if (journey.collects.length > 0) {
        drawSection("Coleta(s)");
        journey.collects.forEach((c, i) => {
          checkPageBreak(40);
          if (journey.collects.length > 1) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...darkGray); doc.text(`Coleta #${i + 1}`, margin, y); y += 6; }
          const hw = contentW / 2;
          [["Data/Hora", c.collectDate ? fmtDate(c.collectDate) : "—"], ["Motorista", c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : "—"],
           ["Origem", c.manufacturer?.name ?? "—"], ["Destino", c.yard?.name ?? "—"], ["Status", collectStatusLabel[c.status] ?? c.status]]
            .forEach((f, fi) => { const col = fi % 2; if (col === 0 && fi > 0) { y += 12; checkPageBreak(12); } drawField(f[0], f[1], margin + col * hw, hw); });
          y += 14;
        });
      }

      if (journey.transports.length > 0) {
        drawSection("Transporte(s)");
        journey.transports.forEach((t, i) => {
          checkPageBreak(50);
          if (journey.transports.length > 1) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...darkGray); doc.text(`OTD ${t.requestNumber ?? "#" + (i + 1)}`, margin, y); y += 6; }
          const hw = contentW / 2;
          const tf: [string, string][] = [
            ["Nº OTD", t.requestNumber ?? "—"], ["Status", transportStatusLabel[t.status] ?? t.status],
            ["Motorista", t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"],
            ["Pátio de Origem", t.originYard?.name ?? "—"],
            ["Destino", t.deliveryLocation ? `${t.deliveryLocation.name} – ${t.deliveryLocation.city}` : "—"],
            ["Cliente", t.client?.name ?? "—"],
          ];
          if (t.routeDistanceKm) tf.push(["Distância", `${t.routeDistanceKm} km`]);
          if (t.routeDurationMinutes) tf.push(["Duração", `${Math.floor(t.routeDurationMinutes / 60)}h ${t.routeDurationMinutes % 60}min`]);
          tf.forEach((f, fi) => { const col = fi % 2; if (col === 0 && fi > 0) { y += 12; checkPageBreak(12); } drawField(f[0], f[1], margin + col * hw, hw); });
          y += 14;
        });
      }

      const delivered = journey.transports.find((t) => t.status === "entregue");
      if (delivered) {
        drawSection("Entrega Final");
        checkPageBreak(16);
        doc.setFillColor(...green); doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...white);
        doc.text("✓  Veículo entregue ao cliente com sucesso", margin + contentW / 2, y + 8, { align: "center" });
        y += 18;
      }
      drawFooter();
      doc.save(`dossie-${v.chassi.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setPdfGenerating(false);
    }
  }

  const v = journey?.vehicle;
  const vCfg = v ? (vehicleStatusConfig[v.status] ?? vehicleStatusConfig.pre_estoque) : null;
  const stepMap: Record<string, number> = { pre_estoque: 0, em_estoque: 1, despachado: 2, entregue: 3, retirado: 3 };
  const currentStep = v ? (stepMap[v.status] ?? 0) : 0;

  const latestTransport = journey?.transports?.[journey.transports.length - 1];
  const hasDelivery = journey?.transports.some((t) => t.status === "entregue");

  const totalDistKm = journey?.transports.reduce((s, t) => s + (t.routeDistanceKm ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Jornada do Veículo"
        breadcrumbs={[{ label: "Operação", href: "/" }, { label: "Jornada do Veículo" }]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">

        {/* Vehicle Selector */}
        {!selectedChassi ? (
          <div className="mx-auto max-w-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Route className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Selecione um veículo</h2>
              <p className="text-sm text-muted-foreground mt-1">Busque pelo chassi, montadora ou cliente para visualizar a jornada completa</p>
            </div>
            <Card className="shadow-md">
              <CardContent className="pt-5 pb-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar chassi, montadora ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-vehicle-search"
                    autoFocus
                  />
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                    <span className="text-xs font-medium text-muted-foreground">Veículos entregues</span>
                    <Badge variant="secondary" className="text-xs">{filteredVehicles.length}</Badge>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y">
                    {filteredVehicles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Car className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Nenhum veículo encontrado</p>
                        <p className="text-xs mt-0.5">Tente buscar por outro termo</p>
                      </div>
                    ) : (
                      filteredVehicles.slice(0, 60).map((vItem) => {
                        const cfg = vehicleStatusConfig[vItem.status];
                        return (
                          <button
                            key={vItem.chassi}
                            onClick={() => { setSelectedChassi(vItem.chassi); setExpanded({ coleta: true }); setSearch(""); }}
                            className="w-full text-left px-3 py-3 flex items-center gap-3 transition-colors hover:bg-muted/50 group"
                            data-testid={`option-vehicle-${vItem.chassi}`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                              <Car className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm font-bold truncate">{vItem.chassi}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[vItem.manufacturer?.name, vItem.client?.name].filter(Boolean).join(" · ") || "—"}
                              </p>
                            </div>
                            {cfg && (
                              <span className={cn("shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
                                {cfg.label}
                              </span>
                            )}
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Vehicle Header */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-0 border-b">
                <div className="flex-1 px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Car className="h-5.5 w-5.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Chassi</p>
                      <p className="font-mono text-2xl font-black tracking-wider" data-testid="text-chassi">{v?.chassi}</p>
                    </div>
                    {vCfg && (
                      <span className={cn("ml-1 shrink-0 text-xs font-semibold px-3 py-1 rounded-full border", vCfg.color, vCfg.bg, vCfg.border)} data-testid="badge-status">
                        <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle", vCfg.dot)} />
                        {vCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {v?.manufacturer && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Montadora</p>
                        <p className="font-semibold" data-testid="text-manufacturer">{v.manufacturer.name}</p>
                      </div>
                    )}
                    {v?.client && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cliente</p>
                        <p className="font-semibold" data-testid="text-client">{v.client.name}</p>
                      </div>
                    )}
                    {v?.color && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cor</p>
                        <p className="font-semibold" data-testid="text-color">{v.color}</p>
                      </div>
                    )}
                    {v?.yard && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Pátio Atual</p>
                        <p className="font-semibold" data-testid="text-yard">{v.yard.name}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 px-5 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    disabled={pdfGenerating || journeyLoading}
                    className="gap-2"
                    data-testid="button-print-dossie"
                  >
                    {pdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {pdfGenerating ? "Gerando..." : "Gerar PDF"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedChassi(null); setSearch(""); }}
                    className="text-muted-foreground gap-1.5"
                    data-testid="button-change-vehicle"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Trocar veículo
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-5 py-3 bg-muted/20">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {["Coleta", "Pátio", "Transporte", "Entrega"].map((label, i) => (
                    <span key={label} className={cn(currentStep >= i ? "text-foreground" : "")}>{label}</span>
                  ))}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="h-1.5 w-full rounded-full bg-muted" />
                  </div>
                  <div
                    className="absolute inset-y-0 left-0 flex items-center transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentStep / 3) * 100)}%` }}
                  >
                    <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-primary to-green-500" />
                  </div>
                  <div className="relative flex w-full items-center justify-between">
                    {[Package, Warehouse, Truck, Flag].map((Icon, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                          currentStep > i  && "border-green-500 bg-green-500 text-white",
                          currentStep === i && "border-primary bg-primary text-primary-foreground",
                          currentStep < i  && "border-muted bg-background text-muted-foreground"
                        )}
                      >
                        {currentStep > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              {!journeyLoading && journey && (
                <div className="grid grid-cols-3 divide-x border-t">
                  <div className="px-4 py-3 text-center">
                    <p className="text-lg font-bold">{journey.collects.length}</p>
                    <p className="text-[11px] text-muted-foreground">Coleta{journey.collects.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-lg font-bold">{journey.transports.length}</p>
                    <p className="text-[11px] text-muted-foreground">Transporte{journey.transports.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-lg font-bold">{totalDistKm > 0 ? `${totalDistKm} km` : "—"}</p>
                    <p className="text-[11px] text-muted-foreground">Distância total</p>
                  </div>
                </div>
              )}
            </div>

            {/* Loading */}
            {journeyLoading && (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
              </div>
            )}

            {/* Journey Timeline */}
            {!journeyLoading && journey && (
              <div className="relative space-y-0">
                {/* Vertical connecting line */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-primary via-border to-border z-0 hidden md:block" />

                {/* ── COLETA ──────────────────────────────────── */}
                {journey.collects.map((c, idx) => {
                  const key = `coleta-${idx}`;
                  const isExpanded = expanded[key] ?? idx === 0;
                  const checkinPhotos = [
                    { label: "Frontal", url: c.checkinFrontalPhoto },
                    { label: "Lateral 1", url: c.checkinLateral1Photo },
                    { label: "Lateral 2", url: c.checkinLateral2Photo },
                    { label: "Traseira", url: c.checkinTraseiraPhoto },
                    { label: "Odômetro", url: c.checkinOdometerPhoto },
                    { label: "Combustível", url: c.checkinFuelLevelPhoto },
                    { label: "Selfie", url: c.checkinSelfiePhoto },
                    ...(c.checkinDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                  ];
                  const isDone = true;
                  return (
                    <div key={key} className="relative flex gap-4 pb-4" data-testid={`section-coleta-${idx}`}>
                      <div className="hidden md:flex flex-col items-center shrink-0">
                        <StepNode done={isDone} active={false} icon={Package} step={0} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          className="w-full text-left"
                          onClick={() => toggleSection(key)}
                          data-testid={`toggle-coleta-${idx}`}
                        >
                          <div className={cn(
                            "rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md",
                            isDone && "border-green-200 dark:border-green-800"
                          )}>
                            <div className="flex items-center gap-3 px-5 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 md:hidden">
                                <Package className="h-4.5 w-4.5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm">
                                    Coleta {journey.collects.length > 1 ? `#${idx + 1}` : ""} na Montadora
                                  </p>
                                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                                    {collectStatusLabel[c.status] ?? c.status}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {c.manufacturer?.name ?? "—"} → {c.yard?.name ?? "—"}
                                  {c.collectDate && <span className="ml-2">· {fmtDateOnly(c.collectDate)}</span>}
                                </p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            </div>

                            {isExpanded && (
                              <div className="border-t px-5 py-4 space-y-5">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                  <InfoItem icon={Calendar} label="Data da Coleta" value={fmtDate(c.collectDate)} />
                                  <InfoItem icon={User} label="Motorista" value={c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : "—"} />
                                  <InfoItem icon={Factory} label="Montadora" value={c.manufacturer?.name ?? "—"} />
                                  <InfoItem icon={Warehouse} label="Pátio Destino" value={c.yard ? `${c.yard.name}${c.yard.city ? ` – ${c.yard.city}` : ""}` : "—"} />
                                  {c.checkinLatitude && c.checkinLongitude && (
                                    <InfoItem icon={MapPin} label="Local Check-in" value="Ver no mapa" href={`https://maps.google.com/?q=${c.checkinLatitude},${c.checkinLongitude}`} />
                                  )}
                                </div>
                                <PhotoGallery photos={checkinPhotos} title={`Fotos do Check-in (${checkinPhotos.filter(p => p.url).length} foto${checkinPhotos.filter(p => p.url).length !== 1 ? "s" : ""})`} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* ── PÁTIO ─────────────────────────────────── */}
                {(() => {
                  const key = "patio";
                  const isExpanded = expanded[key] ?? false;
                  const isPatioDone = currentStep > 1;
                  const isPatioActive = currentStep === 1;
                  const hasDates = v?.collectDateTime || v?.yardEntryDateTime || v?.dispatchDateTime;
                  return (
                    <div className="relative flex gap-4 pb-4" data-testid="section-patio">
                      <div className="hidden md:flex flex-col items-center shrink-0">
                        <StepNode done={isPatioDone} active={isPatioActive} icon={Warehouse} step={1} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button className="w-full text-left" onClick={() => toggleSection(key)} data-testid="toggle-patio">
                          <div className={cn(
                            "rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md",
                            isPatioDone && "border-blue-200 dark:border-blue-800",
                            isPatioActive && "border-primary/40"
                          )}>
                            <div className="flex items-center gap-3 px-5 py-4">
                              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl md:hidden", isPatioDone ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted")}>
                                <Warehouse className={cn("h-4.5 w-4.5", isPatioDone ? "text-blue-600" : "text-muted-foreground")} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm">Permanência no Pátio</p>
                                  {v?.yard && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{v.yard.name}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {v?.yardEntryDateTime ? `Entrada: ${fmtDateOnly(v.yardEntryDateTime)}` : "Sem data de entrada registrada"}
                                  {v?.dispatchDateTime && <span className="ml-2">· Saída: {fmtDateOnly(v.dispatchDateTime)}</span>}
                                </p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            </div>
                            {isExpanded && hasDates && (
                              <div className="border-t px-5 py-4">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                  {v?.collectDateTime && <InfoItem icon={Clock} label="Data da Coleta" value={fmtDate(v.collectDateTime)} />}
                                  {v?.yardEntryDateTime && <InfoItem icon={Clock} label="Entrada no Pátio" value={fmtDate(v.yardEntryDateTime)} />}
                                  {v?.dispatchDateTime && <InfoItem icon={Clock} label="Despacho" value={fmtDate(v.dispatchDateTime)} />}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TRANSPORTES ───────────────────────────── */}
                {journey.transports.length === 0 ? (
                  <div className="relative flex gap-4 pb-4">
                    <div className="hidden md:flex flex-col items-center shrink-0">
                      <StepNode done={false} active={false} icon={Truck} step={2} />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-6 text-center text-muted-foreground">
                        <Truck className="mx-auto h-6 w-6 mb-2 opacity-30" />
                        <p className="text-sm">Nenhum transporte registrado</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  journey.transports.map((t, idx) => {
                    const key = `transport-${idx}`;
                    const isExpanded = expanded[key] ?? false;
                    const isDone = t.status === "entregue";
                    const isActive = t.status === "em_transito" || t.status === "aguardando_saida";
                    const checkinPhotos = [
                      { label: "Frontal", url: t.checkinFrontalPhoto },
                      { label: "Lateral 1", url: t.checkinLateral1Photo },
                      { label: "Lateral 2", url: t.checkinLateral2Photo },
                      { label: "Traseira", url: t.checkinTraseiraPhoto },
                      { label: "Odômetro", url: t.checkinOdometerPhoto },
                      { label: "Combustível", url: t.checkinFuelLevelPhoto },
                      { label: "Selfie", url: t.checkinSelfiePhoto },
                      ...(t.checkinDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                    ];
                    const statusColor = isDone ? "border-green-200 dark:border-green-800" : isActive ? "border-primary/40" : "";
                    const statusBadgeColor = isDone ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800" : isActive ? "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" : "text-muted-foreground bg-muted border-border";
                    return (
                      <div key={key} className="relative flex gap-4 pb-4" data-testid={`section-transport-${idx}`}>
                        <div className="hidden md:flex flex-col items-center shrink-0">
                          <StepNode done={isDone} active={isActive} icon={Truck} step={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <button className="w-full text-left" onClick={() => toggleSection(key)} data-testid={`toggle-transport-${idx}`}>
                            <div className={cn("rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md", statusColor)}>
                              <div className="flex items-center gap-3 px-5 py-4">
                                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl md:hidden", isDone ? "bg-green-100 dark:bg-green-900/30" : isActive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted")}>
                                  <Truck className={cn("h-4.5 w-4.5", isDone ? "text-green-600" : isActive ? "text-blue-600" : "text-muted-foreground")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm">
                                      Transporte {t.requestNumber ? `OTD ${t.requestNumber}` : `#${idx + 1}`}
                                    </p>
                                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", statusBadgeColor)}>
                                      {transportStatusLabel[t.status] ?? t.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {t.originYard?.name ?? "—"} → {t.deliveryLocation ? `${t.deliveryLocation.name}, ${t.deliveryLocation.city}` : "—"}
                                    {t.routeDistanceKm && <span className="ml-2">· {t.routeDistanceKm} km</span>}
                                  </p>
                                </div>
                                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              </div>

                              {isExpanded && (
                                <div className="border-t px-5 py-4 space-y-5">
                                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    <InfoItem icon={User} label="Motorista" value={t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"} />
                                    <InfoItem icon={Warehouse} label="Pátio de Origem" value={t.originYard ? `${t.originYard.name}${t.originYard.city ? ` – ${t.originYard.city}` : ""}` : "—"} />
                                    <InfoItem icon={MapPin} label="Destino" value={t.deliveryLocation ? [t.deliveryLocation.name, t.deliveryLocation.city, t.deliveryLocation.state].filter(Boolean).join(", ") : "—"} />
                                    <InfoItem icon={User} label="Cliente" value={t.client?.name ?? "—"} />
                                    {t.routeDistanceKm != null && <InfoItem icon={Route} label="Distância" value={`${t.routeDistanceKm} km`} />}
                                    {t.routeDurationMinutes != null && <InfoItem icon={Clock} label="Duração estimada" value={`${Math.floor(t.routeDurationMinutes / 60)}h ${t.routeDurationMinutes % 60}min`} />}
                                    {t.estimatedTolls && <InfoItem icon={FileText} label="Pedágios estimados" value={`R$ ${Number(t.estimatedTolls).toFixed(2)}`} />}
                                    {t.estimatedFuel && <InfoItem icon={FuelIcon} label="Combustível estimado" value={`R$ ${Number(t.estimatedFuel).toFixed(2)}`} />}
                                    {t.checkinLatitude && t.checkinLongitude && (
                                      <InfoItem icon={MapPin} label="Localização Saída" value="Ver no mapa" href={`https://maps.google.com/?q=${t.checkinLatitude},${t.checkinLongitude}`} />
                                    )}
                                  </div>
                                  <PhotoGallery photos={checkinPhotos} title={`Fotos de Saída do Pátio (${checkinPhotos.filter(p => p.url).length} fotos)`} />
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* ── ENTREGA ───────────────────────────────── */}
                {(() => {
                  const key = "entrega";
                  const isExpanded = expanded[key] ?? false;
                  const deliveredTransports = journey.transports.filter((t) => t.status === "entregue");
                  return (
                    <div className="relative flex gap-4" data-testid="section-entrega">
                      <div className="hidden md:flex flex-col items-center shrink-0">
                        <StepNode done={hasDelivery ?? false} active={false} icon={Flag} step={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {!hasDelivery ? (
                          <div className={cn(
                            "rounded-2xl border border-dashed px-5 py-5 text-muted-foreground",
                            currentStep < 3 ? "bg-muted/10" : "bg-muted/20"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                                <Flag className="h-4.5 w-4.5 opacity-30" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">Entrega Final</p>
                                <p className="text-xs">O veículo ainda não foi entregue ao cliente</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button className="w-full text-left" onClick={() => toggleSection(key)} data-testid="toggle-entrega">
                            <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-card shadow-sm transition-all hover:shadow-md">
                              <div className="flex items-center gap-3 px-5 py-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 md:hidden">
                                  <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm text-green-700 dark:text-green-400">Entrega Concluída</p>
                                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                                      Entregue
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {deliveredTransports[0]?.deliveryLocation
                                      ? [deliveredTransports[0].deliveryLocation.city, deliveredTransports[0].deliveryLocation.state].filter(Boolean).join(" – ")
                                      : "—"}
                                    {v?.deliveryDateTime && <span className="ml-2">· {fmtDateOnly(v.deliveryDateTime)}</span>}
                                  </p>
                                </div>
                                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              </div>

                              {isExpanded && (
                                <div className="border-t px-5 py-4 space-y-5">
                                  {deliveredTransports.map((t, idx) => {
                                    const checkoutPhotos = [
                                      { label: "Frontal", url: t.checkoutFrontalPhoto },
                                      { label: "Lateral 1", url: t.checkoutLateral1Photo },
                                      { label: "Lateral 2", url: t.checkoutLateral2Photo },
                                      { label: "Traseira", url: t.checkoutTraseiraPhoto },
                                      { label: "Odômetro", url: t.checkoutOdometerPhoto },
                                      { label: "Combustível", url: t.checkoutFuelLevelPhoto },
                                      { label: "Selfie", url: t.checkoutSelfiePhoto },
                                      ...(t.checkoutDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                                    ];
                                    return (
                                      <div key={t.id} className={idx > 0 ? "pt-4 border-t" : ""}>
                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-5">
                                          {v?.deliveryDateTime && <InfoItem icon={Calendar} label="Data da Entrega" value={fmtDate(v.deliveryDateTime)} />}
                                          <InfoItem icon={User} label="Motorista" value={t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"} />
                                          <InfoItem icon={MapPin} label="Endereço" value={t.deliveryLocation ? [t.deliveryLocation.address, t.deliveryLocation.addressNumber, t.deliveryLocation.city, t.deliveryLocation.state].filter(Boolean).join(", ") : "—"} />
                                          <InfoItem icon={User} label="Cliente" value={t.client?.name ?? "—"} />
                                          {t.checkoutLatitude && t.checkoutLongitude && (
                                            <InfoItem icon={MapPin} label="Local Check-out" value="Ver no mapa" href={`https://maps.google.com/?q=${t.checkoutLatitude},${t.checkoutLongitude}`} />
                                          )}
                                          {v?.notes && <InfoItem icon={FileText} label="Observações" value={v.notes} />}
                                        </div>
                                        <PhotoGallery photos={checkoutPhotos} title={`Comprovante de Entrega (${checkoutPhotos.filter(p => p.url).length} fotos)`} />
                                      </div>
                                    );
                                  })}

                                  <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3.5 text-white">
                                    <div className="flex items-center gap-3">
                                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                                      <div>
                                        <p className="font-bold text-sm">Veículo entregue com sucesso ao cliente</p>
                                        {v?.deliveryDateTime && (
                                          <p className="text-xs text-green-100 mt-0.5">
                                            Entrega registrada em {fmtDate(v.deliveryDateTime)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
