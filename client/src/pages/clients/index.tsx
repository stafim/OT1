import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
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
import { ClientFormDialog } from "./form-dialog";

export default function ClientsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Cliente excluído com sucesso" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    },
  });

  const filteredData = clients?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj?.includes(search)
  );

  const handleNew = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (c: Client) => {
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleEditFullPage = (clientId: string) => {
    navigate(`/clientes/${clientId}`);
  };

  const columns = [
    { key: "name", label: "Nome" },
    { key: "cnpj", label: "CNPJ" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "contactName", label: "Contato" },
    {
      key: "isActive",
      label: "Status",
      render: (c: Client) => (
        <Badge variant={c.isActive === "true" ? "default" : "secondary"}>
          {c.isActive === "true" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-32",
      render: (c: Client) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clientes/${c.id}?tab=locais`);
            }}
            title="Gerenciar locais de entrega"
            data-testid={`button-locations-${c.id}`}
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(c);
            }}
            data-testid={`button-edit-${c.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(c.id);
            }}
            data-testid={`button-delete-${c.id}`}
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
        title="Clientes"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Clientes" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-clients"
            />
          </div>
          <Button onClick={handleNew} data-testid="button-add-client">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredData ?? []}
          isLoading={isLoading}
          keyField="id"
          onRowClick={handleEdit}
          emptyMessage="Nenhum cliente cadastrado"
        />
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={editingId}
        onEditFullPage={handleEditFullPage}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
