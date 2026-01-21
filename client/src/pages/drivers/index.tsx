import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Driver } from "@shared/schema";
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
import { DriverFormDialog } from "./form-dialog";

const modalityLabels: Record<string, string> = {
  pj: "PJ",
  clt: "CLT",
  agregado: "Agregado",
};

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Motorista excluído com sucesso" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir motorista", variant: "destructive" });
    },
  });

  const filteredDrivers = drivers?.filter(
    (driver) =>
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.cpf.includes(search) ||
      driver.phone.includes(search)
  );

  const handleNewDriver = () => {
    setEditingDriverId(null);
    setDialogOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setDialogOpen(true);
  };

  const columns = [
    { key: "name", label: "Nome" },
    { key: "cpf", label: "CPF" },
    { key: "phone", label: "Telefone" },
    {
      key: "modality",
      label: "Modalidade",
      render: (driver: Driver) => (
        <Badge variant="secondary" className="font-normal">
          {modalityLabels[driver.modality] || driver.modality}
        </Badge>
      ),
    },
    { key: "cnhType", label: "CNH" },
    {
      key: "isApto",
      label: "Apto",
      render: (driver: Driver) => (
        <Badge variant={driver.isApto === "true" ? "default" : "outline"}>
          {driver.isApto === "true" ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (driver: Driver) => (
        <Badge variant={driver.isActive === "true" ? "default" : "secondary"}>
          {driver.isActive === "true" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (driver: Driver) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEditDriver(driver);
            }}
            data-testid={`button-edit-${driver.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(driver.id);
            }}
            data-testid={`button-delete-${driver.id}`}
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
        title="Motoristas"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Motoristas" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-drivers"
            />
          </div>
          <Button onClick={handleNewDriver} data-testid="button-add-driver">
            <Plus className="mr-2 h-4 w-4" />
            Novo Motorista
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredDrivers ?? []}
          isLoading={isLoading}
          keyField="id"
          onRowClick={handleEditDriver}
          emptyMessage="Nenhum motorista cadastrado"
        />
      </div>

      <DriverFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driverId={editingDriverId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este motorista? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
