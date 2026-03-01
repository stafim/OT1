import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
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
  const [formVehicleValue, setFormVehicleValue] = useState("");

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
    setFormVehicleValue("");
  };

  const openAddDialog = () => {
    setEditingModel(null);
    setFormBrand("");
    setFormModel("");
    setFormAxle("");
    setFormConsumption("");
    setFormVehicleValue("");
    setShowDialog(true);
  };

  const openEditDialog = (model: TruckModel) => {
    setEditingModel(model);
    setFormBrand(model.brand);
    setFormModel(model.model);
    setFormAxle(model.axleConfig);
    setFormConsumption(model.averageConsumption);
    setFormVehicleValue(model.vehicleValue || "");
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

    const vehicleVal = formVehicleValue ? parseFloat(formVehicleValue) : null;

    const data: any = {
      brand: formBrand.trim().toUpperCase(),
      model: formModel.trim().toUpperCase(),
      axleConfig: formAxle,
      averageConsumption: consumption.toFixed(2),
      vehicleValue: vehicleVal !== null ? vehicleVal.toFixed(2) : null,
    };

    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeModels = (models?.filter(m => m.isActive !== "false") || [])
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));

  const filteredModels = activeModels.filter(m =>
    m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (axleLabelMap[m.axleConfig] || m.axleConfig).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "brand", label: "Marca" },
    { key: "model", label: "Modelo" },
    {
      key: "axleConfig",
      label: "Eixos",
      render: (m: TruckModel) => axleLabelMap[m.axleConfig] || m.axleConfig,
    },
    {
      key: "averageConsumption",
      label: "Consumo médio",
      render: (m: TruckModel) => `${parseFloat(m.averageConsumption).toFixed(1)} km/l`,
    },
    {
      key: "vehicleValue",
      label: "Valor do veículo",
      render: (m: TruckModel) =>
        m.vehicleValue
          ? parseFloat(m.vehicleValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "—",
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (m: TruckModel) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); openEditDialog(m); }}
            data-testid={`button-edit-model-${m.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); setDeletingId(m.id); }}
            data-testid={`button-delete-model-${m.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Modelos de Caminhão"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Modelos" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo ou eixo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-models"
            />
          </div>
          <Button onClick={openAddDialog} data-testid="button-add-model">
            <Plus className="mr-2 h-4 w-4" />
            Novo Modelo
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredModels}
          isLoading={isLoading}
          keyField="id"
          onRowClick={openEditDialog}
          emptyMessage="Nenhum modelo cadastrado"
        />
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
            <div className="space-y-2">
              <Label>Valor do Veículo (R$)</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={formVehicleValue}
                onChange={(e) => setFormVehicleValue(e.target.value)}
                placeholder="Ex: 350000"
                data-testid="input-model-vehicle-value"
              />
              <p className="text-xs text-muted-foreground">Valor médio do veículo deste modelo (opcional)</p>
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
