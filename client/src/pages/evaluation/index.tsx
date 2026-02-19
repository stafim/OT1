import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  Scale,
  AlertTriangle,
  GripVertical,
} from "lucide-react";
import type { EvaluationCriteria } from "@shared/schema";

export default function EvaluationPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [editedWeights, setEditedWeights] = useState<Record<string, string>>({});
  const [isEditingWeights, setIsEditingWeights] = useState(false);

  const { data: criteria, isLoading } = useQuery<EvaluationCriteria[]>({
    queryKey: ["/api/evaluation-criteria"],
  });

  const activeCriteria = criteria?.filter(c => c.isActive === "true") || [];
  const totalWeight = activeCriteria.reduce((sum, c) => {
    const w = isEditingWeights ? parseFloat(editedWeights[c.id] || c.weight) : parseFloat(c.weight);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; weight: string; order: number }) => {
      await apiRequest("POST", "/api/evaluation-criteria", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-criteria"] });
      setShowAddDialog(false);
      setNewName("");
      setNewWeight("");
      toast({ title: "Criterio adicionado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar criterio", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/evaluation-criteria/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-criteria"] });
      setEditingCriteria(null);
      toast({ title: "Criterio atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar criterio", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/evaluation-criteria/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-criteria"] });
      setDeletingId(null);
      toast({ title: "Criterio removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover criterio", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (criteriaUpdates: { id: string; weight: string; order: number }[]) => {
      await apiRequest("PUT", "/api/evaluation-criteria/bulk-update", { criteria: criteriaUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-criteria"] });
      setIsEditingWeights(false);
      setEditedWeights({});
      toast({ title: "Pesos atualizados com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pesos", variant: "destructive" });
    },
  });

  const handleAddCriteria = () => {
    const weight = parseFloat(newWeight);
    if (!newName.trim()) {
      toast({ title: "Nome e obrigatorio", variant: "destructive" });
      return;
    }
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      toast({ title: "Peso deve ser entre 0.01 e 100", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      weight: weight.toFixed(2),
      order: activeCriteria.length,
    });
  };

  const handleEditCriteria = () => {
    if (!editingCriteria) return;
    const weight = parseFloat(newWeight);
    if (!newName.trim()) {
      toast({ title: "Nome e obrigatorio", variant: "destructive" });
      return;
    }
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      toast({ title: "Peso deve ser entre 0.01 e 100", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingCriteria.id,
      data: { name: newName.trim(), weight: weight.toFixed(2) },
    });
  };

  const handleStartEditWeights = () => {
    const weights: Record<string, string> = {};
    activeCriteria.forEach(c => {
      weights[c.id] = c.weight;
    });
    setEditedWeights(weights);
    setIsEditingWeights(true);
  };

  const handleSaveWeights = () => {
    const editTotal = activeCriteria.reduce((sum, c) => {
      return sum + parseFloat(editedWeights[c.id] || c.weight);
    }, 0);

    if (Math.abs(editTotal - 100) > 0.01) {
      toast({
        title: "Os pesos devem totalizar 100",
        description: `Total atual: ${editTotal.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    const updates = activeCriteria.map((c, i) => ({
      id: c.id,
      weight: parseFloat(editedWeights[c.id] || c.weight).toFixed(2),
      order: i,
    }));

    bulkUpdateMutation.mutate(updates);
  };

  const openEditDialog = (c: EvaluationCriteria) => {
    setEditingCriteria(c);
    setNewName(c.name);
    setNewWeight(c.weight);
  };

  const getWeightColor = () => {
    if (Math.abs(totalWeight - 100) <= 0.01) return "text-green-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Criterios de Avaliacao" />
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
        title="Criterios de Avaliacao"
        breadcrumbs={[
          { label: "Operacao", href: "/" },
          { label: "Avaliacao" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Total dos Pesos</p>
              <p className={`text-2xl font-bold ${getWeightColor()}`}>
                {totalWeight.toFixed(2)} / 100
              </p>
            </div>
            {Math.abs(totalWeight - 100) > 0.01 && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {totalWeight < 100 ? `Faltam ${(100 - totalWeight).toFixed(2)}` : `Excede ${(totalWeight - 100).toFixed(2)}`}
              </Badge>
            )}
            {Math.abs(totalWeight - 100) <= 0.01 && activeCriteria.length > 0 && (
              <Badge variant="default" className="ml-2 bg-green-600">Configurado</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditingWeights ? (
              <>
                <Button variant="outline" onClick={() => { setIsEditingWeights(false); setEditedWeights({}); }} data-testid="button-cancel-weights">
                  Cancelar
                </Button>
                <Button onClick={handleSaveWeights} disabled={bulkUpdateMutation.isPending} data-testid="button-save-weights">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Pesos
                </Button>
              </>
            ) : (
              <>
                {activeCriteria.length > 0 && (
                  <Button variant="outline" onClick={handleStartEditWeights} data-testid="button-edit-weights">
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar Pesos
                  </Button>
                )}
                <Button onClick={() => { setShowAddDialog(true); setNewName(""); setNewWeight(""); }} data-testid="button-add-criteria">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Criterio
                </Button>
              </>
            )}
          </div>
        </div>

        {activeCriteria.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Scale className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Nenhum criterio cadastrado</h3>
              <p className="max-w-md mx-auto mb-4">
                Adicione criterios de avaliacao para os motoristas. Cada criterio tera um peso que deve totalizar 100 pontos.
              </p>
              <Button onClick={() => { setShowAddDialog(true); setNewName(""); setNewWeight(""); }} data-testid="button-add-criteria-empty">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Primeiro Criterio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCriteria.map((c, index) => (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-mono w-6 text-center">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-criteria-name-${c.id}`}>{c.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEditingWeights ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={editedWeights[c.id] || ""}
                            onChange={(e) => setEditedWeights(prev => ({ ...prev, [c.id]: e.target.value }))}
                            className="w-24 text-right"
                            data-testid={`input-weight-${c.id}`}
                          />
                          <span className="text-sm text-muted-foreground">pts</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-weight-${c.id}`}>
                          Peso: {parseFloat(c.weight).toFixed(0)}
                        </Badge>
                      )}
                      {!isEditingWeights && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(c)}
                            data-testid={`button-edit-criteria-${c.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingId(c.id)}
                            data-testid={`button-delete-criteria-${c.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Cada criterio recebe uma nota de 0 a 100 pontos durante a avaliacao do motorista.</li>
              <li>O peso determina a importancia relativa de cada criterio na nota final.</li>
              <li>A soma dos pesos de todos os criterios deve ser exatamente 100.</li>
              <li>A nota final ponderada e calculada: (nota1 x peso1 + nota2 x peso2 + ...) / 100.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Criterio de Avaliacao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Criterio</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Pontualidade"
                data-testid="input-criteria-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Peso (pontos)</Label>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Ex: 20"
                data-testid="input-criteria-weight"
              />
              <p className="text-xs text-muted-foreground">
                Peso atual utilizado: {totalWeight.toFixed(2)} / 100
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddCriteria} disabled={createMutation.isPending} data-testid="button-save-criteria">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCriteria} onOpenChange={(open) => { if (!open) setEditingCriteria(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Criterio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Criterio</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-edit-criteria-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Peso (pontos)</Label>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                data-testid="input-edit-criteria-weight"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCriteria(null)}>Cancelar</Button>
            <Button onClick={handleEditCriteria} disabled={updateMutation.isPending} data-testid="button-update-criteria">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Criterio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este criterio? Se ja houver avaliacoes usando-o, ele sera apenas desativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              data-testid="button-confirm-delete-criteria"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
