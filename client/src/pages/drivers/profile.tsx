import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  User,
  Truck,
  MapPin,
  Star,
  StarOff,
  AlertTriangle,
  FileText,
  Pencil,
  Calendar,
  Clock,
  Route,
  TrendingUp,
  ChevronsUpDown,
  Check,
  Search,
  ShieldCheck,
  ShieldAlert,
  Shield,
  CheckCircle2,
  Activity,
  Printer,
} from "lucide-react";
import type { Driver, Yard, DeliveryLocation } from "@shared/schema";

interface DriverEvaluation {
  id: string;
  weightedScore: string | null;
  averageScore: string | null;
  hadIncident: string | null;
  incidentDescription: string | null;
  createdAt: string;
}

interface TripWithDetails {
  id: string;
  requestNumber: string;
  vehicleChassi: string;
  status: string;
  checkinDateTime: string | null;
  checkoutDateTime: string | null;
  deliveryDate: string | null;
  createdAt: string;
  originYard: Yard | null;
  deliveryLocation: DeliveryLocation | null;
  evaluation: DriverEvaluation | null;
}

interface DriverProfile {
  driver: Driver;
  kpis: {
    totalTrips: number;
    totalKm: string;
    avgScore: string | null;
    incidentCount: number;
  };
  monthlyPerformance: Array<{ month: string; score: number | null; trips: number }>;
  recentTrips: TripWithDetails[];
  infractions: Array<{ id: string; date: string; description: string | null; score: string | null }>;
  isOnTrip: boolean;
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDateTime = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
};

const getTenure = (createdAt: string) => {
  const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "menos de 1 mês";
  if (months < 12) return `${months} mês${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years} ano${years > 1 ? "s" : ""}${rem > 0 ? ` e ${rem} mês${rem > 1 ? "es" : ""}` : ""}`;
};

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

