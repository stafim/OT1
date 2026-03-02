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
import { Badge } from "@/components/ui/badge";
import { 
  Truck, Package, Users, Warehouse, TrendingUp, DollarSign, 
  Clock, MapPin, CheckCircle2, AlertCircle, Timer, LayoutGrid,
  Gauge, Star, Target, Activity, Zap, Calendar, Building, ArrowLeftRight, ChevronDown, ChevronUp
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

interface YardStat {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  total: number;
  statusBreakdown: Array<{ status: string; label: string; count: number; chassis: string[] }>;
}

interface YardStatsData {
  yardStats: YardStat[];
  totals: {
    totalYards: number;
    totalVehicles: number;
    em_estoque: number;
    pre_estoque: number;
    em_transferencia: number;
    despachado: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pre_estoque: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  em_estoque: "bg-green-500/20 text-green-700 dark:text-green-400",
  em_transferencia: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  despachado: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  entregue: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  retirado: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

const STATUS_CHART_COLORS: Record<string, string> = {
  pre_estoque: "#EAB308",
  em_estoque: "#22C55E",
  em_transferencia: "#A855F7",
  despachado: "#3B82F6",
  entregue: "#10B981",
  retirado: "#6B7280",
};

function YardCard({ yard }: { yard: YardStat }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden" data-testid={`card-yard-${yard.id}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
              <Building className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{yard.name}</CardTitle>
              {(yard.city || yard.state) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {[yard.city, yard.state].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{yard.total}</p>
            <p className="text-xs text-muted-foreground">chassis</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {yard.statusBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum veículo neste pátio</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {yard.statusBreakdown.map((s) => (
                <div
                  key={s.status}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground"}`}
                  data-testid={`badge-status-${yard.id}-${s.status}`}
                >
                  <span>{s.label}</span>
                  <span className="font-bold">{s.count}</span>
                </div>
              ))}
            </div>

            <button
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              onClick={() => setExpanded((e) => !e)}
              data-testid={`button-expand-yard-${yard.id}`}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Ocultar chassis" : "Ver chassis"}
            </button>

            {expanded && (
              <div className="space-y-2 pt-1">
                {yard.statusBreakdown.map((s) => (
                  <div key={s.status}>
                    <p className={`text-xs font-semibold mb-1 px-2 py-0.5 rounded w-fit ${STATUS_COLORS[s.status] ?? ""}`}>
                      {s.label} ({s.count})
                    </p>
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {s.chassis.map((chassi) => (
                        <Badge
                          key={chassi}
                          variant="outline"
                          className="font-mono text-xs"
                          data-testid={`badge-chassi-${chassi}`}
                        >
                          {chassi}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PatioDashboard() {
  const { data, isLoading } = useQuery<YardStatsData>({
    queryKey: ["/api/dashboard/yard-stats"],
  });

  const chartData = (data?.yardStats ?? [])
    .filter((y) => y.total > 0)
    .map((y) => {
      const row: Record<string, string | number> = { name: y.name };
      for (const s of y.statusBreakdown) {
        row[s.status] = s.count;
      }
      return row;
    });

  const allStatuses = Array.from(
    new Set((data?.yardStats ?? []).flatMap((y) => y.statusBreakdown.map((s) => s.status)))
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Pátios Ativos"
          value={data?.totals.totalYards ?? 0}
          subtitle="pátios cadastrados"
          icon={Building}
          isLoading={isLoading}
          testId="kpi-total-yards"
          color="primary"
        />
        <KPICard
          title="Total de Chassis"
          value={data?.totals.totalVehicles ?? 0}
          subtitle="veículos no sistema"
          icon={Truck}
          isLoading={isLoading}
          testId="kpi-total-vehicles-yard"
          color="blue"
        />
        <KPICard
          title="Em Estoque"
          value={data?.totals.em_estoque ?? 0}
          subtitle="prontos no pátio"
          icon={Warehouse}
          isLoading={isLoading}
          testId="kpi-em-estoque"
          color="success"
        />
        <KPICard
          title="Em Transferência"
          value={data?.totals.em_transferencia ?? 0}
          subtitle="entre pátios"
          icon={ArrowLeftRight}
          isLoading={isLoading}
          testId="kpi-em-transferencia"
          color="purple"
        />
      </div>

      {chartData.length > 0 && (
        <Card data-testid="chart-yard-vehicles">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Chassis por Pátio e Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value: number, name: string) => [
                      value,
                      { pre_estoque: "Pré-Estoque", em_estoque: "Em Estoque", em_transferencia: "Em Transferência", despachado: "Despachado", entregue: "Entregue", retirado: "Retirado" }[name] ?? name
                    ]}
                  />
                  <Legend formatter={(value) => ({ pre_estoque: "Pré-Estoque", em_estoque: "Em Estoque", em_transferencia: "Em Transferência", despachado: "Despachado", entregue: "Entregue", retirado: "Retirado" }[value] ?? value)} />
                  {allStatuses.map((status) => (
                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_CHART_COLORS[status] ?? "#94a3b8"} radius={status === allStatuses[allStatuses.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-muted-foreground" />
          Detalhes por Pátio
        </h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-40 mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (data?.yardStats ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <p className="text-muted-foreground">Nenhum pátio cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(data?.yardStats ?? []).map((yard) => (
              <YardCard key={yard.id} yard={yard} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("geral");
  const [period, setPeriod] = useState("all");
  
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: [`/api/dashboard/analytics?period=${period}`],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard de Gestão" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="patio" className="gap-2" data-testid="tab-patio">
              <Building className="h-4 w-4 hidden sm:inline" />
              Pátio
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

          <TabsContent value="patio" className="space-y-4">
            <PatioDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
