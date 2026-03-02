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
  Printer,
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
  const [pdfGenerating, setPdfGenerating] = useState(false);

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

  const generatePdf = async () => {
    setPdfGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = 210;
      const pageH = 297;
      const margin = 18;
      const contentW = pageW - margin * 2;
      const orange: [number, number, number] = [234, 88, 12];
      const red: [number, number, number] = [220, 38, 38];
      const darkGray: [number, number, number] = [30, 30, 30];
      const medGray: [number, number, number] = [100, 100, 100];
      const lightGray: [number, number, number] = [245, 245, 245];
      const white: [number, number, number] = [255, 255, 255];

      let y = 0;
      let pageNum = 1;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageH - 18) {
          doc.addPage();
          pageNum++;
          drawFooter();
          y = 18;
        }
      };

      const drawFooter = () => {
        doc.setFontSize(7.5);
        doc.setTextColor(...medGray);
        doc.setFont("helvetica", "normal");
        doc.text("OTD Logistics — Relatório de Avarias", margin, pageH - 8);
        doc.text(`Página ${pageNum}`, pageW - margin, pageH - 8, { align: "right" });
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      };

      const loadImage = async (url: string): Promise<string | null> => {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = normalizeImageUrl(url);
          });
          if (!img.complete || img.naturalWidth === 0) return null;
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL("image/jpeg", 0.75);
        } catch {
          return null;
        }
      };

      // ── HEADER ──────────────────────────────────────────────
      doc.setFillColor(...orange);
      doc.rect(0, 0, pageW, 42, "F");

      try {
        const logoImg = new window.Image();
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

      doc.setFontSize(14);
      doc.setTextColor(...white);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE AVARIAS", pageW - margin, 17, { align: "right" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("OTD Logistics", pageW - margin, 25, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin, 32, { align: "right" });

      y = 52;

      // ── SUMMARY ─────────────────────────────────────────────
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, y, contentW, 20, 2, 2, "F");

      const col = contentW / 4;
      const summaryItems = [
        { label: "Registros com Avaria", value: String(totalDamageRecords) },
        { label: "Fotos de Avaria", value: String(totalDamagePhotos) },
        { label: "Coletas", value: String(collectsWithDamage.length) },
        { label: "Transportes", value: String(transportsWithDamage.length) },
      ];
      summaryItems.forEach((item, i) => {
        const x = margin + col * i + col / 2;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...red);
        doc.text(item.value, x, y + 10, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...medGray);
        doc.text(item.label, x, y + 16, { align: "center" });
      });

      y += 28;

      // ── RECORDS ─────────────────────────────────────────────
      const allRecords: Array<{
        type: "coleta" | "transporte";
        id: string;
        identifier: string;
        chassi: string;
        driver: string;
        origin: string;
        destination: string;
        date: string;
        checkinPhotos: string[];
        checkoutPhotos: string[];
      }> = [
        ...collectsWithDamage.map((c) => ({
          type: "coleta" as const,
          id: c.id,
          identifier: c.vehicleChassi || "-",
          chassi: c.vehicleChassi || "-",
          driver: c.driver?.name || "-",
          origin: c.manufacturer?.name || "-",
          destination: c.yard?.name || "-",
          date: formatDate(c.collectDate),
          checkinPhotos: getCheckinPhotos(c),
          checkoutPhotos: getCheckoutPhotos(c),
        })),
        ...transportsWithDamage.map((t) => ({
          type: "transporte" as const,
          id: t.id,
          identifier: t.requestNumber || "-",
          chassi: t.vehicleChassi || "-",
          driver: (t as any).driver?.name || "-",
          origin: (t as any).originYard?.name || "-",
          destination: (t as any).deliveryLocation
            ? `${(t as any).deliveryLocation.city}/${(t as any).deliveryLocation.state}`
            : (t as any).client?.name || "-",
          date: formatDate(t.checkinDateTime || t.createdAt),
          checkinPhotos: getCheckinPhotos(t),
          checkoutPhotos: getCheckoutPhotos(t),
        })),
      ];

      for (let ri = 0; ri < allRecords.length; ri++) {
        const rec = allRecords[ri];
        const totalPhotos = rec.checkinPhotos.length + rec.checkoutPhotos.length;

        checkPageBreak(36);

        // Record header bar
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, y, contentW, 12, 1.5, 1.5, "F");

        // Type badge
        doc.setFillColor(...(rec.type === "coleta" ? ([59, 130, 246] as [number, number, number]) : ([107, 114, 128] as [number, number, number])));
        doc.roundedRect(margin + 2, y + 1.5, 28, 9, 1, 1, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...white);
        doc.text(rec.type === "coleta" ? "COLETA" : "TRANSPORTE", margin + 16, y + 7.5, { align: "center" });

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(rec.identifier, margin + 34, y + 8);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...medGray);
        doc.text(`${totalPhotos} foto${totalPhotos !== 1 ? "s" : ""} de avaria`, pageW - margin - 2, y + 8, { align: "right" });

        y += 16;

        // Fields row
        checkPageBreak(16);
        const fw = contentW / 4;
        const fields = [
          { label: "Chassi", value: rec.chassi },
          { label: "Motorista", value: rec.driver },
          { label: "Origem", value: rec.origin },
          { label: "Destino / Data", value: `${rec.destination} · ${rec.date}` },
        ];
        fields.forEach((f, fi) => {
          const fx = margin + fw * fi;
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...medGray);
          doc.text(f.label.toUpperCase(), fx, y);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...darkGray);
          const maxChars = Math.floor(fw / 2);
          const truncated = f.value.length > maxChars ? f.value.slice(0, maxChars - 1) + "…" : f.value;
          doc.text(truncated, fx, y + 5.5);
        });
        y += 12;

        // Photos
        const renderPhotos = async (photos: string[], sectionLabel: string) => {
          if (photos.length === 0) return;
          checkPageBreak(10);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...red);
          doc.text(sectionLabel.toUpperCase(), margin, y);
          y += 6;

          const photoW = 38;
          const photoH = 28;
          const gap = 4;
          const perRow = Math.floor(contentW / (photoW + gap));
          let col = 0;

          for (const photoUrl of photos) {
            if (col === 0) checkPageBreak(photoH + 6);
            const px = margin + col * (photoW + gap);
            const dataUrl = await loadImage(photoUrl);
            if (dataUrl) {
              doc.addImage(dataUrl, "JPEG", px, y, photoW, photoH);
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.2);
              doc.rect(px, y, photoW, photoH);
            } else {
              doc.setFillColor(240, 240, 240);
              doc.rect(px, y, photoW, photoH, "F");
              doc.setFontSize(7);
              doc.setTextColor(...medGray);
              doc.text("Foto indisponível", px + photoW / 2, y + photoH / 2, { align: "center" });
            }
            col++;
            if (col >= perRow) {
              col = 0;
              y += photoH + gap;
            }
          }
          if (col > 0) y += photoH + gap;
          y += 2;
        };

        await renderPhotos(rec.checkinPhotos, `Avarias no Check-in (${rec.checkinPhotos.length})`);
        await renderPhotos(rec.checkoutPhotos, `Avarias no Check-out (${rec.checkoutPhotos.length})`);

        y += 6;

        // Divider between records
        if (ri < allRecords.length - 1) {
          checkPageBreak(4);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(margin, y - 3, pageW - margin, y - 3);
        }
      }

      drawFooter();

      doc.save(`relatorio-avarias-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
    } finally {
      setPdfGenerating(false);
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
        actions={
          <Button
            onClick={generatePdf}
            disabled={pdfGenerating || isLoading || totalDamageRecords === 0}
            data-testid="button-generate-pdf"
          >
            {pdfGenerating ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                Gerando...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Gerar PDF
              </>
            )}
          </Button>
        }
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
