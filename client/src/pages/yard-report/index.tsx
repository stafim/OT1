import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart, Warehouse, Truck, Package } from "lucide-react";

export default function YardReportPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Relatório de Pátio"
        breadcrumbs={[
          { label: "Financeiro", href: "/" },
          { label: "Relatório de Pátio" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total em Pátio</CardTitle>
                <Warehouse className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">veículos armazenados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entradas Hoje</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">novos veículos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saídas Hoje</CardTitle>
                <Truck className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">veículos expedidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio</CardTitle>
                <FileBarChart className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">dias em pátio</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileBarChart className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">Relatório de Pátio</h3>
            <p className="max-w-md mx-auto">
              Em breve você poderá visualizar relatórios detalhados de movimentação e ocupação dos pátios.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
