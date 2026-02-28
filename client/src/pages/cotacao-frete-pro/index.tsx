import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  CarFront,
  DollarSign,
  Fuel,
  Route,
  Truck,
  Shield,
  Receipt,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Save,
  List,
  User,
  Phone,
  Mail,
  CalendarDays,
  Trash2,
  Eye,
  Search,
  FileDown,
  FilePlus2,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TruckModel, FreightQuote } from "@shared/schema";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

export default function CotacaoFreteProPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("calculator");

  const [selectedModelId, setSelectedModelId] = useState("");
  const [valorBem, setValorBem] = useState("500000");
  const [distanciaKm, setDistanciaKm] = useState("500");
  const [freteOtd, setFreteOtd] = useState("1200");
  const [retornoMotorista, setRetornoMotorista] = useState("400");
  const [pedagio, setPedagio] = useState("189");
  const [consumoVeiculo, setConsumoVeiculo] = useState("2.5");
  const [precoDiesel, setPrecoDiesel] = useState("6.00");

  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [searchQuotes, setSearchQuotes] = useState("");
  const [viewingQuote, setViewingQuote] = useState<FreightQuote | null>(null);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [quoteName, setQuoteName] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: truckModels } = useQuery<TruckModel[]>({
    queryKey: ["/api/truck-models"],
  });

  const { data: clientsList } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: savedQuotes, isLoading: quotesLoading } = useQuery<FreightQuote[]>({
    queryKey: ["/api/freight-quotes"],
  });

  const activeModels = useMemo(() =>
    (truckModels || []).filter(m => m.isActive !== "false").sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)),
    [truckModels]
  );

  const activeClients = useMemo(() =>
    (clientsList || []).sort((a, b) => a.name.localeCompare(b.name)),
    [clientsList]
  );

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = activeModels.find(m => m.id === modelId);
    if (model) {
      setConsumoVeiculo(parseFloat(model.averageConsumption).toString());
      if (model.vehicleValue) {
        setValorBem(parseFloat(model.vehicleValue).toString());
      }
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "__new__") {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      return;
    }
    const client = activeClients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientPhone(client.phone || "");
      setClientEmail(client.email || "");
    }
  };

  const calc = useMemo(() => {
    const vBem = parseFloat(valorBem) || 0;
    const dist = parseFloat(distanciaKm) || 0;
    const fOtd = parseFloat(freteOtd) || 0;
    const retorno = parseFloat(retornoMotorista) || 0;
    const ped = parseFloat(pedagio) || 0;
    const consumo = parseFloat(consumoVeiculo) || 1;
    const diesel = parseFloat(precoDiesel) || 6;

    const comissaoMotorista = 0.50 * dist;
    const custoDiesel = (dist / consumo) * diesel;
    const seguro = vBem * 0.0003;
    const valorBase = comissaoMotorista + custoDiesel + retorno + seguro + ped + fOtd;
    const TAX_RATE = 0.2125;
    const valorTotalCte = valorBase / (1 - TAX_RATE);
    const impostos = valorTotalCte - valorBase;
    const margem = valorTotalCte > 0 ? ((valorTotalCte - valorBase) / valorTotalCte) * 100 : 0;

    return {
      comissaoMotorista,
      custoDiesel,
      seguro,
      valorBase,
      valorTotalCte,
      impostos,
      margem,
      freteOtd: fOtd,
      retorno,
      pedagio: ped,
    };
  }, [valorBem, distanciaKm, freteOtd, retornoMotorista, pedagio, consumoVeiculo, precoDiesel]);

  const chartData = useMemo(() => {
    const items = [
      { name: "Frete OTD", value: calc.freteOtd, color: "#f97316" },
      { name: "Comissão Motorista", value: calc.comissaoMotorista, color: "#3b82f6" },
      { name: "Diesel", value: calc.custoDiesel, color: "#eab308" },
      { name: "Retorno Motorista", value: calc.retorno, color: "#8b5cf6" },
      { name: "Seguro", value: calc.seguro, color: "#06b6d4" },
      { name: "Pedágio", value: calc.pedagio, color: "#10b981" },
      { name: "Impostos (21,25%)", value: calc.impostos, color: "#ef4444" },
    ];
    return items.filter(i => i.value > 0);
  }, [calc]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/freight-quotes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-quotes"] });
      toast({ title: "Cotação salva com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar cotação", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/freight-quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-quotes"] });
      setDeletingQuoteId(null);
      toast({ title: "Cotação removida" });
    },
    onError: () => {
      toast({ title: "Erro ao remover cotação", variant: "destructive" });
    },
  });

  const [, setLocation] = useLocation();

  const convertToContractMutation = useMutation({
    mutationFn: async (quote: FreightQuote) => {
      const numberRes = await apiRequest("GET", "/api/freight-contracts/next-number");
      const { contractNumber } = await numberRes.json();
      const contractRes = await apiRequest("POST", "/api/freight-contracts", {
        contractNumber,
        quoteId: quote.id,
        clientId: quote.clientId || null,
        clientName: quote.clientName,
        clientPhone: quote.clientPhone || null,
        clientEmail: quote.clientEmail || null,
        distanciaKm: quote.distanciaKm,
        valorTotalCte: quote.valorTotalCte,
        startDate: new Date().toISOString().split("T")[0],
        endDate: quote.validUntil || null,
        status: "ativo",
        notes: null,
        content: null,
      });
      const contract = await contractRes.json();
      await apiRequest("PATCH", `/api/freight-quotes/${quote.id}`, {
        convertedToContractId: contract.id,
        convertedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freight-quotes"] });
      toast({
        title: "Contrato de Frete criado com sucesso!",
        description: "Redirecionando para Contratos de Frete...",
      });
      setTimeout(() => setLocation("/contratos-frete"), 1200);
    },
    onError: () => {
      toast({ title: "Erro ao criar contrato de frete", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!clientName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    setQuoteName("");
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!quoteName.trim()) {
      toast({ title: "Nome da cotação é obrigatório", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      quoteName: quoteName.trim(),
      clientId: selectedClientId && selectedClientId !== "__new__" ? selectedClientId : null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || null,
      clientEmail: clientEmail.trim() || null,
      validUntil: validUntil || null,
      truckModelId: selectedModelId || null,
      valorBem: (parseFloat(valorBem) || 0).toFixed(2),
      distanciaKm: (parseFloat(distanciaKm) || 0).toFixed(2),
      freteOtd: (parseFloat(freteOtd) || 0).toFixed(2),
      retornoMotorista: (parseFloat(retornoMotorista) || 0).toFixed(2),
      pedagio: (parseFloat(pedagio) || 0).toFixed(2),
      consumoVeiculo: (parseFloat(consumoVeiculo) || 1).toFixed(2),
      precoDiesel: (parseFloat(precoDiesel) || 6).toFixed(2),
      valorBase: calc.valorBase.toFixed(2),
      valorTotalCte: calc.valorTotalCte.toFixed(2),
      impostos: calc.impostos.toFixed(2),
    });
    setSaveDialogOpen(false);
  };

  const handleLoadQuote = (quote: FreightQuote) => {
    setValorBem(parseFloat(quote.valorBem).toString());
    setDistanciaKm(parseFloat(quote.distanciaKm).toString());
    setFreteOtd(parseFloat(quote.freteOtd).toString());
    setRetornoMotorista(parseFloat(quote.retornoMotorista).toString());
    setPedagio(parseFloat(quote.pedagio).toString());
    setConsumoVeiculo(parseFloat(quote.consumoVeiculo).toString());
    setPrecoDiesel(parseFloat(quote.precoDiesel).toString());
    setClientName(quote.clientName);
    setClientPhone(quote.clientPhone || "");
    setClientEmail(quote.clientEmail || "");
    setValidUntil(quote.validUntil || "");
    setSelectedClientId(quote.clientId || "");
    setSelectedModelId(quote.truckModelId || "");
    setViewingQuote(null);
    setActiveTab("calculator");
    toast({ title: "Cotação carregada na calculadora" });
  };

  const handleReset = () => {
    setSelectedModelId("");
    setValorBem("500000");
    setDistanciaKm("500");
    setFreteOtd("1200");
    setRetornoMotorista("400");
    setPedagio("189");
    setConsumoVeiculo("2.5");
    setPrecoDiesel("6.00");
    setSelectedClientId("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setValidUntil("");
  };

  const filteredQuotes = useMemo(() => {
    if (!savedQuotes) return [];
    const active = savedQuotes.filter(q => !q.convertedToContractId);
    if (!searchQuotes.trim()) return active;
    const term = searchQuotes.toLowerCase();
    return active.filter(q =>
      q.clientName.toLowerCase().includes(term) ||
      q.quoteName?.toLowerCase().includes(term) ||
      q.clientEmail?.toLowerCase().includes(term) ||
      q.clientPhone?.toLowerCase().includes(term)
    );
  }, [savedQuotes, searchQuotes]);

  const convertedQuotes = useMemo(() => {
    if (!savedQuotes) return [];
    const converted = savedQuotes.filter(q => !!q.convertedToContractId);
    if (!searchQuotes.trim()) return converted;
    const term = searchQuotes.toLowerCase();
    return converted.filter(q =>
      q.clientName.toLowerCase().includes(term) ||
      q.quoteName?.toLowerCase().includes(term) ||
      q.clientEmail?.toLowerCase().includes(term) ||
      q.clientPhone?.toLowerCase().includes(term)
    );
  }, [savedQuotes, searchQuotes]);

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr + "T23:59:59") < new Date();
  };

  const handleDownloadPDF = async (quote: FreightQuote) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = 210;
    const pageH = 297;
    const margin = 20;
    const contentW = pageW - margin * 2;

    const orange = [234, 88, 12] as [number, number, number];
    const darkGray = [30, 30, 30] as [number, number, number];
    const medGray = [100, 100, 100] as [number, number, number];
    const lightGray = [240, 240, 240] as [number, number, number];
    const white = [255, 255, 255] as [number, number, number];

    doc.setFillColor(...orange);
    doc.rect(0, 0, pageW, 45, "F");

    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = "/logo-otd.png";
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
          const logoH = 28;
          const logoW = logoH * aspectRatio;
          doc.addImage(dataUrl, "PNG", margin, 8, logoW, logoH);
        }
      }
    } catch {}

    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "normal");
    doc.text("COTAÇÃO DE FRETE", pageW - margin, 18, { align: "right" });
    doc.setFontSize(9);
    doc.text(`Emitida em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 25, { align: "right" });

    let y = 60;

    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y - 7, contentW, 28, 3, 3, "F");
    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.setFont("helvetica", "bold");
    doc.text(quote.clientName, margin + 5, y + 2);
    if (quote.clientPhone || quote.clientEmail) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...medGray);
      const contactLine = [quote.clientPhone, quote.clientEmail].filter(Boolean).join("   |   ");
      doc.text(contactLine, margin + 5, y + 10);
    }

    y += 35;

    const drawSectionTitle = (title: string, yPos: number) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...orange);
      doc.text(title.toUpperCase(), margin, yPos);
      doc.setDrawColor(...orange);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 2, margin + contentW, yPos + 2);
    };

    drawSectionTitle("Informações da Cotação", y);
    y += 10;

    const infoRows: [string, string][] = [
      ["Distância da Rota", `${parseFloat(quote.distanciaKm).toLocaleString("pt-BR")} km`],
      ["Data de Emissão", new Date(quote.createdAt!).toLocaleDateString("pt-BR")],
      ...(quote.validUntil ? [["Validade da Cotação", formatDate(quote.validUntil)] as [string, string]] : []),
    ];

    doc.setFontSize(10);
    for (const [label, value] of infoRows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...medGray);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkGray);
      doc.text(value, pageW - margin, y, { align: "right" });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 10;
    }

    y += 8;

    doc.setFillColor(...orange);
    doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...white);
    doc.text("VALOR TOTAL DO FRETE", margin + contentW / 2, y + 9, { align: "center" });
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(
      parseFloat(quote.valorTotalCte).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      margin + contentW / 2,
      y + 22,
      { align: "center" }
    );

    y += 40;

    if (quote.validUntil && !isExpired(quote.validUntil)) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...medGray);
      doc.text(
        `Esta cotação é válida até ${formatDate(quote.validUntil)}.`,
        margin + contentW / 2,
        y,
        { align: "center" }
      );
      y += 7;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...medGray);
    doc.text(
      "O valor apresentado é uma estimativa de frete sujeita a confirmação.",
      margin + contentW / 2,
      y,
      { align: "center" }
    );

    doc.setFillColor(...orange);
    doc.rect(0, pageH - 18, pageW, 18, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text("OTD LOGISTICS", margin, pageH - 7);
    doc.setFont("helvetica", "normal");
    doc.text("www.otdlogistics.com.br", pageW - margin, pageH - 7, { align: "right" });

    const filename = `cotacao-frete-${quote.clientName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cotação de Frete PRO"
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Cotação de Frete PRO" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Versão Avançada
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="calculator" data-testid="tab-calculator">
              <Calculator className="h-4 w-4 mr-1.5" />
              Calculadora
            </TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">
              <List className="h-4 w-4 mr-1.5" />
              Cotações Salvas
              {savedQuotes && savedQuotes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">{savedQuotes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calculator className="h-5 w-5 text-primary" />
                        Dados da Cotação
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-pro">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Resetar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="flex items-center gap-1.5">
                          <CarFront className="h-3.5 w-3.5 text-primary" />
                          Modelo do Veículo
                        </Label>
                        <Select value={selectedModelId} onValueChange={handleModelSelect}>
                          <SelectTrigger data-testid="select-model-pro" className="sm:max-w-md">
                            <SelectValue placeholder="Selecione um modelo cadastrado" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeModels.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.brand} {m.model} — {parseFloat(m.averageConsumption).toFixed(1)} km/l
                                {m.vehicleValue ? ` — ${parseFloat(m.vehicleValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-cyan-500" />
                          Valor do Bem (R$)
                        </Label>
                        <Input type="number" min="0" step="1000" value={valorBem} onChange={(e) => setValorBem(e.target.value)} placeholder="500000" data-testid="input-valor-bem-pro" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Route className="h-3.5 w-3.5 text-blue-500" />
                          Distância (km rota)
                        </Label>
                        <Input type="number" min="0" step="10" value={distanciaKm} onChange={(e) => setDistanciaKm(e.target.value)} placeholder="500" data-testid="input-distancia-pro" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-orange-500" />
                          Frete OTD (R$)
                        </Label>
                        <Input type="number" min="0" step="50" value={freteOtd} onChange={(e) => setFreteOtd(e.target.value)} placeholder="1200" data-testid="input-frete-otd-pro" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-purple-500" />
                          Retorno Motorista (R$)
                        </Label>
                        <Input type="number" min="0" step="50" value={retornoMotorista} onChange={(e) => setRetornoMotorista(e.target.value)} placeholder="400" data-testid="input-retorno-pro" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-green-500" />
                          Pedágio (R$)
                        </Label>
                        <Input type="number" min="0" step="10" value={pedagio} onChange={(e) => setPedagio(e.target.value)} placeholder="189" data-testid="input-pedagio-pro" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Fuel className="h-3.5 w-3.5 text-yellow-500" />
                          Consumo do Veículo (km/l)
                        </Label>
                        <Input type="number" min="0.1" max="50" step="0.1" value={consumoVeiculo} onChange={(e) => setConsumoVeiculo(e.target.value)} placeholder="2.5" data-testid="input-consumo-pro" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="flex items-center gap-1.5">
                          <Fuel className="h-3.5 w-3.5 text-amber-600" />
                          Preço do Diesel (R$/litro)
                        </Label>
                        <Input type="number" min="0" step="0.10" value={precoDiesel} onChange={(e) => setPrecoDiesel(e.target.value)} placeholder="6.00" className="sm:max-w-xs" data-testid="input-preco-diesel-pro" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-5 w-5 text-primary" />
                      Dados do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary" />
                          Cliente
                        </Label>
                        <Select value={selectedClientId} onValueChange={handleClientSelect}>
                          <SelectTrigger data-testid="select-client-pro" className="sm:max-w-md">
                            <SelectValue placeholder="Selecione um cliente ou digite um novo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__new__">+ Novo Cliente (digitar manualmente)</SelectItem>
                            {activeClients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Nome do Cliente</Label>
                        <Input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Nome do cliente"
                          className="sm:max-w-md"
                          data-testid="input-client-name-pro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-green-500" />
                          Telefone
                        </Label>
                        <Input
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          data-testid="input-client-phone-pro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          data-testid="input-client-email-pro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-orange-500" />
                          Validade da Cotação
                        </Label>
                        <Input
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          data-testid="input-valid-until-pro"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Detalhamento dos Custos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md divide-y">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span className="text-sm">Frete OTD</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-frete-otd-pro">{formatCurrency(calc.freteOtd)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm">Comissão Motorista (R$ 0,50 x km)</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-comissao-pro">{formatCurrency(calc.comissaoMotorista)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span className="text-sm">Diesel ({distanciaKm} km / {consumoVeiculo} km/l x R$ {precoDiesel})</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-diesel-pro">{formatCurrency(calc.custoDiesel)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <span className="text-sm">Retorno Motorista</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-retorno-pro">{formatCurrency(calc.retorno)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-cyan-500" />
                          <span className="text-sm">Seguro (Valor do Bem x 0,03%)</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-seguro-pro">{formatCurrency(calc.seguro)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm">Pedágio</span>
                        </div>
                        <span className="text-sm font-medium" data-testid="text-pedagio-pro">{formatCurrency(calc.pedagio)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50">
                        <span className="text-sm font-semibold">Valor Base (soma dos custos)</span>
                        <span className="text-sm font-bold" data-testid="text-valor-base-pro">{formatCurrency(calc.valorBase)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm">Impostos PIS/Cofins/ISS (21,25%)</span>
                        </div>
                        <span className="text-sm font-medium text-red-600" data-testid="text-impostos-pro">{formatCurrency(calc.impostos)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary/5">
                        <span className="text-sm font-bold">Valor Total CTe</span>
                        <span className="text-base font-bold text-primary" data-testid="text-valor-total-pro">{formatCurrency(calc.valorTotalCte)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Valor Total do CTe</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-cte-destaque-pro">
                      {formatCurrency(calc.valorTotalCte)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Margem: <strong className="text-foreground">{calc.margem.toFixed(2)}%</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-quote"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Cotação"}
                </Button>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resumo Rápido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Base</span>
                      <span className="font-medium">{formatCurrency(calc.valorBase)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Impostos</span>
                      <span className="font-medium text-red-600">{formatCurrency(calc.impostos)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Margem</span>
                      <Badge variant={calc.margem >= 15 ? "default" : "destructive"} className="text-xs">
                        {calc.margem.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-sm">
                      <span className="font-semibold">Total CTe</span>
                      <span className="font-bold text-primary">{formatCurrency(calc.valorTotalCte)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Distribuição de Custos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {calc.valorTotalCte > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            iconSize={10}
                            wrapperStyle={{ fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Preencha os dados para ver o gráfico
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Fórmulas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li><strong>Comissão:</strong> R$ 0,50 x km da rota</li>
                      <li><strong>Diesel:</strong> (km / consumo) x preço do litro</li>
                      <li><strong>Seguro:</strong> Valor do Bem x 0,03%</li>
                      <li><strong>Valor Base:</strong> soma de todos os custos</li>
                      <li><strong>CTe:</strong> Valor Base / 0,7875</li>
                      <li><strong>Impostos:</strong> CTe - Valor Base (21,25%)</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative flex-1 w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, email ou telefone..."
                    value={searchQuotes}
                    onChange={(e) => setSearchQuotes(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-quotes"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {filteredQuotes.length} cotaç{filteredQuotes.length !== 1 ? "ões" : "ão"}
                </p>
              </div>

              {quotesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredQuotes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <List className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma cotação salva</h3>
                    <p className="max-w-md mx-auto">
                      Use a calculadora para criar e salvar suas cotações de frete.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredQuotes.map(quote => (
                    <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {quote.quoteName && (
                                <span className="font-semibold text-sm truncate" data-testid={`text-quote-name-${quote.id}`}>
                                  {quote.quoteName}
                                </span>
                              )}
                              <h3 className={`text-sm truncate ${quote.quoteName ? "text-muted-foreground" : "font-semibold"}`} data-testid={`text-quote-client-${quote.id}`}>
                                {quote.quoteName ? `— ${quote.clientName}` : quote.clientName}
                              </h3>
                              {quote.validUntil && (
                                <Badge
                                  variant={isExpired(quote.validUntil) ? "destructive" : "outline"}
                                  className="text-xs shrink-0"
                                >
                                  {isExpired(quote.validUntil) ? "Expirada" : `Válida até ${formatDate(quote.validUntil)}`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                              {quote.clientPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {quote.clientPhone}
                                </span>
                              )}
                              {quote.clientEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {quote.clientEmail}
                                </span>
                              )}
                              {quote.createdAt && (
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                              <span>Distância: <strong>{parseFloat(quote.distanciaKm).toFixed(0)} km</strong></span>
                              <span>Base: <strong>{formatCurrency(parseFloat(quote.valorBase))}</strong></span>
                              <span className="text-primary font-bold">CTe: {formatCurrency(parseFloat(quote.valorTotalCte))}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => convertToContractMutation.mutate(quote)}
                              disabled={convertToContractMutation.isPending}
                              title="Converter em Contrato de Frete"
                              data-testid={`button-convert-contract-${quote.id}`}
                            >
                              <FilePlus2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-primary hover:text-primary"
                              onClick={() => handleDownloadPDF(quote)}
                              title="Baixar PDF da cotação"
                              data-testid={`button-download-pdf-${quote.id}`}
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleLoadQuote(quote)}
                              title="Carregar na calculadora"
                              data-testid={`button-load-quote-${quote.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setDeletingQuoteId(quote.id)}
                              data-testid={`button-delete-quote-${quote.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* History section */}
              {convertedQuotes.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => setShowHistory(v => !v)}
                    data-testid="button-toggle-history"
                  >
                    <History className="h-4 w-4" />
                    <span>Histórico de conversões ({convertedQuotes.length})</span>
                    {showHistory ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
                  </button>

                  {showHistory && (
                    <div className="space-y-2 mt-3">
                      {convertedQuotes.map(quote => (
                        <Card key={quote.id} className="border-dashed opacity-75" data-testid={`card-quote-converted-${quote.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {quote.quoteName && (
                                    <span className="font-medium text-sm truncate" data-testid={`text-converted-name-${quote.id}`}>
                                      {quote.quoteName}
                                    </span>
                                  )}
                                  <span className="text-sm text-muted-foreground truncate">
                                    {quote.quoteName ? `— ${quote.clientName}` : quote.clientName}
                                  </span>
                                  <Badge variant="secondary" className="text-xs shrink-0 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                                    Convertida em Contrato
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                  {quote.convertedAt && (
                                    <span className="flex items-center gap-1">
                                      <History className="h-3 w-3" />
                                      Convertida em {new Date(quote.convertedAt).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                  <span>CTe: <strong>{(parseFloat(quote.valorTotalCte)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
                                </div>
                              </div>
                              <a
                                href="/contratos-frete"
                                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                                title="Ver contrato gerado"
                                data-testid={`link-view-contract-${quote.id}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver contrato
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={(open) => { if (!open) setSaveDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Cotação de Frete</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar esta cotação. Ex: "Entrega SP → RJ – Março 2026"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="quote-name-input">Nome da Cotação *</Label>
            <Input
              id="quote-name-input"
              placeholder="Ex: Entrega SP → RJ – Março 2026"
              value={quoteName}
              onChange={(e) => setQuoteName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmSave(); }}
              autoFocus
              data-testid="input-quote-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saveMutation.isPending || !quoteName.trim()}
              data-testid="button-confirm-save-quote"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Cotação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingQuoteId} onOpenChange={(open) => { if (!open) setDeletingQuoteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta cotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingQuoteId && deleteMutation.mutate(deletingQuoteId)}
              data-testid="button-confirm-delete-quote"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
