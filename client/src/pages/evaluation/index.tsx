import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Star, TrendingUp, Users } from "lucide-react";

export default function EvaluationPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Avaliação"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Avaliação" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Avaliações</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">avaliações realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Média Geral</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">nota média</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Motoristas Avaliados</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">motoristas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tendência</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">-</p>
              <p className="text-xs text-muted-foreground mt-1">vs. mês anterior</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">Módulo de Avaliação</h3>
            <p className="max-w-md mx-auto">
              Em breve você poderá avaliar motoristas, entregas e serviços realizados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
