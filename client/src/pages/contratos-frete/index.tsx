import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  CalendarDays,
  Route,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FreightContract } from "@shared/schema";

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "—";
  return parseFloat(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

const statusConfig = {
  ativo: { label: "Ativo", icon: CheckCircle, className: "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30" },
  suspenso: { label: "Suspenso", icon: Clock, className: "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30" },
  expirado: { label: "Expirado", icon: XCircle, className: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30" },
  cancelado: { label: "Cancelado", icon: Ban, className: "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-950/30" },
};

type ViewMode = "list" | "form";

interface FormState {
  contractNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  distanciaKm: string;
  valorTotalCte: string;
  startDate: string;
  endDate: string;
  status: "ativo" | "suspenso" | "expirado" | "cancelado";
  notes: string;
  content: string;
  quoteId: string;
  clientId: string;
}

const emptyForm: FormState = {
  contractNumber: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  distanciaKm: "",
  valorTotalCte: "",
  startDate: "",
  endDate: "",
  status: "ativo",
  notes: "",
  content: "",
  quoteId: "",
  clientId: "",
};

export default function ContratosFreteePage() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: contracts, isLoading } = useQuery<FreightContract[]>({
    queryKey: ["/api/freight-contracts"],
  });

  const { data: nextNumber } = useQuery<{ contractNumber: string }>({
    queryKey: ["/api/freight-contracts/next-number"],
    enabled: view === "form" && !editingId,
  });

  const setField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: (data: Partial<FormState>) => apiRequest("POST", "/api/freight-contracts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/freight-contracts/next-number"] });
      toast({ title: "Contrato criado com sucesso" });
      setView("list");
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () => toast({ title: "Erro ao criar contrato", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormState> }) =>
      apiRequest("PATCH", `/api/freight-contracts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-contracts"] });
      toast({ title: "Contrato atualizado com sucesso" });
      setView("list");
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () => toast({ title: "Erro ao atualizar contrato", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/freight-contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-contracts"] });
      setDeletingId(null);
      toast({ title: "Contrato removido" });
    },
    onError: () => toast({ title: "Erro ao remover contrato", variant: "destructive" }),
  });

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setView("form");
  };

  const handleEdit = (contract: FreightContract) => {
    setEditingId(contract.id);
    setForm({
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      clientPhone: contract.clientPhone || "",
      clientEmail: contract.clientEmail || "",
      distanciaKm: contract.distanciaKm ? parseFloat(contract.distanciaKm).toString() : "",
      valorTotalCte: contract.valorTotalCte ? parseFloat(contract.valorTotalCte).toString() : "",
      startDate: contract.startDate || "",
      endDate: contract.endDate || "",
      status: (contract.status as FormState["status"]) || "ativo",
      notes: contract.notes || "",
      content: contract.content || "",
      quoteId: contract.quoteId || "",
      clientId: contract.clientId || "",
    });
    setView("form");
  };

  const handleSubmit = () => {
    if (!form.clientName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.contractNumber.trim()) {
      toast({ title: "Número do contrato é obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      contractNumber: form.contractNumber.trim(),
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim() || null,
      clientEmail: form.clientEmail.trim() || null,
      distanciaKm: form.distanciaKm ? parseFloat(form.distanciaKm).toFixed(2) : null,
      valorTotalCte: form.valorTotalCte ? parseFloat(form.valorTotalCte).toFixed(2) : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      status: form.status,
      notes: form.notes.trim() || null,
      content: form.content.trim() || null,
      quoteId: form.quoteId || null,
      clientId: form.clientId || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = useMemo(() => {
    if (!contracts) return [];
    if (!search.trim()) return contracts;
    const term = search.toLowerCase();
    return contracts.filter(
      (c) =>
        c.clientName.toLowerCase().includes(term) ||
        c.contractNumber.toLowerCase().includes(term) ||
        c.clientEmail?.toLowerCase().includes(term)
    );
  }, [contracts, search]);

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, ativo: 0, suspenso: 0, expirado: 0, cancelado: 0 };
    return {
      total: contracts.length,
      ativo: contracts.filter((c) => c.status === "ativo").length,
      suspenso: contracts.filter((c) => c.status === "suspenso").length,
      expirado: contracts.filter((c) => c.status === "expirado").length,
      cancelado: contracts.filter((c) => c.status === "cancelado").length,
    };
  }, [contracts]);

  if (view === "form") {
    const autoNumber = nextNumber?.contractNumber || "";
    if (!editingId && form.contractNumber === "" && autoNumber) {
      setForm((prev) => ({ ...prev, contractNumber: autoNumber }));
    }
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={editingId ? "Editar Contrato de Frete" : "Novo Contrato de Frete"}
          breadcrumbs={[
            { label: "Contratos de Frete", href: "/contratos-frete" },
            { label: editingId ? "Editar" : "Novo" },
          ]}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Identificação do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número do Contrato</Label>
                    <Input
                      value={form.contractNumber}
                      onChange={(e) => setField("contractNumber", e.target.value)}
                      placeholder="CTF-0001"
                      data-testid="input-contract-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="expirado">Expirado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setField("startDate", e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Encerramento</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setField("endDate", e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) => setField("clientName", e.target.value)}
                    placeholder="Nome do cliente ou empresa"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-green-500" />
                      Telefone
                    </Label>
                    <Input
                      value={form.clientPhone}
                      onChange={(e) => setField("clientPhone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      data-testid="input-client-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) => setField("clientEmail", e.target.value)}
                      placeholder="email@exemplo.com"
                      data-testid="input-client-email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-500" />
                  Dados do Frete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Route className="h-3.5 w-3.5 text-blue-500" />
                      Distância (km)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.distanciaKm}
                      onChange={(e) => setField("distanciaKm", e.target.value)}
                      placeholder="500"
                      data-testid="input-distancia-km"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-orange-500" />
                      Valor Total do Frete (R$)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valorTotalCte}
                      onChange={(e) => setField("valorTotalCte", e.target.value)}
                      placeholder="0,00"
                      data-testid="input-valor-total"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Observações e Condições</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Observações Gerais</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Condições especiais, observações..."
                    rows={3}
                    data-testid="input-notes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Termos e Condições do Contrato</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setField("content", e.target.value)}
                    placeholder="Descreva as cláusulas e condições do contrato de frete..."
                    rows={6}
                    data-testid="input-content"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setView("list");
                  setForm(emptyForm);
                  setEditingId(null);
                }}
                data-testid="button-cancel"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Contrato"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Contratos de Frete"
        breadcrumbs={[{ label: "Contratos de Frete" }]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.ativo}</p>
              <p className="text-xs text-muted-foreground mt-1">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.suspenso}</p>
              <p className="text-xs text-muted-foreground mt-1">Suspensos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.expirado + stats.cancelado}</p>
              <p className="text-xs text-muted-foreground mt-1">Enc./Cancel.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, nº contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Button onClick={handleNew} data-testid="button-new-contract">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Contrato
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
              <p className="max-w-md mx-auto text-sm">
                Crie um novo contrato ou converta uma cotação salva em contrato de frete.
              </p>
              <Button className="mt-4" onClick={handleNew} data-testid="button-new-contract-empty">
                <Plus className="h-4 w-4 mr-1.5" />
                Criar Primeiro Contrato
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((contract) => {
              const st = statusConfig[contract.status as keyof typeof statusConfig] ?? statusConfig.ativo;
              const StatusIcon = st.icon;
              return (
                <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {contract.contractNumber}
                          </span>
                          <h3 className="font-semibold text-sm truncate" data-testid={`text-client-${contract.id}`}>
                            {contract.clientName}
                          </h3>
                          <Badge variant="outline" className={`text-xs ${st.className}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {st.label}
                          </Badge>
                          {contract.quoteId && (
                            <Badge variant="secondary" className="text-xs">
                              Cotação
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          {contract.clientPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contract.clientPhone}
                            </span>
                          )}
                          {contract.clientEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contract.clientEmail}
                            </span>
                          )}
                          {contract.startDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(contract.startDate)}
                              {contract.endDate && ` → ${formatDate(contract.endDate)}`}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
                          {contract.distanciaKm && (
                            <span className="flex items-center gap-1">
                              <Route className="h-3 w-3 text-blue-500" />
                              {parseFloat(contract.distanciaKm).toLocaleString("pt-BR")} km
                            </span>
                          )}
                          {contract.valorTotalCte && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(contract.valorTotalCte)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEdit(contract)}
                          title="Editar contrato"
                          data-testid={`button-edit-${contract.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDeletingId(contract.id)}
                          title="Remover contrato"
                          data-testid={`button-delete-${contract.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contrato de Frete</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              data-testid="button-confirm-delete"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
