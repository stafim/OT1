import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search,
  Printer,
  Check,
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
    deliveryLocation?: { id: string; name: string; address?: string | null; city?: string | null; state?: string | null } | null;
    driver?: { id: number; firstName: string; lastName: string } | null;
    client?: { id: number; name: string } | null;
  }>;
};

type VehicleItem = {
  chassi: string;
  status: string;
  manufacturer?: { name: string } | null;
  client?: { name: string } | null;
};

const statusConfig: Record<string, { label: string; color: string; badgeClass: string }> = {
  pre_estoque:      { label: "Aguardando Coleta",  color: "text-yellow-600",  badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  em_estoque:       { label: "No Pátio",           color: "text-blue-600",    badgeClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  despachado:       { label: "Em Trânsito",        color: "text-blue-700",    badgeClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  entregue:         { label: "Entregue",           color: "text-green-600",   badgeClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  retirado:         { label: "Retirado",           color: "text-gray-600",    badgeClass: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

const collectStatusConfig: Record<string, { label: string; badgeClass: string }> = {
  em_transito:        { label: "Em Trânsito",       badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  aguardando_checkout: { label: "Aguard. Check-out", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  finalizada:         { label: "Finalizada",         badgeClass: "bg-green-100 text-green-800 border-green-200" },
};

const transportStatusConfig: Record<string, { label: string; badgeClass: string }> = {
  pendente:         { label: "Pendente",         badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  aguardando_saida: { label: "Aguard. Saída",    badgeClass: "bg-orange-100 text-orange-800 border-orange-200" },
  em_transito:      { label: "Em Trânsito",      badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  entregue:         { label: "Entregue",         badgeClass: "bg-green-100 text-green-800 border-green-200" },
  cancelado:        { label: "Cancelado",        badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

function fmtDate(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return val;
  }
}

function fmtDateOnly(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return val;
  }
}

function getTimelineStep(status: string): number {
  const steps: Record<string, number> = {
    pre_estoque: 0,
    em_estoque:  1,
    despachado:  2,
    entregue:    3,
    retirado:    3,
  };
  return steps[status] ?? 0;
}

function Timeline({ status }: { status: string }) {
  const currentStep = getTimelineStep(status);
  const steps = [
    { label: "Coleta",     icon: Package,   step: 0 },
    { label: "Pátio",      icon: Warehouse,  step: 1 },
    { label: "Transporte", icon: Truck,      step: 2 },
    { label: "Entrega",    icon: CheckCircle2, step: 3 },
  ];

  return (
    <div className="flex items-center justify-between w-full" data-testid="timeline-progress">
      {steps.map((s, idx) => {
        const done      = currentStep > s.step;
        const active    = currentStep === s.step;
        const isLast    = idx === steps.length - 1;
        const Icon      = s.icon;
        return (
          <div key={s.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  done   && "border-green-500 bg-green-500 text-white",
                  active && "border-primary bg-primary text-primary-foreground",
                  !done && !active && "border-muted bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-xs font-medium",
                done   && "text-green-600",
                active && "text-primary",
                !done && !active && "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                "h-0.5 flex-1 mx-2 transition-colors",
                currentStep > s.step ? "bg-green-400" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhotoGrid({ photos }: { photos: { label: string; url: string | null | undefined }[] }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const valid = photos.filter((p) => p.url);

  if (valid.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <Camera className="mr-2 h-4 w-4" />
        Sem fotos registradas
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {valid.map((p) => (
          <button
            key={p.label}
            data-testid={`photo-${p.label.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => setViewing(normalizeImageUrl(p.url))}
            className="group relative overflow-hidden rounded-lg border bg-muted aspect-square cursor-pointer hover:ring-2 hover:ring-primary transition"
          >
            <img
              src={normalizeImageUrl(p.url)}
              alt={p.label}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1">
              <p className="truncate text-center text-[10px] text-white">{p.label}</p>
            </div>
          </button>
        ))}
      </div>
      {viewing && (
        <Dialog open onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-3xl p-2">
            <img src={viewing} alt="Foto ampliada" className="w-full rounded object-contain max-h-[80vh]" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function MovementsTable({ journey }: { journey: VehicleJourney }) {
  type Row = {
    tipo: string;
    origem: string;
    destino: string;
    dataEntrada: string | null | undefined;
    dataSaida: string | null | undefined;
    status: string;
    badgeClass: string;
  };

  const rows: Row[] = [];
  for (const c of journey.collects) {
    const cfg = collectStatusConfig[c.status] ?? { label: c.status, badgeClass: "" };
    rows.push({
      tipo: "Coleta",
      origem: c.manufacturer?.name ?? "—",
      destino: c.yard ? `${c.yard.name}${c.yard.city ? " – " + c.yard.city : ""}` : "—",
      dataEntrada: c.collectDate,
      dataSaida: null,
      status: cfg.label,
      badgeClass: cfg.badgeClass,
    });
  }
  for (const t of journey.transports) {
    const cfg = transportStatusConfig[t.status] ?? { label: t.status, badgeClass: "" };
    const destino = t.deliveryLocation
      ? [t.deliveryLocation.name, t.deliveryLocation.city, t.deliveryLocation.state].filter(Boolean).join(", ")
      : "—";
    rows.push({
      tipo: "Transporte",
      origem: t.originYard ? `${t.originYard.name}${t.originYard.city ? " – " + t.originYard.city : ""}` : "—",
      destino,
      dataEntrada: null,
      dataSaida: null,
      status: cfg.label,
      badgeClass: cfg.badgeClass,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        Sem movimentações registradas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-left font-medium">Origem</th>
            <th className="px-4 py-3 text-left font-medium">Destino</th>
            <th className="px-4 py-3 text-left font-medium">Data</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t last:border-b">
              <td className="px-4 py-3 font-medium">{r.tipo}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.origem}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.destino}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDateOnly(r.dataEntrada)}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={r.badgeClass}>{r.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JornadaVeiculoPage() {
  const [search, setSearch] = useState("");
  const [selectedChassi, setSelectedChassi] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("coleta");

  const { data: vehiclesList } = useQuery<VehicleItem[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: transportsList } = useQuery<Array<{ vehicleChassi: string; status: string }>>({
    queryKey: ["/api/transports"],
  });

  const { data: journey, isLoading: journeyLoading } = useQuery<VehicleJourney>({
    queryKey: ["/api/vehicle-journey", selectedChassi],
    enabled: !!selectedChassi,
  });

  const deliveredChassiSet = new Set(
    (transportsList ?? [])
      .filter((t) => t.status === "entregue")
      .map((t) => t.vehicleChassi)
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

  const [pdfGenerating, setPdfGenerating] = useState(false);

  async function handlePrint() {
    if (!journey || !v) return;
    setPdfGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = 210;
      const pageH = 297;
      const margin = 18;
      const contentW = pageW - margin * 2;
      const orange: [number, number, number] = [234, 88, 12];
      const darkGray: [number, number, number] = [30, 30, 30];
      const medGray: [number, number, number] = [100, 100, 100];
      const lightGray: [number, number, number] = [245, 245, 245];
      const white: [number, number, number] = [255, 255, 255];
      const green: [number, number, number] = [22, 163, 74];
      const blue: [number, number, number] = [37, 99, 235];
      const yellow: [number, number, number] = [202, 138, 4];

      let y = 0;
      let pageNum = 1;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageH - 15) {
          doc.addPage();
          pageNum++;
          drawPageFooter();
          y = 15;
        }
      };

      const drawPageFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(...medGray);
        doc.setFont("helvetica", "normal");
        doc.text(`OTD Logistics — Dossiê do Veículo — Chassi: ${v!.chassi}`, margin, pageH - 8);
        doc.text(`Página ${pageNum}`, pageW - margin, pageH - 8, { align: "right" });
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      };

      const drawSectionTitle = (title: string) => {
        checkPageBreak(14);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...orange);
        doc.text(title.toUpperCase(), margin, y);
        doc.setDrawColor(...orange);
        doc.setLineWidth(0.4);
        doc.line(margin, y + 1.5, margin + contentW, y + 1.5);
        y += 8;
      };

      const drawField = (label: string, value: string, x: number, fieldWidth: number) => {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...medGray);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        const maxLen = Math.floor(fieldWidth / 2.2);
        const truncated = value.length > maxLen ? value.slice(0, maxLen - 1) + "…" : value;
        doc.text(truncated, x, y + 5);
      };

      const statusColor = (status: string): [number, number, number] => {
        if (status === "entregue" || status === "retirado") return green;
        if (status === "em_transito" || status === "despachado" || status === "em_estoque") return blue;
        return yellow;
      };

      // ── HEADER ──────────────────────────────────────────────
      doc.setFillColor(...orange);
      doc.rect(0, 0, pageW, 42, "F");

      // Load logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
          logoImg.src = "/logo-otd.png";
        });
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = logoImg.naturalWidth;
          canvas.height = logoImg.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(logoImg, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
            const logoH = 26;
            const logoW = logoH * aspectRatio;
            doc.addImage(dataUrl, "PNG", margin, 8, logoW, logoH);
          }
        }
      } catch {}

      doc.setFontSize(13);
      doc.setTextColor(...white);
      doc.setFont("helvetica", "bold");
      doc.text("DOSSIÊ DO VEÍCULO", pageW - margin, 16, { align: "right" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("Jornada Completa — OTD Logistics", pageW - margin, 23, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin, 30, { align: "right" });

      y = 52;

      // ── VEHICLE IDENTIFICATION ──────────────────────────────
      drawSectionTitle("Identificação do Veículo");

      const statusLbl = statusConfig[v.status]?.label ?? v.status;
      const sColor = statusColor(v.status);

      // Chassi highlight box
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, y - 3, contentW, 18, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...medGray);
      doc.text("CHASSI", margin + 4, y + 2);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkGray);
      doc.text(v.chassi, margin + 4, y + 10);

      // Status badge
      doc.setFillColor(...sColor);
      const badgeW = 40;
      doc.roundedRect(pageW - margin - badgeW, y - 1, badgeW, 10, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...white);
      doc.text(statusLbl, pageW - margin - badgeW / 2, y + 5.5, { align: "center" });

      y += 23;

      // Fields row
      const colW = contentW / 4;
      drawField("Montadora", v.manufacturer?.name ?? "—", margin, colW);
      drawField("Cliente", v.client?.name ?? "—", margin + colW, colW);
      drawField("Cor", v.color ?? "—", margin + colW * 2, colW);
      drawField("Pátio Atual", v.yard?.name ?? "—", margin + colW * 3, colW);
      y += 14;

      // ── TIMELINE ────────────────────────────────────────────
      checkPageBreak(30);
      drawSectionTitle("Linha do Tempo");

      const steps = ["Coleta", "Pátio", "Transporte", "Entrega"];
      const stepStatuses: Record<string, number> = { pre_estoque: 0, em_estoque: 1, despachado: 2, entregue: 3, retirado: 3 };
      const currentStep = stepStatuses[v.status] ?? 0;
      const stepW = contentW / steps.length;

      steps.forEach((step, i) => {
        const cx = margin + stepW * i + stepW / 2;
        const done = currentStep > i;
        const active = currentStep === i;
        const fill: [number, number, number] = done ? green : active ? orange : [200, 200, 200];
        doc.setFillColor(...fill);
        doc.circle(cx, y + 4, 4, "F");
        if (done) {
          doc.setTextColor(...white);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("✓", cx, y + 6.5, { align: "center" });
        }
        doc.setFontSize(7.5);
        doc.setFont("helvetica", active || done ? "bold" : "normal");
        doc.setTextColor(done ? 22 : active ? 234 : 150, done ? 163 : active ? 88 : 150, done ? 74 : active ? 12 : 150);
        doc.text(step, cx, y + 12, { align: "center" });
        if (i < steps.length - 1) {
          const lineColor: [number, number, number] = currentStep > i ? green : [200, 200, 200];
          doc.setDrawColor(...lineColor);
          doc.setLineWidth(1);
          doc.line(cx + 4, y + 4, cx + stepW - 4, y + 4);
        }
      });
      y += 20;

      // ── COLLECTS ────────────────────────────────────────────
      if (journey.collects.length > 0) {
        checkPageBreak(20);
        drawSectionTitle("Coleta(s)");

        journey.collects.forEach((c, idx) => {
          checkPageBreak(40);
          if (journey.collects.length > 1) {
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...darkGray);
            doc.text(`Coleta #${idx + 1}`, margin, y);
            y += 6;
          }
          const fields = [
            ["Data/Hora", c.collectDate ? fmtDate(c.collectDate) : "—"],
            ["Motorista", c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : "—"],
            ["Origem (Montadora)", c.manufacturer?.name ?? "—"],
            ["Destino (Pátio)", c.yard ? `${c.yard.name}${c.yard.city ? " – " + c.yard.city : ""}` : "—"],
            ["Status", collectStatusConfig[c.status]?.label ?? c.status],
          ];
          const fColW = contentW / 2;
          fields.forEach((f, fi) => {
            const col = fi % 2;
            const xPos = margin + col * fColW;
            if (col === 0 && fi > 0) { y += 12; checkPageBreak(12); }
            drawField(f[0], f[1], xPos, fColW);
          });
          y += 16;

          const checkinPhotos = [
            c.checkinFrontalPhoto, c.checkinLateral1Photo, c.checkinLateral2Photo,
            c.checkinTraseiraPhoto, c.checkinOdometerPhoto, c.checkinSelfiePhoto,
          ].filter(Boolean) as string[];

          if (checkinPhotos.length > 0) {
            checkPageBreak(8);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(...medGray);
            doc.text(`${checkinPhotos.length} foto(s) de check-in registrada(s)`, margin, y);
            y += 7;
          }

          if (idx < journey.collects.length - 1) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.line(margin, y, margin + contentW, y);
            y += 5;
          }
        });
        y += 4;
      }

      // ── LOGISTICS ───────────────────────────────────────────
      checkPageBreak(20);
      drawSectionTitle("Logística e Movimentações");

      const timestamps = [
        ["Coleta",          v.collectDateTime],
        ["Entrada no Pátio", v.yardEntryDateTime],
        ["Despacho",         v.dispatchDateTime],
        ["Entrega Final",    v.deliveryDateTime],
      ].filter(([, d]) => d);

      if (timestamps.length > 0) {
        const tColW = contentW / 2;
        timestamps.forEach(([label, date], ti) => {
          const col = ti % 2;
          const xPos = margin + col * tColW;
          if (col === 0 && ti > 0) { y += 12; checkPageBreak(12); }
          drawField(label as string, fmtDate(date), xPos, tColW);
        });
        y += 16;
      }

      // Movements table
      const movements = [
        ...journey.collects.map((c) => ({
          tipo: "Coleta",
          origem: c.manufacturer?.name ?? "—",
          destino: c.yard?.name ?? "—",
          data: c.collectDate ? fmtDateOnly(c.collectDate) : "—",
          status: collectStatusConfig[c.status]?.label ?? c.status,
        })),
        ...journey.transports.map((t) => ({
          tipo: "Transporte",
          origem: t.originYard?.name ?? "—",
          destino: t.deliveryLocation?.name ?? "—",
          data: "—",
          status: transportStatusConfig[t.status]?.label ?? t.status,
        })),
      ];

      if (movements.length > 0) {
        checkPageBreak(24);
        const cols = ["Tipo", "Origem", "Destino", "Data", "Status"];
        const colWidths = [22, 42, 42, 26, 30];
        const rowH = 7;

        doc.setFillColor(...orange);
        doc.rect(margin, y, contentW, rowH, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...white);
        let cx = margin + 2;
        cols.forEach((col, i) => {
          doc.text(col, cx, y + 5);
          cx += colWidths[i];
        });
        y += rowH;

        movements.forEach((row, ri) => {
          checkPageBreak(rowH + 2);
          doc.setFillColor(ri % 2 === 0 ? 250 : 245, ri % 2 === 0 ? 250 : 245, ri % 2 === 0 ? 250 : 245);
          doc.rect(margin, y, contentW, rowH, "F");
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkGray);
          cx = margin + 2;
          [row.tipo, row.origem, row.destino, row.data, row.status].forEach((val, i) => {
            const maxChars = Math.floor(colWidths[i] / 1.8);
            const txt = val.length > maxChars ? val.slice(0, maxChars - 1) + "…" : val;
            doc.text(txt, cx, y + 5);
            cx += colWidths[i];
          });
          y += rowH;
        });
        y += 6;
      }

      // ── TRANSPORTS ──────────────────────────────────────────
      if (journey.transports.length > 0) {
        checkPageBreak(20);
        drawSectionTitle("Transporte(s)");

        journey.transports.forEach((t, idx) => {
          checkPageBreak(50);
          if (journey.transports.length > 1) {
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...darkGray);
            doc.text(`OTD ${t.requestNumber ?? "#" + (idx + 1)}`, margin, y);
            y += 6;
          }

          const tFields: [string, string][] = [
            ["Nº OTD", t.requestNumber ?? "—"],
            ["Status", transportStatusConfig[t.status]?.label ?? t.status],
            ["Motorista", t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"],
            ["Pátio de Origem", t.originYard?.name ?? "—"],
            ["Destino", t.deliveryLocation ? `${t.deliveryLocation.name}${t.deliveryLocation.city ? " – " + t.deliveryLocation.city : ""}` : "—"],
            ["Cliente", t.client?.name ?? "—"],
          ];
          if (t.routeDistanceKm) tFields.push(["Distância", `${t.routeDistanceKm} km`]);
          if (t.routeDurationMinutes) tFields.push(["Duração estimada", `${Math.floor(t.routeDurationMinutes / 60)}h ${t.routeDurationMinutes % 60}min`]);
          if (t.estimatedTolls) tFields.push(["Pedágios estimados", `R$ ${Number(t.estimatedTolls).toFixed(2)}`]);

          const fColW2 = contentW / 2;
          tFields.forEach((f, fi) => {
            const col = fi % 2;
            const xPos = margin + col * fColW2;
            if (col === 0 && fi > 0) { y += 12; checkPageBreak(12); }
            drawField(f[0], f[1], xPos, fColW2);
          });
          y += 14;

          if (idx < journey.transports.length - 1) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.line(margin, y, margin + contentW, y);
            y += 5;
          }
        });
        y += 4;
      }

      // ── DELIVERY ────────────────────────────────────────────
      const delivered = journey.transports.find((t) => t.status === "entregue");
      if (delivered) {
        checkPageBreak(30);
        drawSectionTitle("Entrega Final");

        const dFields: [string, string][] = [
          ["Data/Hora da Entrega", v.deliveryDateTime ? fmtDate(v.deliveryDateTime) : "—"],
          ["Motorista", delivered.driver ? `${delivered.driver.firstName} ${delivered.driver.lastName}` : "—"],
          ["Endereço", delivered.deliveryLocation?.address ? [delivered.deliveryLocation.address, delivered.deliveryLocation.addressNumber].filter(Boolean).join(", ") : "—"],
          ["Cidade/Estado", delivered.deliveryLocation ? `${delivered.deliveryLocation.city ?? ""}${delivered.deliveryLocation.state ? " – " + delivered.deliveryLocation.state : ""}` : "—"],
        ];
        if (v.notes) dFields.push(["Observações", v.notes]);

        const fColW3 = contentW / 2;
        dFields.forEach((f, fi) => {
          const col = fi % 2;
          const xPos = margin + col * fColW3;
          if (col === 0 && fi > 0) { y += 12; checkPageBreak(12); }
          drawField(f[0], f[1], xPos, fColW3);
        });
        y += 14;

        // Green delivery banner
        checkPageBreak(16);
        doc.setFillColor(...green);
        doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...white);
        doc.text("✓  Veículo entregue ao cliente com sucesso", margin + contentW / 2, y + 8, { align: "center" });
        y += 18;
      }

      drawPageFooter();

      doc.save(`dossie-${v.chassi.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setPdfGenerating(false);
    }
  }

  const v = journey?.vehicle;
  const statusCfg = v ? (statusConfig[v.status] ?? { label: v.status, color: "text-gray-600", badgeClass: "bg-gray-100 text-gray-800 border-gray-200" }) : null;

  const latestCollect   = journey?.collects?.[journey.collects.length - 1];
  const latestTransport = journey?.transports?.[journey.transports.length - 1];

  return (
    <>
      <PageHeader
        title="Jornada do Veículo"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Jornada do Veículo" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {!selectedChassi ? (
          <Card className="no-print">
            <CardContent className="pt-5">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por chassi, montadora ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-vehicle-search"
                  />
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b">
                    <span className="text-xs font-medium text-muted-foreground">
                      {filteredVehicles.length} veículo{filteredVehicles.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {filteredVehicles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Car className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">Nenhum veículo encontrado</p>
                      </div>
                    ) : (
                      filteredVehicles.slice(0, 50).map((vItem) => {
                        const cfg = statusConfig[vItem.status];
                        return (
                          <button
                            key={vItem.chassi}
                            onClick={() => { setSelectedChassi(vItem.chassi); setActiveTab("coleta"); setSearch(""); }}
                            className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors hover:bg-muted/60"
                            data-testid={`option-vehicle-${vItem.chassi}`}
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-medium truncate">{vItem.chassi}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[vItem.manufacturer?.name, vItem.client?.name].filter(Boolean).join(" · ") || "—"}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0.5", cfg?.badgeClass)}>
                              {cfg?.label ?? vItem.status}
                            </Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="no-print flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Car className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-semibold truncate">{selectedChassi}</p>
              {journey?.vehicle && (
                <p className="text-xs text-muted-foreground truncate">
                  {[journey.vehicle.manufacturer?.name, journey.vehicle.client?.name].filter(Boolean).join(" · ") || "—"}
                </p>
              )}
            </div>
            {journey?.vehicle && statusConfig[journey.vehicle.status] && (
              <Badge variant="outline" className={cn("shrink-0 text-xs", statusConfig[journey.vehicle.status].badgeClass)}>
                {statusConfig[journey.vehicle.status].label}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedChassi(null); setSearch(""); setActiveTab("coleta"); }}
              className="shrink-0"
              data-testid="button-change-vehicle"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Trocar
            </Button>
          </div>
        )}

        {selectedChassi && journeyLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        )}

        {selectedChassi && !journeyLoading && journey && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Car className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Chassi</p>
                        <p className="font-mono text-xl font-bold tracking-wide" data-testid="text-chassi">{v?.chassi}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Montadora / Modelo</p>
                        <p className="font-medium" data-testid="text-manufacturer">{v?.manufacturer?.name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium" data-testid="text-client">{v?.client?.name ?? "—"}</p>
                      </div>
                      {v?.color && (
                        <div>
                          <p className="text-xs text-muted-foreground">Cor</p>
                          <p className="font-medium" data-testid="text-color">{v.color}</p>
                        </div>
                      )}
                      {v?.yard && (
                        <div>
                          <p className="text-xs text-muted-foreground">Pátio Atual</p>
                          <p className="font-medium" data-testid="text-yard">{v.yard.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {statusCfg && (
                      <Badge
                        variant="outline"
                        className={cn("text-sm px-3 py-1", statusCfg.badgeClass)}
                        data-testid="badge-status"
                      >
                        {statusCfg.label}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      disabled={pdfGenerating}
                      className="no-print gap-2"
                      data-testid="button-print-dossie"
                    >
                      {pdfGenerating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Printer className="h-4 w-4" />}
                      {pdfGenerating ? "Gerando PDF..." : "Gerar PDF do Dossiê"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="no-print mb-4 w-full justify-start overflow-x-auto">
                <TabsTrigger value="coleta" data-testid="tab-coleta">Coleta</TabsTrigger>
                <TabsTrigger value="logistica" data-testid="tab-logistica">Logística</TabsTrigger>
                <TabsTrigger value="transporte" data-testid="tab-transporte">Transporte</TabsTrigger>
                <TabsTrigger value="entrega" data-testid="tab-entrega">Entrega</TabsTrigger>
              </TabsList>

              <TabsContent value="coleta" className="space-y-4">
                {journey.collects.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                      <Package className="mr-2 h-5 w-5" />
                      Nenhuma coleta registrada para este veículo
                    </CardContent>
                  </Card>
                ) : (
                  journey.collects.map((c, idx) => {
                    const cfg = collectStatusConfig[c.status] ?? { label: c.status, badgeClass: "" };
                    const checkinPhotos = [
                      { label: "Frontal",       url: c.checkinFrontalPhoto },
                      { label: "Lateral 1",     url: c.checkinLateral1Photo },
                      { label: "Lateral 2",     url: c.checkinLateral2Photo },
                      { label: "Traseira",      url: c.checkinTraseiraPhoto },
                      { label: "Odômetro",      url: c.checkinOdometerPhoto },
                      { label: "Combustível",   url: c.checkinFuelLevelPhoto },
                      { label: "Selfie",        url: c.checkinSelfiePhoto },
                      ...(c.checkinDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                    ];
                    return (
                      <Card key={c.id} data-testid={`card-collect-${idx}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Coleta {journey.collects.length > 1 ? `#${idx + 1}` : ""}
                            </CardTitle>
                            <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div className="flex items-start gap-2">
                              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Data/Hora</p>
                                <p className="text-sm font-medium" data-testid={`text-collect-date-${idx}`}>{fmtDate(c.collectDate)}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Motorista</p>
                                <p className="text-sm font-medium" data-testid={`text-collect-driver-${idx}`}>
                                  {c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Origem → Destino</p>
                                <p className="text-sm font-medium">
                                  {c.manufacturer?.name ?? "—"} → {c.yard?.name ?? "—"}
                                </p>
                              </div>
                            </div>
                            {c.checkinLatitude && c.checkinLongitude && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Localização Check-in</p>
                                  <a
                                    href={`https://maps.google.com/?q=${c.checkinLatitude},${c.checkinLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline"
                                    data-testid={`link-checkin-location-${idx}`}
                                  >
                                    Ver no mapa
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              Fotos do Check-in (Retirada na Montadora)
                            </p>
                            <PhotoGrid photos={checkinPhotos} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="logistica" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Warehouse className="h-4 w-4" />
                      Movimentações de Pátio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MovementsTable journey={journey} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                      {v?.collectDateTime && (
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3 w-3" />Coleta</p>
                          <p className="font-medium" data-testid="text-collect-datetime">{fmtDate(v.collectDateTime)}</p>
                        </div>
                      )}
                      {v?.yardEntryDateTime && (
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3 w-3" />Entrada no Pátio</p>
                          <p className="font-medium" data-testid="text-yard-entry-datetime">{fmtDate(v.yardEntryDateTime)}</p>
                        </div>
                      )}
                      {v?.dispatchDateTime && (
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3 w-3" />Despacho</p>
                          <p className="font-medium" data-testid="text-dispatch-datetime">{fmtDate(v.dispatchDateTime)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transporte" className="space-y-4">
                {journey.transports.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                      <Truck className="mr-2 h-5 w-5" />
                      Nenhum transporte registrado para este veículo
                    </CardContent>
                  </Card>
                ) : (
                  journey.transports.map((t, idx) => {
                    const cfg = transportStatusConfig[t.status] ?? { label: t.status, badgeClass: "" };
                    const checkinPhotos = [
                      { label: "Frontal",     url: t.checkinFrontalPhoto },
                      { label: "Lateral 1",   url: t.checkinLateral1Photo },
                      { label: "Lateral 2",   url: t.checkinLateral2Photo },
                      { label: "Traseira",    url: t.checkinTraseiraPhoto },
                      { label: "Odômetro",    url: t.checkinOdometerPhoto },
                      { label: "Combustível", url: t.checkinFuelLevelPhoto },
                      { label: "Selfie",      url: t.checkinSelfiePhoto },
                      ...(t.checkinDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                    ];
                    const hasRoute = t.routeDistanceKm || t.routeDurationMinutes;
                    return (
                      <Card key={t.id} data-testid={`card-transport-${idx}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              OTD {t.requestNumber ?? `#${idx + 1}`}
                            </CardTitle>
                            <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div className="flex items-start gap-2">
                              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Motorista</p>
                                <p className="text-sm font-medium" data-testid={`text-transport-driver-${idx}`}>
                                  {t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Pátio de Origem</p>
                                <p className="text-sm font-medium">{t.originYard ? `${t.originYard.name}${t.originYard.city ? " – " + t.originYard.city : ""}` : "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Destino</p>
                                <p className="text-sm font-medium">
                                  {t.deliveryLocation
                                    ? [t.deliveryLocation.name, t.deliveryLocation.city, t.deliveryLocation.state].filter(Boolean).join(", ")
                                    : "—"}
                                </p>
                              </div>
                            </div>
                            {hasRoute && (
                              <>
                                {t.routeDistanceKm && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Distância</p>
                                    <p className="text-sm font-medium" data-testid={`text-distance-${idx}`}>{t.routeDistanceKm} km</p>
                                  </div>
                                )}
                                {t.routeDurationMinutes && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duração estimada</p>
                                    <p className="text-sm font-medium" data-testid={`text-duration-${idx}`}>
                                      {Math.floor(t.routeDurationMinutes / 60)}h {t.routeDurationMinutes % 60}min
                                    </p>
                                  </div>
                                )}
                                {t.estimatedTolls && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pedágios estimados</p>
                                    <p className="text-sm font-medium">R$ {Number(t.estimatedTolls).toFixed(2)}</p>
                                  </div>
                                )}
                              </>
                            )}
                            {t.checkinLatitude && t.checkinLongitude && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Localização Saída</p>
                                  <a
                                    href={`https://maps.google.com/?q=${t.checkinLatitude},${t.checkinLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline"
                                    data-testid={`link-transport-location-${idx}`}
                                  >
                                    Ver no mapa
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              Fotos do Check-in (Saída do Pátio)
                            </p>
                            <PhotoGrid photos={checkinPhotos} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="entrega" className="space-y-4">
                {!latestTransport || latestTransport.status !== "entregue" ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                      <CheckCircle2 className="h-10 w-10 opacity-30" />
                      <p className="text-base font-medium">Entrega não registrada</p>
                      <p className="text-sm">O veículo ainda não foi entregue ao cliente</p>
                    </CardContent>
                  </Card>
                ) : (
                  journey.transports
                    .filter((t) => t.status === "entregue")
                    .map((t, idx) => {
                      const checkoutPhotos = [
                        { label: "Frontal",     url: t.checkoutFrontalPhoto },
                        { label: "Lateral 1",   url: t.checkoutLateral1Photo },
                        { label: "Lateral 2",   url: t.checkoutLateral2Photo },
                        { label: "Traseira",    url: t.checkoutTraseiraPhoto },
                        { label: "Odômetro",    url: t.checkoutOdometerPhoto },
                        { label: "Combustível", url: t.checkoutFuelLevelPhoto },
                        { label: "Selfie",      url: t.checkoutSelfiePhoto },
                        ...(t.checkoutDamagePhotos ?? []).map((url, i) => ({ label: `Avaria ${i + 1}`, url })),
                      ];
                      return (
                        <Card key={t.id} data-testid={`card-delivery-${idx}`}>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <CardTitle className="text-base">Entrega Concluída</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                              {v?.deliveryDateTime && (
                                <div className="flex items-start gap-2">
                                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Data/Hora da Entrega</p>
                                    <p className="text-sm font-medium" data-testid="text-delivery-datetime">{fmtDate(v.deliveryDateTime)}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Motorista</p>
                                  <p className="text-sm font-medium">
                                    {t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Endereço de Entrega</p>
                                  <p className="text-sm font-medium">
                                    {t.deliveryLocation
                                      ? [t.deliveryLocation.address, t.deliveryLocation.city, t.deliveryLocation.state].filter(Boolean).join(", ")
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                              {t.checkoutLatitude && t.checkoutLongitude && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Localização Check-out</p>
                                    <a
                                      href={`https://maps.google.com/?q=${t.checkoutLatitude},${t.checkoutLongitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary underline"
                                      data-testid={`link-delivery-location-${idx}`}
                                    >
                                      Ver no mapa
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                            {v?.notes && (
                              <div className="rounded-lg border p-3">
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                  <FileText className="h-3 w-3" />
                                  Observações
                                </p>
                                <p className="text-sm" data-testid="text-notes">{v.notes}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Camera className="h-4 w-4" />
                                Fotos do Check-out (Comprovante de Entrega)
                              </p>
                              <PhotoGrid photos={checkoutPhotos} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}
