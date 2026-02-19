import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  User,
  DollarSign,
  Truck,
  Eye,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertContractSchema, type Contract, type Driver } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContractWithDriver = Contract & { driver: Driver | null };

const contractTypeLabels: Record<string, string> = {
  pj: "PJ",
  clt: "CLT",
  agregado: "Agregado",
};

const paymentTypeLabels: Record<string, string> = {
  por_km: "Por Km",
  fixo_mensal: "Fixo Mensal",
  por_entrega: "Por Entrega",
  comissao: "Comissão",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suspenso: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  expirado: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const formSchema = insertContractSchema.extend({
  driverId: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  truckType: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  cnhRequired: z.string().optional().or(z.literal("")),
  workRegion: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithDriver | null>(null);
  const [viewingContract, setViewingContract] = useState<ContractWithDriver | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { toast } = useToast();

  const { data: contractsList, isLoading } = useQuery<ContractWithDriver[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: driversList } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractNumber: "",
      driverId: "",
      contractType: "pj",
      status: "ativo",
      startDate: "",
      endDate: "",
      paymentType: "por_km",
      paymentValue: "",
      truckType: "",
      licensePlate: "",
      cnhRequired: "",
      workRegion: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        ...data,
        driverId: data.driverId || null,
        endDate: data.endDate || null,
        truckType: data.truckType || null,
        licensePlate: data.licensePlate || null,
        cnhRequired: data.cnhRequired || null,
        workRegion: data.workRegion || null,
        notes: data.notes || null,
      };
      await apiRequest("POST", "/api/contracts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contrato criado com sucesso" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao criar contrato", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormValues }) => {
      const payload = {
        ...data,
        driverId: data.driverId || null,
        endDate: data.endDate || null,
        truckType: data.truckType || null,
        licensePlate: data.licensePlate || null,
        cnhRequired: data.cnhRequired || null,
        workRegion: data.workRegion || null,
        notes: data.notes || null,
      };
      await apiRequest("PATCH", `/api/contracts/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contrato atualizado com sucesso" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: error.message || "Erro ao atualizar contrato", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contrato excluído com sucesso" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir contrato", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContract(null);
    form.reset({
      contractNumber: "",
      driverId: "",
      contractType: "pj",
      status: "ativo",
      startDate: "",
      endDate: "",
      paymentType: "por_km",
      paymentValue: "",
      truckType: "",
      licensePlate: "",
      cnhRequired: "",
      workRegion: "",
      notes: "",
    });
  };

  const handleEdit = (contract: ContractWithDriver) => {
    setEditingContract(contract);
    form.reset({
      contractNumber: contract.contractNumber,
      driverId: contract.driverId || "",
      contractType: contract.contractType as "pj" | "clt" | "agregado",
      status: contract.status as "ativo" | "suspenso" | "expirado" | "cancelado",
      startDate: contract.startDate,
      endDate: contract.endDate || "",
      paymentType: contract.paymentType as "por_km" | "fixo_mensal" | "por_entrega" | "comissao",
      paymentValue: contract.paymentValue || "",
      truckType: contract.truckType || "",
      licensePlate: contract.licensePlate || "",
      cnhRequired: contract.cnhRequired || "",
      workRegion: contract.workRegion || "",
      notes: contract.notes || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredContracts = contractsList?.filter((c) => {
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.driver?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.licensePlate?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contractsList?.length || 0,
    ativos: contractsList?.filter((c) => c.status === "ativo").length || 0,
    suspensos: contractsList?.filter((c) => c.status === "suspenso").length || 0,
    expirados: contractsList?.filter((c) => c.status === "expirado").length || 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Gestor de Contratos"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold" data-testid="text-total-contracts">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FileText className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold" data-testid="text-active-contracts">{stats.ativos}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <FileText className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl font-bold" data-testid="text-suspended-contracts">{stats.suspensos}</p>
                <p className="text-xs text-muted-foreground">Suspensos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <FileText className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xl font-bold" data-testid="text-expired-contracts">{stats.expirados}</p>
                <p className="text-xs text-muted-foreground">Expirados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, motorista ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-contracts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="suspenso">Suspensos</SelectItem>
            <SelectItem value="expirado">Expirados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-contract">
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredContracts && filteredContracts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                      <TableCell className="font-medium" data-testid={`text-contract-number-${contract.id}`}>
                        {contract.contractNumber}
                      </TableCell>
                      <TableCell data-testid={`text-contract-driver-${contract.id}`}>
                        {contract.driver?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contractTypeLabels[contract.contractType] || contract.contractType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {paymentTypeLabels[contract.paymentType] || contract.paymentType}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {parseFloat(contract.paymentValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {contract.startDate ? format(new Date(contract.startDate + "T12:00:00"), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {contract.endDate ? format(new Date(contract.endDate + "T12:00:00"), "dd/MM/yyyy") : "Indeterminado"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[contract.status] || ""}`}>
                          {statusLabels[contract.status] || contract.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setViewingContract(contract); setViewDialogOpen(true); }}
                            data-testid={`button-view-contract-${contract.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(contract)}
                            data-testid={`button-edit-contract-${contract.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(contract.id)}
                            data-testid={`button-delete-contract-${contract.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-new-contract-empty">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Contrato
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Contrato *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CTR-001" {...field} data-testid="input-contract-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motorista</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-driver">
                            <SelectValue placeholder="Selecione o motorista" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {driversList?.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contrato *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contract-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pj">PJ</SelectItem>
                          <SelectItem value="clt">CLT</SelectItem>
                          <SelectItem value="agregado">Agregado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "ativo"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                          <SelectItem value="expirado">Expirado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pagamento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="por_km">Por Km Rodado</SelectItem>
                          <SelectItem value="fixo_mensal">Fixo Mensal</SelectItem>
                          <SelectItem value="por_entrega">Por Entrega</SelectItem>
                          <SelectItem value="comissao">Comissão</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Término</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="truckType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Caminhão</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cegonha, Prancha" {...field} data-testid="input-truck-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa do Veículo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: ABC-1234" {...field} data-testid="input-license-plate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnhRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNH Exigida</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cnh-required">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Não especificado</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workRegion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Região de Atuação</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sul, Sudeste" {...field} data-testid="input-work-region" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais sobre o contrato..."
                        rows={3}
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-contract"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingContract ? "Salvar Alterações" : "Criar Contrato"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>
          {viewingContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="font-medium" data-testid="text-view-contract-number">{viewingContract.contractNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[viewingContract.status] || ""}`}>
                    {statusLabels[viewingContract.status] || viewingContract.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="font-medium">{viewingContract.driver?.name || "Não vinculado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Contrato</p>
                  <p className="font-medium">{contractTypeLabels[viewingContract.contractType] || viewingContract.contractType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Pagamento</p>
                  <p className="font-medium">{paymentTypeLabels[viewingContract.paymentType] || viewingContract.paymentType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium">R$ {parseFloat(viewingContract.paymentValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Início</p>
                  <p className="font-medium">{viewingContract.startDate ? format(new Date(viewingContract.startDate + "T12:00:00"), "dd/MM/yyyy") : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Término</p>
                  <p className="font-medium">{viewingContract.endDate ? format(new Date(viewingContract.endDate + "T12:00:00"), "dd/MM/yyyy") : "Indeterminado"}</p>
                </div>
                {viewingContract.truckType && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Caminhão</p>
                    <p className="font-medium">{viewingContract.truckType}</p>
                  </div>
                )}
                {viewingContract.licensePlate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Placa</p>
                    <p className="font-medium">{viewingContract.licensePlate}</p>
                  </div>
                )}
                {viewingContract.cnhRequired && (
                  <div>
                    <p className="text-xs text-muted-foreground">CNH Exigida</p>
                    <p className="font-medium">{viewingContract.cnhRequired}</p>
                  </div>
                )}
                {viewingContract.workRegion && (
                  <div>
                    <p className="text-xs text-muted-foreground">Região de Atuação</p>
                    <p className="font-medium">{viewingContract.workRegion}</p>
                  </div>
                )}
              </div>
              {viewingContract.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm mt-1">{viewingContract.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
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
