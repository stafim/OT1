import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Receipt, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  RotateCcw, 
  FileText, 
  Truck, 
  User, 
  MapPin, 
  Search, 
  XCircle,
  Camera,
  DollarSign,
  Fuel,
  Utensils,
  Wrench,
  Car,
  Building,
  ImageOff,
  Plus,
  Upload,
  Loader2,
  Trash2,
  Hotel
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { 
  ExpenseSettlement, 
  ExpenseSettlementItem, 
  Transport, 
  Driver, 
  Client, 
  DeliveryLocation, 
  Yard 
} from "@shared/schema";

interface ExpenseSettlementWithRelations extends ExpenseSettlement {
  transport?: Transport & {
    client?: Client;
    deliveryLocation?: DeliveryLocation;
    originYard?: Yard;
  };
  driver?: Driver;
  items?: ExpenseSettlementItem[];
}

const expenseTypeLabels: Record<string, { label: string; icon: any }> = {
  combustivel: { label: "Combustível", icon: Fuel },
  pedagio: { label: "Pedágio", icon: Receipt },
  hospedagem: { label: "Hotel", icon: Hotel },
  alimentacao: { label: "Alimentação", icon: Utensils },
  outros: { label: "Outros", icon: Receipt },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  enviado: { label: "Aguardando Análise", variant: "default", icon: Eye },
  devolvido: { label: "Devolvido", variant: "destructive", icon: RotateCcw },
  aprovado: { label: "Aprovado", variant: "outline", icon: CheckCircle },
  assinado: { label: "Assinado", variant: "outline", icon: FileText },
};