function ScoreCircle({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold leading-none" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function StarRating({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const stars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) =>
        s <= stars ? (
          <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ) : (
          <StarOff key={s} className="h-3.5 w-3.5 text-muted-foreground/40" />
        )
      )}
      <span className="ml-1 text-xs text-muted-foreground">{score.toFixed(0)}</span>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted/50`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-primary">Score: <span className="font-bold">{payload[0]?.value ?? "—"}</span></p>
        <p className="text-muted-foreground">Viagens: {payload[0]?.payload?.trips ?? 0}</p>
      </div>
    );
  }
  return null;
};

export default function DriverProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const { data: allDrivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: profile, isLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/drivers", id, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${id}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar perfil");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Perfil do Motorista" />
        <div className="p-6 space-y-6">
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Perfil do Motorista" />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Motorista não encontrado.</p>
        </div>
      </div>
    );
  }

  const { driver, kpis, monthlyPerformance, recentTrips, infractions, isOnTrip } = profile;
  const avgScore = kpis.avgScore ? parseFloat(kpis.avgScore) : null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Perfil do Motorista"
        breadcrumbs={[
          { label: "Motoristas", href: "/motoristas" },
          { label: driver.name },
        ]}
      />

      {/* Driver Selector Bar */}
      <div className="border-b bg-muted/30 px-4 md:px-6 py-3 print:hidden">
        <div className="flex items-center gap-3 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal text-sm h-9"
                data-testid="button-driver-selector"
              >
                <span className="truncate">{driver.name}</span>
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar motorista..." data-testid="input-driver-search" />
                <CommandList>
                  <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                  <CommandGroup>
                    {allDrivers?.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={d.name}
                        onSelect={() => {
                          setOpen(false);
                          navigate(`/motoristas/${d.id}/perfil`);
                        }}
                        data-testid={`driver-option-${d.id}`}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${d.id === id ? "opacity-100" : "opacity-0"}`}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{d.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {d.city}/{d.state} · CNH {d.cnhType}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 print:p-4">

        {/* Header Card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                {driver.profilePhoto ? (
                  <img
                    src={driver.profilePhoto}
                    alt={driver.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border shadow"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow">
                    <span className="text-2xl font-bold text-primary">{getInitials(driver.name)}</span>
                  </div>
                )}
                <span
                  className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-background ${
                    isOnTrip ? "bg-green-500" : "bg-slate-400"
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold truncate">{driver.name}</h2>
                  <Badge
                    variant={isOnTrip ? "default" : "secondary"}
                    className={isOnTrip ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                    data-testid="badge-driver-status"
                  >
                    {isOnTrip ? "Em Viagem" : "Em Descanso"}
                  </Badge>
                  {driver.isApto === "true" && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Apto
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    CNH {driver.cnhType}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {driver.modality?.toUpperCase()}
                  </span>
                  {driver.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {driver.city}/{driver.state}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {getTenure(driver.createdAt!.toString())} de empresa
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  data-testid="button-print-profile"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Gerar Relatório PDF
                </Button>
                <Link href={`/motoristas/${id}`}>
                  <Button size="sm" data-testid="button-edit-profile">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Score circular */}
          <Card>
            <CardContent className="p-5 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground self-start">Score de Condução</p>
              {avgScore !== null ? (
                <ScoreCircle score={avgScore} />
              ) : (
                <div className="h-[110px] flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Sem dados</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">média ponderada</p>
            </CardContent>
          </Card>

          <KpiCard
            icon={Route}
            label="Km Rodados"
            value={
              parseFloat(kpis.totalKm) > 0
                ? parseFloat(kpis.totalKm).toLocaleString("pt-BR") + " km"
                : "—"
            }
            sub="acumulado total"
            color="text-blue-500"
          />

          <KpiCard
            icon={Truck}
            label="Viagens Concluídas"
            value={kpis.totalTrips.toLocaleString("pt-BR")}
            sub="transportes entregues"
            color="text-emerald-500"
          />

          <KpiCard
            icon={AlertTriangle}
            label="Imprevistos"
            value={kpis.incidentCount}
            sub={kpis.incidentCount === 0 ? "nenhum registrado" : "ocorrências registradas"}
            color={kpis.incidentCount === 0 ? "text-green-500" : "text-orange-500"}
          />
        </div>

        {/* Chart + Security */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Performance Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Performance nos Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyPerformance.every((m) => m.score === null) ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Sem avaliações no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyPerformance} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {monthlyPerformance.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.score === null
                              ? "hsl(var(--muted))"
                              : entry.score >= 80
                              ? "#22c55e"
                              : entry.score >= 60
                              ? "#f59e0b"
                              : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Security / CNH */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Documentação e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">CNH Tipo {driver.cnhType}</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    driver.documentsApproved === "aprovado"
                      ? "text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20"
                      : "text-orange-600 border-orange-300"
                  }
                >
                  {driver.documentsApproved === "aprovado" ? "Aprovada" : "Pendente"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Aptidão</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    driver.isApto === "true"
                      ? "text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20"
                      : "text-red-600 border-red-300"
                  }
                >
                  {driver.isApto === "true" ? "Apto" : "Inapto"}
                </Badge>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Últimos Imprevistos ({infractions.length})
                </p>
                {infractions.length === 0 ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span className="text-xs">Nenhum imprevisto registrado</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {infractions.map((inf) => (
                      <div
                        key={inf.id}
                        className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        data-testid={`infraction-${inf.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {formatDate(inf.date)}
                          </span>
                          {inf.score && (
                            <span className="text-[10px] text-muted-foreground">
                              Score: {parseFloat(inf.score).toFixed(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {inf.description || "Sem descrição"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip History Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Histórico de Viagens ({recentTrips.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Truck className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma viagem registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">OTD</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Veículo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Origem</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Destino</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Check-in</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Check-out</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Avaliação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="hover:bg-muted/20 transition-colors"
                        data-testid={`trip-row-${trip.id}`}
                      >
                        <td className="px-4 py-3 font-medium text-primary text-xs">{trip.requestNumber}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(trip.deliveryDate || trip.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs hidden sm:table-cell font-mono text-muted-foreground">
                          {trip.vehicleChassi?.slice(-6) || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs hidden md:table-cell text-muted-foreground">
                          {trip.originYard?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs hidden md:table-cell text-muted-foreground">
                          {trip.deliveryLocation ? `${trip.deliveryLocation.city}/${trip.deliveryLocation.state}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                          {formatDateTime(trip.checkinDateTime)}
                        </td>
                        <td className="px-4 py-3 text-xs hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                          {formatDateTime(trip.checkoutDateTime)}
                        </td>
                        <td className="px-4 py-3">
                          <StarRating
                            score={
                              trip.evaluation
                                ? parseFloat(trip.evaluation.weightedScore || trip.evaluation.averageScore || "0")
                                : null
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:p-4 { padding: 1rem !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
