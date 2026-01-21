import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Users, Warehouse } from "lucide-react";
import type { Transport, Collect, Vehicle, Driver } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalTransports: number;
  collectsInTransit: number;
  vehiclesInStock: number;
  activeDrivers: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentTransports, isLoading: transportsLoading } = useQuery<Transport[]>({
    queryKey: ["/api/transports", "recent"],
  });

  const { data: recentCollects, isLoading: collectsLoading } = useQuery<Collect[]>({
    queryKey: ["/api/collects", "recent"],
  });

  const transportColumns = [
    { key: "requestNumber", label: "Nº Solicitação" },
    { key: "vehicleChassi", label: "Chassi" },
    {
      key: "status",
      label: "Status",
      render: (item: Transport) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      label: "Data",
      render: (item: Transport) =>
        item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "-",
    },
  ];

  const collectColumns = [
    { key: "vehicleChassi", label: "Chassi" },
    {
      key: "status",
      label: "Status",
      render: (item: Collect) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      label: "Data",
      render: (item: Collect) =>
        item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "-",
    },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader title="Dashboard" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Transportes"
            value={stats?.totalTransports ?? 0}
            icon={Truck}
            isLoading={statsLoading}
            testId="stat-total-transports"
          />
          <StatCard
            title="Coletas em Trânsito"
            value={stats?.collectsInTransit ?? 0}
            icon={Package}
            isLoading={statsLoading}
            testId="stat-collects-in-transit"
          />
          <StatCard
            title="Veículos em Estoque"
            value={stats?.vehiclesInStock ?? 0}
            icon={Warehouse}
            isLoading={statsLoading}
            testId="stat-vehicles-stock"
          />
          <StatCard
            title="Motoristas Ativos"
            value={stats?.activeDrivers ?? 0}
            icon={Users}
            isLoading={statsLoading}
            testId="stat-active-drivers"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transportes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={transportColumns}
                data={recentTransports ?? []}
                isLoading={transportsLoading}
                keyField="id"
                emptyMessage="Nenhum transporte encontrado"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coletas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={collectColumns}
                data={recentCollects ?? []}
                isLoading={collectsLoading}
                keyField="id"
                emptyMessage="Nenhuma coleta encontrada"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