export default function FinanceiroPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState<ExpenseSettlementWithRelations | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  interface ExpenseItemDraft {
    id: string;
    type: string;
    amount: string;
    photoUrl: string;
    description: string;
  }
  const [newSettlement, setNewSettlement] = useState<{
    transportId: string;
    driverId: string;
    driverNotes: string;
    items: ExpenseItemDraft[];
  }>({ transportId: "", driverId: "", driverNotes: "", items: [] });
  const [newItem, setNewItem] = useState({ type: "", amount: "", photoUrl: "", description: "" });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);

  const { data: settlements, isLoading } = useQuery<ExpenseSettlementWithRelations[]>({
    queryKey: ["/api/expense-settlements"],
  });

  const { data: transports } = useQuery<Transport[]>({
    queryKey: ["/api/transports"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { transportId: string; driverId: string; driverNotes?: string; items: ExpenseItemDraft[] }) => {
      // Create settlement first
      const settlement = await apiRequest("POST", "/api/expense-settlements", {
        transportId: data.transportId,
        driverId: data.driverId,
        driverNotes: data.driverNotes,
        status: "enviado",
        submittedAt: new Date().toISOString(),
      });
      const settlementData = await settlement.json();
      
      // Create all items
      for (const item of data.items) {
        await apiRequest("POST", `/api/expense-settlements/${settlementData.id}/items`, {
          type: item.type,
          amount: item.amount,
          photoUrl: item.photoUrl,
          description: item.description,
        });
      }
      
      return settlementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação de contas criada com sucesso!" });
      setShowNewDialog(false);
      setNewSettlement({ transportId: "", driverId: "", driverNotes: "", items: [] });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Erro ao criar prestação de contas", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação de contas aprovada com sucesso!" });
      setShowDetails(false);
    },
    onError: () => {
      toast({ title: "Erro ao aprovar prestação de contas", variant: "destructive" });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ settlementId, reason }: { settlementId: string; reason: string }) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/return`, { returnReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação de contas devolvida para o motorista" });
      setShowReturnDialog(false);
      setShowDetails(false);
      setReturnReason("");
    },
    onError: () => {
      toast({ title: "Erro ao devolver prestação de contas", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { settlementId: string; type: string; amount: string; photoUrl: string; description: string }) => {
      return apiRequest("POST", `/api/expense-settlements/${data.settlementId}/items`, {
        type: data.type,
        amount: data.amount,
        photoUrl: data.photoUrl,
        description: data.description,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      // Refresh the selected settlement to show new item
      if (selectedSettlement) {
        const response = await fetch(`/api/expense-settlements/${selectedSettlement.id}`);
        if (response.ok) {
          const updatedSettlement = await response.json();
          setSelectedSettlement(updatedSettlement);
        }
      }
      toast({ title: "Despesa adicionada com sucesso!" });
      setShowAddItemDialog(false);
      setNewItem({ type: "", amount: "", photoUrl: "", description: "" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/expense-settlement-items/${itemId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      // Refresh the selected settlement to show updated items
      if (selectedSettlement) {
        const response = await fetch(`/api/expense-settlements/${selectedSettlement.id}`);
        if (response.ok) {
          const updatedSettlement = await response.json();
          setSelectedSettlement(updatedSettlement);
        }
      }
      toast({ title: "Despesa removida com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover despesa", variant: "destructive" });
    },
  });

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      // Try Object Storage first
      const response = await apiRequest("POST", "/api/uploads/request-url", {
        contentType: file.type,
        name: file.name,
        isPublic: false,
      });

      const { uploadURL, objectPath } = await response.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      return objectPath;
    } catch {
      // Fallback to local upload
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const localResponse = await apiRequest("POST", "/api/uploads/local", {
          filename: file.name,
          contentType: file.type,
          data: base64,
        });

        const { objectPath } = await localResponse.json();
        return objectPath;
      } catch (err: any) {
        console.error("Upload error:", err);
        toast({ title: err.message || "Erro ao fazer upload da foto", variant: "destructive" });
        return null;
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const objectPath = await uploadPhoto(file);
    if (objectPath) {
      setNewItem(prev => ({ ...prev, photoUrl: objectPath }));
    }
    setIsUploadingPhoto(false);
  };

  const handleNewSettlementItemPhoto = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItemIndex(index);
    const objectPath = await uploadPhoto(file);
    if (objectPath) {
      setNewSettlement(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, photoUrl: objectPath } : item
        ),
      }));
    }
    setUploadingItemIndex(null);
  };

  const addNewSettlementItem = () => {
    setNewSettlement(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), type: "", amount: "", photoUrl: "", description: "" }],
    }));
  };

  const removeNewSettlementItem = (index: number) => {
    setNewSettlement(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateNewSettlementItem = (index: number, field: string, value: string) => {
    setNewSettlement(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = () => {
    if (!selectedSettlement) return;
    if (!newItem.type || !newItem.amount || !newItem.photoUrl) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    addItemMutation.mutate({
      settlementId: selectedSettlement.id,
      type: newItem.type,
      amount: newItem.amount,
      photoUrl: newItem.photoUrl,
      description: newItem.description,
    });
  };

  const pendingSettlements = settlements?.filter(s => s.status === "enviado") || [];
  const allSettlements = settlements || [];

  const filteredSettlements = (activeTab === "pending" ? pendingSettlements : allSettlements).filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.transport?.requestNumber?.toLowerCase().includes(searchLower) ||
      s.driver?.name?.toLowerCase().includes(searchLower) ||
      s.transport?.vehicleChassi?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: string | null) => {
    if (!value) return "R$ 0,00";
    const num = parseFloat(value);
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const openDetails = (settlement: ExpenseSettlementWithRelations) => {
    setSelectedSettlement(settlement);
    setShowDetails(true);
  };

  const openReturnDialog = () => {
    setShowReturnDialog(true);
  };

  const handleReturn = () => {
    if (!selectedSettlement || !returnReason.trim()) {
      toast({ title: "Por favor, informe o motivo da devolução", variant: "destructive" });
      return;
    }
    returnMutation.mutate({ settlementId: selectedSettlement.id, reason: returnReason });
  };

  const handleApprove = () => {
    if (!selectedSettlement) return;
    approveMutation.mutate(selectedSettlement.id);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Financeiro - Prestação de Contas" />
        <div className="grid gap-4 mt-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Financeiro - Prestação de Contas" />

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OTD, motorista ou chassi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-settlements"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {pendingSettlements.length} aguardando
            </Badge>
            <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-settlement">
              <Plus className="h-4 w-4 mr-2" />
              Nova Prestação
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "all")}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Aguardando Análise ({pendingSettlements.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Receipt className="h-4 w-4" />
              Todas ({allSettlements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredSettlements.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma prestação de contas encontrada</p>
                  <p className="text-sm">
                    {activeTab === "pending" 
                      ? "Não há prestações aguardando análise no momento"
                      : "Nenhuma prestação de contas registrada"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSettlements.map(settlement => {
                  const status = statusConfig[settlement.status || "pendente"];
                  const StatusIcon = status.icon;
                  
                  return (
                    <Card 
                      key={settlement.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => openDetails(settlement)}
                      data-testid={`card-settlement-${settlement.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              {settlement.transport?.requestNumber && (
                                <span className="font-mono font-bold text-primary">
                                  {settlement.transport.requestNumber}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{settlement.driver?.name || "Motorista não encontrado"}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono">{settlement.transport?.vehicleChassi || "-"}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {settlement.transport?.deliveryLocation?.city || "-"}/
                                  {settlement.transport?.deliveryLocation?.state || "-"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{settlement.items?.length || 0} comprovantes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(settlement.totalExpenses)}
                                </span>
                              </div>
                              {settlement.submittedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Enviado em {format(new Date(settlement.submittedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="icon" data-testid="button-view-settlement">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Prestação de Contas - {selectedSettlement?.transport?.requestNumber}
            </DialogTitle>
            <DialogDescription>
              Analise os comprovantes enviados pelo motorista
            </DialogDescription>
          </DialogHeader>
          
          {selectedSettlement && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Informações do Transporte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número OTD:</span>
                      <span className="font-mono font-bold">{selectedSettlement.transport?.requestNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chassi:</span>
                      <span className="font-mono">{selectedSettlement.transport?.vehicleChassi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origem:</span>
                      <span>{selectedSettlement.transport?.originYard?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destino:</span>
                      <span>
                        {selectedSettlement.transport?.deliveryLocation?.name} - 
                        {selectedSettlement.transport?.deliveryLocation?.city}/
                        {selectedSettlement.transport?.deliveryLocation?.state}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span>{selectedSettlement.transport?.client?.name || "-"}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Motorista
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{selectedSettlement.driver?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{selectedSettlement.driver?.cpf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span>{selectedSettlement.driver?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modalidade:</span>
                      <Badge variant="outline">
                        {selectedSettlement.driver?.modality?.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="font-bold">{selectedSettlement.routeDistance || "-"}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Pedágios (Est.)</p>
                      <p className="font-bold">{formatCurrency(selectedSettlement.estimatedTolls)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Combustível (Est.)</p>
                      <p className="font-bold">{formatCurrency(selectedSettlement.estimatedFuel)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Despesas</p>
                      <p className="font-bold text-green-600">{formatCurrency(selectedSettlement.totalExpenses)}</p>
                    </div>
                  </div>
                  
                  {selectedSettlement.driverNotes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Observações do Motorista:</p>
                      <p className="text-sm">{selectedSettlement.driverNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Comprovantes ({selectedSettlement.items?.length || 0})
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddItemDialog(true)}
                      data-testid="button-add-expense-item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Despesa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedSettlement.items?.length ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum comprovante adicionado</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowAddItemDialog(true)}
                        data-testid="button-add-first-expense"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar primeira despesa
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedSettlement.items.map((item) => {
                        const typeConfig = expenseTypeLabels[item.type] || expenseTypeLabels.outros;
                        const TypeIcon = typeConfig.icon;
                        const hasIssue = item.photoStatus !== "ok";
                        
                        return (
                          <Card 
                            key={item.id} 
                            className={`overflow-hidden ${hasIssue ? "border-destructive" : ""}`}
                          >
                            <div 
                              className="aspect-video bg-muted relative cursor-pointer group"
                              onClick={() => setLightboxPhoto(normalizeImageUrl(item.photoUrl))}
                            >
                              <img
                                src={normalizeImageUrl(item.photoUrl)}
                                alt={typeConfig.label}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center">
                                <ImageOff className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                              {hasIssue && (
                                <Badge 
                                  variant="destructive" 
                                  className="absolute top-2 right-2"
                                >
                                  {item.photoStatus}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{typeConfig.label}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteItemMutation.mutate(item.id);
                                  }}
                                  data-testid={`button-delete-item-${item.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="font-bold text-green-600">
                                {formatCurrency(item.amount)}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.photoRejectionReason && (
                                <p className="text-xs text-destructive mt-1">
                                  {item.photoRejectionReason}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedSettlement.status === "devolvido" && selectedSettlement.returnReason && (
                <Card className="border-destructive">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Motivo da Devolução
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedSettlement.returnReason}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {selectedSettlement?.status === "enviado" && (
              <>
                <Button
                  variant="destructive"
                  onClick={openReturnDialog}
                  disabled={returnMutation.isPending}
                  data-testid="button-return-settlement"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Devolver para Motorista
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-settlement"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Prestação
                </Button>
              </>
            )}
            {selectedSettlement?.status === "aprovado" && (
              <Button
                variant="outline"
                data-testid="button-generate-document"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Documento
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Devolver Prestação de Contas
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da devolução para o motorista
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-reason">Motivo da Devolução</Label>
              <Textarea
                id="return-reason"
                placeholder="Ex: Foto do comprovante de pedágio está ilegível. Por favor, envie uma foto mais nítida."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
                data-testid="textarea-return-reason"
              />
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                O motorista receberá uma notificação no aplicativo informando que precisa corrigir e reenviar a prestação de contas.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReturn}
              disabled={returnMutation.isPending || !returnReason.trim()}
              data-testid="button-confirm-return"
            >
              {returnMutation.isPending ? "Enviando..." : "Confirmar Devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Comprovante"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Prestação de Contas</DialogTitle>
            <DialogDescription>
              Crie uma prestação de contas com as despesas e comprovantes do transporte.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-transport">Transporte (OTD) *</Label>
                <Select 
                  value={newSettlement.transportId} 
                  onValueChange={(value) => {
                    const transport = transports?.find(t => t.id === value);
                    setNewSettlement({ 
                      ...newSettlement, 
                      transportId: value,
                      driverId: transport?.driverId || ""
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-transport">
                    <SelectValue placeholder="Selecione um transporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {transports?.filter(t => 
                      t.status === "entregue" && 
                      !settlements?.some(s => s.transportId === t.id)
                    ).map((transport) => (
                      <SelectItem key={transport.id} value={transport.id}>
                        {transport.requestNumber} - {transport.vehicleChassi}
                      </SelectItem>
                    ))}
                    {transports?.filter(t => 
                      t.status === "entregue" && 
                      !settlements?.some(s => s.transportId === t.id)
                    ).length === 0 && (
                      <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                        Todos os transportes entregues já possuem prestação de contas
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-driver">Motorista *</Label>
                <Select 
                  value={newSettlement.driverId} 
                  onValueChange={(value) => setNewSettlement({ ...newSettlement, driverId: value })}
                >
                  <SelectTrigger data-testid="select-driver">
                    <SelectValue placeholder="Selecione um motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isActive === "true").map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Despesas ({newSettlement.items.length})
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addNewSettlementItem}
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Despesa
                </Button>
              </div>

              {newSettlement.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma despesa adicionada</p>
                  <p className="text-xs">Clique em "Adicionar Despesa" para incluir comprovantes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newSettlement.items.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 shrink-0">
                          {item.photoUrl ? (
                            <div className="relative w-full h-full">
                              <img 
                                src={normalizeImageUrl(item.photoUrl)} 
                                alt="Comprovante" 
                                className="w-full h-full object-cover rounded-lg border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-5 w-5"
                                onClick={() => updateNewSettlementItem(index, "photoUrl", "")}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block w-full h-full border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleNewSettlementItemPhoto(e, index)}
                                disabled={uploadingItemIndex === index}
                                data-testid={`input-photo-${index}`}
                              />
                              {uploadingItemIndex === index ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              ) : (
                                <div className="text-center">
                                  <Camera className="h-6 w-6 mx-auto text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Foto</span>
                                </div>
                              )}
                            </label>
                          )}
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo *</Label>
                            <Select 
                              value={item.type} 
                              onValueChange={(value) => updateNewSettlementItem(index, "type", value)}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-type-${index}`}>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(expenseTypeLabels).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <config.icon className="h-3 w-3" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Valor (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={item.amount}
                              onChange={(e) => updateNewSettlementItem(index, "amount", e.target.value)}
                              className="h-9"
                              data-testid={`input-amount-${index}`}
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Observação</Label>
                            <Input
                              placeholder="Descrição da despesa..."
                              value={item.description}
                              onChange={(e) => updateNewSettlementItem(index, "description", e.target.value)}
                              className="h-9"
                              data-testid={`input-description-${index}`}
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeNewSettlementItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-notes">Observações Gerais (opcional)</Label>
              <Textarea
                id="new-notes"
                placeholder="Adicione observações sobre a prestação de contas..."
                value={newSettlement.driverNotes}
                onChange={(e) => setNewSettlement({ ...newSettlement, driverNotes: e.target.value })}
                rows={2}
                data-testid="textarea-notes"
              />
            </div>

            {newSettlement.items.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total das Despesas:</span>
                <span className="text-lg font-bold text-green-600">
                  {newSettlement.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewDialog(false);
              setNewSettlement({ transportId: "", driverId: "", driverNotes: "", items: [] });
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newSettlement)}
              disabled={
                createMutation.isPending || 
                !newSettlement.transportId || 
                !newSettlement.driverId || 
                newSettlement.items.length === 0 ||
                newSettlement.items.some(item => !item.type || !item.amount || !item.photoUrl)
              }
              data-testid="button-create-settlement"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Prestação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Despesa
            </DialogTitle>
            <DialogDescription>
              Adicione uma despesa com foto do comprovante
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto do Comprovante *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {newItem.photoUrl ? (
                  <div className="relative">
                    <img 
                      src={normalizeImageUrl(newItem.photoUrl)} 
                      alt="Comprovante" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setNewItem(prev => ({ ...prev, photoUrl: "" }))}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      data-testid="input-expense-photo"
                    />
                    {isUploadingPhoto ? (
                      <div className="py-4">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Enviando foto...</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Clique para enviar foto do comprovante
                        </p>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Despesa *</Label>
              <Select 
                value={newItem.type} 
                onValueChange={(value) => setNewItem(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger data-testid="select-expense-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(expenseTypeLabels).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={newItem.amount}
                onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                data-testid="input-expense-amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                placeholder="Descrição ou observação sobre esta despesa..."
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                data-testid="textarea-expense-description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddItemDialog(false);
                setNewItem({ type: "", amount: "", photoUrl: "", description: "" });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={addItemMutation.isPending || !newItem.type || !newItem.amount || !newItem.photoUrl}
              data-testid="button-save-expense"
            >
              {addItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Despesa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
