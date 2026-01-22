import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, Package, Users, Warehouse, TrendingUp, DollarSign, 
  Clock, MapPin, CheckCircle2, AlertCircle, Timer, LayoutGrid,
  Gauge, Star, Target, Activity, Zap, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar
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
  testId,
  color = "primary"
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any; 
  trend?: { value: number; label: string };
  isLoading?: boolean;
  testId: string;
  color?: "primary" | "success" | "warning" | "danger" | "blue" | "purple";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    danger: "bg-red-500/10 text-red-600",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
  };

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
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground block truncate">{title}</span>
            <span className="text-xl font-bold tracking-tight">{value}</span>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-0.5 text-xs ${trend.value >= 0 ? "text-green-600" : "text-red-600"}`}>
                <TrendingUp className={`h-3 w-3 ${trend.value < 0 ? "rotate-180" : ""}`} />
                <span>{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-md ${colorClasses[color]} shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Geral
function GeralDashboard({ analytics, isLoading }: { analytics: Analytics | undefined; isLoading: boolean }) {
  const combinedMonthlyData = analytics ? analytics.transportsByMonth.map((t, i) => ({
    name: t.name,
    transportes: t.transportes,
    coletas: analytics.collectsByMonth[i]?.coletas || 0,
  })) : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Transportes"
          value={analytics?.metrics.totalTransports ?? 0}
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-total-transports"
          color="blue"
        />
        <KPICard
          title="Coletas Realizadas"
          value={analytics?.metrics.totalCollects ?? 0}
          icon={Package}
          isLoading={isLoading}
          testId="kpi-total-collects"
          color="success"
        />
        <KPICard
          title="Motoristas Ativos"
          value={analytics?.metrics.totalDrivers ?? 0}
          icon={Users}
          isLoading={isLoading}
          testId="kpi-active-drivers"
          color="purple"
        />
        <KPICard
          title="Veículos em Estoque"
          value={analytics?.metrics.vehiclesInStock ?? 0}
          subtitle={`de ${analytics?.metrics.totalVehicles ?? 0} veículos`}
          icon={Warehouse}
          isLoading={isLoading}
          testId="kpi-vehicles-stock"
          color="warning"
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Taxa de Entrega"
          value={`${analytics?.metrics.deliveryRate ?? 0}%`}
          icon={CheckCircle2}
          isLoading={isLoading}
          testId="kpi-delivery-rate"
          color="success"
        />
        <KPICard
          title="Km Percorridos"
          value={analytics?.metrics.totalDistanceKm?.toLocaleString("pt-BR") ?? 0}
          subtitle="Total estimado"
          icon={MapPin}
          isLoading={isLoading}
          testId="kpi-total-km"
          color="blue"
        />
        <KPICard
          title="Tempo Médio Entrega"
          value={`${analytics?.metrics.avgDeliveryTimeHours ?? 0}h`}
          subtitle="Após autorização"
          icon={Timer}
          isLoading={isLoading}
          testId="kpi-avg-delivery"
          color="warning"
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

      <Card data-testid="chart-monthly-volume-geral">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Volume Mensal - Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combinedMonthlyData}>
                <defs>
                  <linearGradient id="colorTransportesGeral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chart1} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.chart1} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorColetasGeral" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorTransportesGeral)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="coletas" 
                  name="Coletas"
                  stroke={COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorColetasGeral)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard Transportes
function TransportesDashboard({ analytics, isLoading }: { analytics: Analytics | undefined; isLoading: boolean }) {
  const transportStatusData = analytics ? [
    { name: "Pendente", value: analytics.transportsByStatus.pendente, color: COLORS.warning },
    { name: "Aguard. Saída", value: analytics.transportsByStatus.aguardando_saida, color: COLORS.chart4 },
    { name: "Em Trânsito", value: analytics.transportsByStatus.em_transito, color: COLORS.chart1 },
    { name: "Entregue", value: analytics.transportsByStatus.entregue, color: COLORS.success },
    { name: "Cancelado", value: analytics.transportsByStatus.cancelado, color: COLORS.danger },
  ].filter(d => d.value > 0) : [];

  const totalTransportes = analytics?.metrics.totalTransports ?? 0;
  const entregues = analytics?.transportsByStatus.entregue ?? 0;
  const emTransito = analytics?.transportsByStatus.em_transito ?? 0;
  const pendentes = analytics?.transportsByStatus.pendente ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total de Transportes"
          value={totalTransportes}
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-transports-total"
          color="blue"
        />
        <KPICard
          title="Entregues"
          value={entregues}
          icon={CheckCircle2}
          isLoading={isLoading}
          testId="kpi-transports-delivered"
          color="success"
        />
        <KPICard
          title="Em Trânsito"
          value={emTransito}
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-transports-transit"
          color="blue"
        />
        <KPICard
          title="Pendentes"
          value={pendentes}
          icon={Clock}
          isLoading={isLoading}
          testId="kpi-transports-pending"
          color="warning"
        />
        <KPICard
          title="Cancelados"
          value={analytics?.transportsByStatus.cancelado ?? 0}
          icon={AlertCircle}
          isLoading={isLoading}
          testId="kpi-transports-cancelled"
          color="danger"
        />
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

        <Card data-testid="chart-transports-monthly">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Transportes por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics?.transportsByMonth || []}>
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
                  <Bar dataKey="transportes" name="Transportes" fill={COLORS.chart1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Dashboard Coletas
function ColetasDashboard({ analytics, isLoading }: { analytics: Analytics | undefined; isLoading: boolean }) {
  const collectStatusData = analytics ? [
    { name: "Pendente", value: analytics.collectsByStatus.pendente, color: COLORS.warning },
    { name: "Em Trânsito", value: analytics.collectsByStatus.em_transito, color: COLORS.chart1 },
    { name: "Entregue", value: analytics.collectsByStatus.entregue, color: COLORS.success },
    { name: "Cancelado", value: analytics.collectsByStatus.cancelado, color: COLORS.danger },
  ].filter(d => d.value > 0) : [];

  const totalColetas = analytics?.metrics.totalCollects ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Coletas"
          value={totalColetas}
          icon={Package}
          isLoading={isLoading}
          testId="kpi-collects-total"
          color="success"
        />
        <KPICard
          title="Entregues"
          value={analytics?.collectsByStatus.entregue ?? 0}
          icon={CheckCircle2}
          isLoading={isLoading}
          testId="kpi-collects-delivered"
          color="success"
        />
        <KPICard
          title="Em Trânsito"
          value={analytics?.collectsByStatus.em_transito ?? 0}
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-collects-transit"
          color="blue"
        />
        <KPICard
          title="Pendentes"
          value={analytics?.collectsByStatus.pendente ?? 0}
          icon={Clock}
          isLoading={isLoading}
          testId="kpi-collects-pending"
          color="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Card data-testid="chart-collects-monthly">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Coletas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics?.collectsByMonth || []}>
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
                  <Bar dataKey="coletas" name="Coletas" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Dashboard Motoristas
function MotoristasDashboard({ analytics, isLoading }: { analytics: Analytics | undefined; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Motoristas"
          value={analytics?.metrics.totalDrivers ?? 0}
          icon={Users}
          isLoading={isLoading}
          testId="kpi-drivers-total"
          color="purple"
        />
        <KPICard
          title="Entregas Realizadas"
          value={analytics?.transportsByStatus.entregue ?? 0}
          icon={CheckCircle2}
          isLoading={isLoading}
          testId="kpi-drivers-deliveries"
          color="success"
        />
        <KPICard
          title="Em Atividade"
          value={analytics?.transportsByStatus.em_transito ?? 0}
          icon={Activity}
          isLoading={isLoading}
          testId="kpi-drivers-active"
          color="blue"
        />
        <KPICard
          title="Média por Motorista"
          value={analytics?.metrics.totalDrivers 
            ? Math.round((analytics?.metrics.totalTransports ?? 0) / analytics.metrics.totalDrivers) 
            : 0}
          subtitle="transportes"
          icon={Target}
          isLoading={isLoading}
          testId="kpi-drivers-avg"
          color="warning"
        />
      </div>

      <Card data-testid="chart-driver-performance">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Ranking de Performance dos Motoristas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics?.driverPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={120} className="text-xs" />
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
  );
}

// Dashboard Eficiência
function EficienciaDashboard({ analytics, isLoading }: { analytics: Analytics | undefined; isLoading: boolean }) {
  const deliveryRate = analytics?.metrics.deliveryRate ?? 0;
  const avgTime = analytics?.metrics.avgDeliveryTimeHours ?? 0;
  
  const efficiencyData = [
    { name: "Taxa de Entrega", value: deliveryRate, fill: COLORS.success },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Taxa de Entrega"
          value={`${deliveryRate}%`}
          icon={Target}
          isLoading={isLoading}
          testId="kpi-efficiency-rate"
          color="success"
        />
        <KPICard
          title="Tempo Médio Entrega"
          value={`${avgTime}h`}
          icon={Timer}
          isLoading={isLoading}
          testId="kpi-efficiency-time"
          color="blue"
        />
        <KPICard
          title="Km Percorridos"
          value={analytics?.metrics.totalDistanceKm?.toLocaleString("pt-BR") ?? 0}
          icon={MapPin}
          isLoading={isLoading}
          testId="kpi-efficiency-km"
          color="purple"
        />
        <KPICard
          title="Veículos Movimentados"
          value={analytics?.metrics.totalVehicles ?? 0}
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-efficiency-vehicles"
          color="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="chart-efficiency-gauge">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Taxa de Sucesso nas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    barSize={20} 
                    data={efficiencyData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-16">
                  <p className="text-4xl font-bold text-green-600">{deliveryRate}%</p>
                  <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-efficiency-metrics">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Métricas de Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Entregas Concluídas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {analytics?.transportsByStatus.entregue ?? 0}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Coletas Concluídas</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {analytics?.collectsByStatus.entregue ?? 0}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prestações Aprovadas</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {analytics?.financials.approvedSettlements ?? 0}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("geral");
  const [period, setPeriod] = useState("all");
  
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/dashboard/analytics", period],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard de Gestão" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="geral" className="gap-2" data-testid="tab-geral">
              <LayoutGrid className="h-4 w-4 hidden sm:inline" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="transportes" className="gap-2" data-testid="tab-transportes">
              <Truck className="h-4 w-4 hidden sm:inline" />
              Transportes
            </TabsTrigger>
            <TabsTrigger value="coletas" className="gap-2" data-testid="tab-coletas">
              <Package className="h-4 w-4 hidden sm:inline" />
              Coletas
            </TabsTrigger>
            <TabsTrigger value="motoristas" className="gap-2" data-testid="tab-motoristas">
              <Users className="h-4 w-4 hidden sm:inline" />
              Motoristas
            </TabsTrigger>
            <TabsTrigger value="eficiencia" className="gap-2" data-testid="tab-eficiencia">
              <Gauge className="h-4 w-4 hidden sm:inline" />
              Eficiência
            </TabsTrigger>
            </TabsList>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-period">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Período</SelectItem>
                <SelectItem value="semester">Semestre</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="month">Mês Atual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="geral" className="space-y-4">
            <GeralDashboard analytics={analytics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="transportes" className="space-y-4">
            <TransportesDashboard analytics={analytics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="coletas" className="space-y-4">
            <ColetasDashboard analytics={analytics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="motoristas" className="space-y-4">
            <MotoristasDashboard analytics={analytics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="eficiencia" className="space-y-4">
            <EficienciaDashboard analytics={analytics} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
