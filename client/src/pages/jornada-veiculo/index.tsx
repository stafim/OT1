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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Search,
  Printer,
  Check,
  ChevronsUpDown,
  Truck,
  Warehouse,
  Package,
  CheckCircle2,
  Circle,
  Camera,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  FileText,
  Clock,
  Car,
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
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState("");
  const [selectedChassi, setSelectedChassi] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("coleta");

  const { data: vehiclesList } = useQuery<VehicleItem[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: journey, isLoading: journeyLoading } = useQuery<VehicleJourney>({
    queryKey: ["/api/vehicle-journey", selectedChassi],
    enabled: !!selectedChassi,
  });

  const filteredVehicles = (vehiclesList ?? []).filter((v) => {
    const q = input.toLowerCase();
    return (
      v.chassi.toLowerCase().includes(q) ||
      (v.manufacturer?.name ?? "").toLowerCase().includes(q) ||
      (v.client?.name ?? "").toLowerCase().includes(q)
    );
  });

  function handlePrint() {
    window.print();
  }

  const v = journey?.vehicle;
  const statusCfg = v ? (statusConfig[v.status] ?? { label: v.status, color: "text-gray-600", badgeClass: "bg-gray-100 text-gray-800 border-gray-200" }) : null;

  const latestCollect   = journey?.collects?.[journey.collects.length - 1];
  const latestTransport = journey?.transports?.[journey.transports.length - 1];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <PageHeader
        title="Jornada do Veículo"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Jornada do Veículo" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Buscar Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Selecione um veículo pelo chassi, montadora ou cliente
                </p>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between max-w-md"
                      data-testid="combobox-vehicle-search"
                    >
                      {selectedChassi
                        ? selectedChassi
                        : "Selecione um veículo..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Chassi, montadora ou cliente..."
                        value={input}
                        onValueChange={setInput}
                        data-testid="input-vehicle-search"
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                        <CommandGroup>
                          {filteredVehicles.slice(0, 30).map((v) => {
                            const cfg = statusConfig[v.status];
                            return (
                              <CommandItem
                                key={v.chassi}
                                value={v.chassi}
                                onSelect={() => {
                                  setSelectedChassi(v.chassi);
                                  setInput(v.chassi);
                                  setOpen(false);
                                  setActiveTab("coleta");
                                }}
                                data-testid={`option-vehicle-${v.chassi}`}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedChassi === v.chassi ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="font-mono text-sm font-medium">{v.chassi}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {v.manufacturer?.name ?? "—"} · {cfg?.label ?? v.status}
                                  </span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedChassi && (
                <Button
                  variant="outline"
                  onClick={() => { setSelectedChassi(null); setInput(""); }}
                  className="shrink-0"
                  data-testid="button-clear-selection"
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedChassi && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center text-muted-foreground">
            <Car className="mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Selecione um veículo</p>
            <p className="text-sm mt-1">Use o campo acima para buscar pelo chassi</p>
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
                <Timeline status={journey.vehicle.status} />
              </CardContent>
            </Card>

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
                      className="no-print gap-2"
                      data-testid="button-print-dossie"
                    >
                      <Printer className="h-4 w-4" />
                      Gerar PDF do Dossiê
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
