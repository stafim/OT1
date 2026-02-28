import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Truck,
  Fuel,
  Settings2,
} from "lucide-react";
import type { TruckModel } from "@shared/schema";

const axleOptions = [
  { value: "2_eixos", label: "2 Eixos" },
  { value: "3_eixos", label: "3 Eixos" },
  { value: "4_eixos", label: "4 Eixos" },
  { value: "5_eixos", label: "5 Eixos" },
  { value: "6_eixos", label: "6 Eixos" },
  { value: "7_eixos", label: "7 Eixos" },
  { value: "8_eixos", label: "8 Eixos" },
  { value: "9_eixos", label: "9 Eixos" },
];

const axleLabelMap: Record<string, string> = {};
axleOptions.forEach(o => { axleLabelMap[o.value] = o.label; });

export default function TruckModelsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<TruckModel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formAxle, setFormAxle] = useState("");
  const [formConsumption, setFormConsumption] = useState("");

  const { data: models, isLoading } = useQuery<TruckModel[]>({
    queryKey: ["/api/truck-models"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/truck-models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/truck-models"] });
      closeDialog();
      toast({ title: "Modelo cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar modelo", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/truck-models/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/truck-models"] });
      closeDialog();
      toast({ title: "Modelo atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar modelo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/truck-models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/truck-models"] });
      setDeletingId(null);
      toast({ title: "Modelo removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover modelo", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingModel(null);
    setFormBrand("");
    setFormModel("");
    setFormAxle("");
    setFormConsumption("");
  };

  const openAddDialog = () => {
    setEditingModel(null);
    setFormBrand("");
    setFormModel("");
    setFormAxle("");
    setFormConsumption("");
    setShowDialog(true);
  };

  const openEditDialog = (model: TruckModel) => {
    setEditingModel(model);
    setFormBrand(model.brand);
    setFormModel(model.model);
    setFormAxle(model.axleConfig);
    setFormConsumption(model.averageConsumption);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formBrand.trim()) {
      toast({ title: "Marca é obrigatória", variant: "destructive" });
      return;
    }
    if (!formModel.trim()) {
      toast({ title: "Modelo é obrigatório", variant: "destructive" });
      return;
    }
    if (!formAxle) {
      toast({ title: "Configuração de eixo é obrigatória", variant: "destructive" });
      return;
    }
    const consumption = parseFloat(formConsumption);
    if (isNaN(consumption) || consumption <= 0) {
      toast({ title: "Consumo médio deve ser maior que 0", variant: "destructive" });
      return;
    }

    const data = {
      brand: formBrand.trim().toUpperCase(),
      model: formModel.trim().toUpperCase(),
      axleConfig: formAxle,
      averageConsumption: consumption.toFixed(2),
    };

    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeModels = models?.filter(m => m.isActive !== "false") || [];

  const filteredModels = activeModels.filter(m =>
    m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (axleLabelMap[m.axleConfig] || m.axleConfig).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByBrand = filteredModels.reduce((acc, model) => {
    if (!acc[model.brand]) acc[model.brand] = [];
    acc[model.brand].push(model);
    return acc;
  }, {} as Record<string, TruckModel[]>);

  const sortedBrands = Object.keys(groupedByBrand).sort();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Modelos de Caminhão" />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Modelos de Caminhão"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Modelos" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo ou eixo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-models"
            />
          </div>
          <Button onClick={openAddDialog} data-testid="button-add-model">
            <Plus className="h-4 w-4 mr-1" />
            Novo Modelo
          </Button>
        </div>

        {activeModels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhum modelo cadastrado</h3>
              <p className="max-w-md mx-auto mb-4">
                Cadastre marcas e modelos de caminhão com configuração de eixo e consumo médio.
              </p>
              <Button onClick={openAddDialog} data-testid="button-add-model-empty">
                <Plus className="h-4 w-4 mr-1" />
                Cadastrar Primeiro Modelo
              </Button>
            </CardContent>
          </Card>
        ) : filteredModels.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Nenhum modelo encontrado para "{searchTerm}"</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedBrands.map(brand => (
              <div key={brand}>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{brand}</h2>
                  <Badge variant="secondary" className="text-xs">{groupedByBrand[brand].length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedByBrand[brand].map(model => (
                    <Card key={model.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" data-testid={`text-model-name-${model.id}`}>
                              {model.model}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Settings2 className="h-3 w-3" />
                                <span>{axleLabelMap[model.axleConfig] || model.axleConfig}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Fuel className="h-3 w-3" />
                                <span>{parseFloat(model.averageConsumption).toFixed(1)} km/l</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(model)}
                              data-testid={`button-edit-model-${model.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setDeletingId(model.id)}
                              data-testid={`button-delete-model-${model.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          Total: {activeModels.length} modelo{activeModels.length !== 1 ? "s" : ""} cadastrado{activeModels.length !== 1 ? "s" : ""}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? "Editar Modelo" : "Novo Modelo de Caminhão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                placeholder="Ex: VOLVO, SCANIA, MERCEDES"
                data-testid="input-model-brand"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="Ex: FH 540, R 450, ACTROS 2651"
                data-testid="input-model-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Configuração de Eixo</Label>
              <Select value={formAxle} onValueChange={setFormAxle}>
                <SelectTrigger data-testid="select-model-axle">
                  <SelectValue placeholder="Selecione o tipo de eixo" />
                </SelectTrigger>
                <SelectContent>
                  {axleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consumo Médio (km/l)</Label>
              <Input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                value={formConsumption}
                onChange={(e) => setFormConsumption(e.target.value)}
                placeholder="Ex: 2.5"
                data-testid="input-model-consumption"
              />
              <p className="text-xs text-muted-foreground">Quantos quilômetros o caminhão roda com 1 litro de diesel</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-model"
            >
              {editingModel ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este modelo de caminhão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              data-testid="button-confirm-delete-model"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
