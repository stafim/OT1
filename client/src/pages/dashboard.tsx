import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Truck, Package, Users, Warehouse, TrendingUp, DollarSign, 
  Clock, MapPin, CheckCircle2, AlertCircle, Timer
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

interface Analytics {
  transportsByStatus: {
    pendente: number;
    aguardando_saida: number;
    em_transito: number;
    entregue: number;
    cancelado: number;
  };
  collectsByStatus: {
    pendente: number;
    em_transito: number;
    entregue: number;
    cancelado: number;
  };
  transportsByMonth: Array<{ name: string; transportes: number }>;
  collectsByMonth: Array<{ name: string; coletas: number }>;
  driverPerformance: Array<{ name: string; entregues: number; emAndamento: number; total: number }>;
  financials: {
    totalExpenses: number;
    approvedSettlements: number;
    pendingSettlements: number;
    totalSettlements: number;
  };
  metrics: {
    totalTransports: number;
    totalCollects: number;
    totalDrivers: number;
    totalVehicles: number;
    vehiclesInStock: number;
    totalDistanceKm: number;
    avgDeliveryTimeHours: number;
    deliveryRate: number;
  };
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  muted: "hsl(var(--muted-foreground))",
  chart1: "hsl(221, 83%, 53%)",
  chart2: "hsl(142, 71%, 45%)",
  chart3: "hsl(38, 92%, 50%)",
  chart4: "hsl(262, 83%, 58%)",
  chart5: "hsl(0, 84%, 60%)",
};

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  isLoading,
  testId 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any; 
  trend?: { value: number; label: string };
  isLoading?: boolean;
  testId: string;
}) {
  if (isLoading) {
    return (
      <Card data-testid={testId}>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={testId} className="hover-elevate transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-4xl font-bold tracking-tight">{value}</span>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.value >= 0 ? "text-green-600" : "text-red-600"}`}>
              <TrendingUp className={`h-4 w-4 ${trend.value < 0 ? "rotate-180" : ""}`} />
              <span>{trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/dashboard/analytics"],
  });

  const transportStatusData = analytics ? [
    { name: "Pendente", value: analytics.transportsByStatus.pendente, color: COLORS.warning },
    { name: "Aguard. Saída", value: analytics.transportsByStatus.aguardando_saida, color: COLORS.chart4 },
    { name: "Em Trânsito", value: analytics.transportsByStatus.em_transito, color: COLORS.chart1 },
    { name: "Entregue", value: analytics.transportsByStatus.entregue, color: COLORS.success },
    { name: "Cancelado", value: analytics.transportsByStatus.cancelado, color: COLORS.danger },
  ].filter(d => d.value > 0) : [];

  const collectStatusData = analytics ? [
    { name: "Pendente", value: analytics.collectsByStatus.pendente, color: COLORS.warning },
    { name: "Em Trânsito", value: analytics.collectsByStatus.em_transito, color: COLORS.chart1 },
    { name: "Entregue", value: analytics.collectsByStatus.entregue, color: COLORS.success },
    { name: "Cancelado", value: analytics.collectsByStatus.cancelado, color: COLORS.danger },
  ].filter(d => d.value > 0) : [];

  const combinedMonthlyData = analytics ? analytics.transportsByMonth.map((t, i) => ({
    name: t.name,
    transportes: t.transportes,
    coletas: analytics.collectsByMonth[i]?.coletas || 0,
  })) : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard de Gestão" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total de Transportes"
            value={analytics?.metrics.totalTransports ?? 0}
            icon={Truck}
            isLoading={isLoading}
            testId="kpi-total-transports"
          />
          <KPICard
            title="Coletas Realizadas"
            value={analytics?.metrics.totalCollects ?? 0}
            icon={Package}
            isLoading={isLoading}
            testId="kpi-total-collects"
          />
          <KPICard
            title="Motoristas Ativos"
            value={analytics?.metrics.totalDrivers ?? 0}
            icon={Users}
            isLoading={isLoading}
            testId="kpi-active-drivers"
          />
          <KPICard
            title="Veículos em Estoque"
            value={analytics?.metrics.vehiclesInStock ?? 0}
            subtitle={`de ${analytics?.metrics.totalVehicles ?? 0} veículos`}
            icon={Warehouse}
            isLoading={isLoading}
            testId="kpi-vehicles-stock"
          />
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Taxa de Entrega"
            value={`${analytics?.metrics.deliveryRate ?? 0}%`}
            icon={CheckCircle2}
            isLoading={isLoading}
            testId="kpi-delivery-rate"
          />
          <KPICard
            title="Km Percorridos"
            value={analytics?.metrics.totalDistanceKm?.toLocaleString("pt-BR") ?? 0}
            subtitle="Total estimado"
            icon={MapPin}
            isLoading={isLoading}
            testId="kpi-total-km"
          />
          <KPICard
            title="Tempo Médio Entrega"
            value={`${analytics?.metrics.avgDeliveryTimeHours ?? 0}h`}
            subtitle="Após autorização"
            icon={Timer}
            isLoading={isLoading}
            testId="kpi-avg-delivery"
          />
          <KPICard
            title="Total em Despesas"
            value={`R$ ${(analytics?.financials.totalExpenses ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            subtitle={`${analytics?.financials.approvedSettlements ?? 0} aprovadas`}
            icon={DollarSign}
            isLoading={isLoading}
            testId="kpi-total-expenses"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-testid="chart-monthly-volume">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Volume Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={combinedMonthlyData}>
                    <defs>
                      <linearGradient id="colorTransportes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.chart1} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.chart1} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorColetas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="transportes" 
                      name="Transportes"
                      stroke={COLORS.chart1} 
                      fillOpacity={1} 
                      fill="url(#colorTransportes)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="coletas" 
                      name="Coletas"
                      stroke={COLORS.success} 
                      fillOpacity={1} 
                      fill="url(#colorColetas)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-testid="chart-driver-performance">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Performance dos Motoristas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.driverPerformance || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="entregues" name="Entregues" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="emAndamento" name="Em Andamento" fill={COLORS.chart1} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-testid="chart-transport-status">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Status dos Transportes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : transportStatusData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum transporte registrado</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={transportStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {transportStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {transportStatusData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm flex-1">{item.name}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="chart-collect-status">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Status das Coletas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : collectStatusData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma coleta registrada</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={collectStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {collectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {collectStatusData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm flex-1">{item.name}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card data-testid="card-financial-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground">Prestações Aprovadas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics?.financials.approvedSettlements ?? 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-muted-foreground">Prestações Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {analytics?.financials.pendingSettlements ?? 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {(analytics?.financials.totalExpenses ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2" data-testid="card-quick-stats">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Indicadores Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500/10">
                        <Truck className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.transportsByStatus.em_transito ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Em Trânsito</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-yellow-500/10">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.transportsByStatus.aguardando_saida ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Aguard. Saída</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.transportsByStatus.entregue ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Entregues</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-500/10">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.transportsByStatus.pendente ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Pendentes</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
