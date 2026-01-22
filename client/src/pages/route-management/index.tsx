import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Star, 
  StarOff, 
  Fuel, 
  Truck, 
  MapPin, 
  DollarSign, 
  Calculator,
  TrendingUp,
  Percent,
  Receipt,
  Edit2,
  Loader2
} from "lucide-react";
import type { Yard, DeliveryLocation, Route } from "@shared/schema";

const truckTypes = [
  { value: "2_eixos", label: "2 Eixos" },
  { value: "3_eixos", label: "3 Eixos" },
  { value: "4_eixos", label: "4 Eixos" },
  { value: "5_eixos", label: "5 Eixos" },
  { value: "6_eixos", label: "6 Eixos" },
  { value: "7_eixos", label: "7 Eixos" },
  { value: "9_eixos", label: "9 Eixos" },
];

const routeFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  originYardId: z.string().min(1, "Selecione o pátio de origem"),
  destinationLocationId: z.string().min(1, "Selecione o local de entrega"),
  distanceKm: z.string().optional(),
  truckType: z.string().optional(),
  dieselPrice: z.string().optional(),
  fuelConsumption: z.string().optional(),
  tollCost: z.string().optional(),
  driverDailyCost: z.string().optional(),
  returnTicket: z.string().optional(),
  extraExpenses: z.string().optional(),
  adValoremPercentage: z.string().optional(),
  vehicleValue: z.string().optional(),
  profitMarginPercentage: z.string().optional(),
  adminFee: z.string().optional(),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

interface RouteWithRelations extends Route {
  originYard: Yard | null;
  destinationLocation: DeliveryLocation | null;
}

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CostSummaryCard({ 
  fuelCost, 
  arla32Cost, 
  tollCost, 
  driverDailyCost, 
  returnTicket, 
  extraExpenses, 
  adValoremCost,
  adminFee,
  totalCost, 
  suggestedPrice, 
  netProfit 
}: {
  fuelCost: number;
  arla32Cost: number;
  tollCost: number;
  driverDailyCost: number;
  returnTicket: number;
  extraExpenses: number;
  adValoremCost: number;
  adminFee: number;
  totalCost: number;
  suggestedPrice: number;
  netProfit: number;
}) {
  return (
    <Card className="border-2 border-slate-700 bg-slate-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-400" />
          Dashboard de Resumo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Combustível</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(fuelCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Arla 32 (5%)</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(arla32Cost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Pedágios</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(tollCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Diária Motorista</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(driverDailyCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Passagem Retorno</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(returnTicket)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Despesas Extras</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(extraExpenses)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Ad Valorem</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(adValoremCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-400">Taxa Admin.</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(adminFee)}</p>
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-blue-900/30 border border-blue-700/30">
            <span className="text-sm font-medium text-blue-200">Custo Total</span>
            <span className="text-lg font-bold text-blue-400">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-900/30 border border-emerald-700/30">
            <span className="text-sm font-medium text-emerald-200">Preço Sugerido</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(suggestedPrice)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-green-900/30 border border-green-700/30">
            <span className="text-sm font-medium text-green-200">Lucro Líquido</span>
            <span className="text-lg font-bold text-green-400">{formatCurrency(netProfit)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RouteManagementPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteWithRelations | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [calculatedCosts, setCalculatedCosts] = useState({
    fuelCost: 0,
    arla32Cost: 0,
    tollCost: 0,
    driverDailyCost: 0,
    returnTicket: 0,
    extraExpenses: 0,
    adValoremCost: 0,
    adminFee: 0,
    totalCost: 0,
    suggestedPrice: 0,
    netProfit: 0,
  });

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      originYardId: "",
      destinationLocationId: "",
      distanceKm: "",
      truckType: "2_eixos",
      dieselPrice: "6.50",
      fuelConsumption: "3.5",
      tollCost: "",
      driverDailyCost: "",
      returnTicket: "",
      extraExpenses: "",
      adValoremPercentage: "0.10",
      vehicleValue: "",
      profitMarginPercentage: "15",
      adminFee: "50",
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const distanceKm = parseFloat(watchedValues.distanceKm || "0");
    const dieselPrice = parseFloat(watchedValues.dieselPrice || "0");
    const fuelConsumption = parseFloat(watchedValues.fuelConsumption || "0");
    const tollCost = parseFloat(watchedValues.tollCost || "0");
    const driverDailyCost = parseFloat(watchedValues.driverDailyCost || "0");
    const returnTicket = parseFloat(watchedValues.returnTicket || "0");
    const extraExpenses = parseFloat(watchedValues.extraExpenses || "0");
    const adValoremPercentage = parseFloat(watchedValues.adValoremPercentage || "0");
    const vehicleValue = parseFloat(watchedValues.vehicleValue || "0");
    const profitMarginPercentage = parseFloat(watchedValues.profitMarginPercentage || "0");
    const adminFee = parseFloat(watchedValues.adminFee || "0");

    const fuelCost = fuelConsumption > 0 ? (distanceKm / fuelConsumption) * dieselPrice : 0;
    const arla32Cost = fuelCost * 0.05;
    const adValoremCost = (vehicleValue * adValoremPercentage) / 100;
    const totalCost = fuelCost + arla32Cost + tollCost + driverDailyCost + returnTicket + extraExpenses + adValoremCost + adminFee;
    const suggestedPrice = totalCost * (1 + profitMarginPercentage / 100);
    const netProfit = suggestedPrice - totalCost;

    setCalculatedCosts({
      fuelCost,
      arla32Cost,
      tollCost,
      driverDailyCost,
      returnTicket,
      extraExpenses,
      adValoremCost,
      adminFee,
      totalCost,
      suggestedPrice,
      netProfit,
    });
  }, [watchedValues]);

  // Track last calculated route to avoid duplicate API calls (using ref to avoid triggering re-renders)
  const lastCalculatedKeyRef = useRef("");
  const isCalculatingRef = useRef(false);

  // Auto-fetch distance and tolls when origin and destination are selected
  useEffect(() => {
    const fetchRouteInfo = async () => {
      const originYardId = watchedValues.originYardId;
      const destinationLocationId = watchedValues.destinationLocationId;
      const truckType = watchedValues.truckType;
      
      // Only fetch if both are selected
      if (!originYardId || !destinationLocationId) {
        return;
      }
      
      // Create a unique key for this route combination
      const routeKey = `${originYardId}-${destinationLocationId}-${truckType}`;
      
      // Don't fetch if already calculated this exact route or currently calculating
      if (routeKey === lastCalculatedKeyRef.current || isCalculatingRef.current) {
        return;
      }
      
      isCalculatingRef.current = true;
      setIsCalculatingRoute(true);
      
      try {
        const truckAxles = truckType?.replace("_eixos", "") || "2";
        const response = await apiRequest("POST", "/api/routes/calculate-route", {
          originYardId,
          destinationLocationId,
          truckAxles
        });
        
        const data = await response.json();
        
        if (data.distanceKm) {
          form.setValue("distanceKm", data.distanceKm);
        }
        
        if (data.tollCost !== null && data.tollCost !== undefined) {
          form.setValue("tollCost", data.tollCost);
          toast({
            title: "Rota calculada",
            description: `Distância: ${data.distanceKm} km | Pedágio: R$ ${data.tollCost}`,
          });
        } else {
          toast({
            title: "Distância calculada",
            description: `Distância: ${data.distanceKm} km. Pedágio não disponível via API.`,
          });
        }
        
        lastCalculatedKeyRef.current = routeKey;
        setRouteCalculated(true);
      } catch (error) {
        console.error("Error calculating route:", error);
      } finally {
        isCalculatingRef.current = false;
        setIsCalculatingRoute(false);
      }
    };
    
    fetchRouteInfo();
  }, [watchedValues.originYardId, watchedValues.destinationLocationId, watchedValues.truckType]);

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<RouteWithRelations[]>({
    queryKey: ["/api/routes"],
  });

  const { data: yards = [] } = useQuery<Yard[]>({
    queryKey: ["/api/yards"],
  });

  const { data: deliveryLocations = [] } = useQuery<DeliveryLocation[]>({
    queryKey: ["/api/delivery-locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: RouteFormData) => {
      return apiRequest("POST", "/api/routes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota cadastrada com sucesso!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar rota", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RouteFormData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/routes/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota atualizada com sucesso!" });
      setIsDialogOpen(false);
      setEditingRoute(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar rota", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Rota excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir rota", variant: "destructive" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/routes/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar favorito", variant: "destructive" });
    },
  });

  const handleSubmit = (data: RouteFormData) => {
    if (editingRoute) {
      updateMutation.mutate({ ...data, id: editingRoute.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (route: RouteWithRelations) => {
    setEditingRoute(route);
    setRouteCalculated(true); // Already has values, don't auto-fetch
    form.reset({
      name: route.name,
      originYardId: route.originYardId,
      destinationLocationId: route.destinationLocationId,
      distanceKm: route.distanceKm || "",
      truckType: route.truckType || "2_eixos",
      dieselPrice: route.dieselPrice || "6.50",
      fuelConsumption: route.fuelConsumption || "3.5",
      tollCost: route.tollCost || "",
      driverDailyCost: route.driverDailyCost || "",
      returnTicket: route.returnTicket || "",
      extraExpenses: route.extraExpenses || "",
      adValoremPercentage: route.adValoremPercentage || "0.10",
      vehicleValue: route.vehicleValue || "",
      profitMarginPercentage: route.profitMarginPercentage || "15",
      adminFee: route.adminFee || "50",
    });
    setIsDialogOpen(true);
  };

  const handleNewRoute = () => {
    setEditingRoute(null);
    setRouteCalculated(false);
    lastCalculatedKeyRef.current = "";
    form.reset();
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Gestão de Rotas (Em dev)" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            Cadastre rotas e calcule automaticamente a viabilidade financeira
          </p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setRouteCalculated(false);
                lastCalculatedKeyRef.current = "";
                setEditingRoute(null);
              }
            }}>
            <DialogTrigger asChild>
              <Button onClick={handleNewRoute} data-testid="button-new-route">
                <Plus className="h-4 w-4 mr-2" />
                Nova Rota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingRoute ? "Editar Rota" : "Cadastrar Nova Rota"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            Origem e Destino
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome da Rota</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: SP - RJ" {...field} data-testid="input-route-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="originYardId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pátio de Origem</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-origin-yard">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {yards.map((yard) => (
                                      <SelectItem key={yard.id} value={yard.id}>
                                        {yard.name} - {yard.city}/{yard.state}
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
                            name="destinationLocationId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Local de Entrega</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-destination">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {deliveryLocations.map((loc) => (
                                      <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name} - {loc.city}/{loc.state}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Truck className="h-4 w-4 text-slate-500" />
                            Dados da Rota
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="distanceKm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Distância (km)
                                  {isCalculatingRoute && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0" {...field} data-testid="input-distance" />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">Calculado automaticamente ou edite manualmente</p>
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-truck-type">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {truckTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
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
                            name="tollCost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Pedágios (R$)
                                  {isCalculatingRoute && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-toll" />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">Calculado automaticamente ou edite manualmente</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-amber-500" />
                            Parâmetros de Combustível
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dieselPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preço Diesel S10 (R$/L)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="6,50" {...field} data-testid="input-diesel-price" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="fuelConsumption"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Consumo Médio (km/L)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="3,5" {...field} data-testid="input-fuel-consumption" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-purple-500" />
                            Logística do Motorista
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="driverDailyCost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Diária (R$)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-driver-daily" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="returnTicket"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Passagem Retorno (R$)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-return-ticket" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="extraExpenses"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Despesas Extras (R$)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-extra-expenses" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Percent className="h-4 w-4 text-green-500" />
                            Taxas e Lucro
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="vehicleValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor do Veículo (R$)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-vehicle-value" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="adValoremPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ad Valorem (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0,10" {...field} data-testid="input-ad-valorem" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="profitMarginPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Margem de Lucro (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="15" {...field} data-testid="input-profit-margin" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="adminFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa Adm. (R$)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="50,00" {...field} data-testid="input-admin-fee" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="lg:col-span-1">
                      <CostSummaryCard {...calculatedCosts} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-route"
                    >
                      {editingRoute ? "Atualizar Rota" : "Salvar Rota"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingRoutes ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma rota cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre sua primeira rota para calcular a viabilidade financeira
            </p>
            <Button onClick={handleNewRoute}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Rota
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <Card 
                key={route.id} 
                className={`hover-elevate transition-all ${route.isFavorite === "true" ? "border-yellow-500/50" : ""}`}
                data-testid={`card-route-${route.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate flex items-center gap-2">
                        {route.isFavorite === "true" && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                        {route.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {route.originYard?.name} → {route.destinationLocation?.name}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => favoriteMutation.mutate(route.id)}
                        data-testid={`button-favorite-${route.id}`}
                      >
                        {route.isFavorite === "true" ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(route)}
                        data-testid={`button-edit-${route.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(route.id)}
                        data-testid={`button-delete-${route.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{route.distanceKm || 0} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span>{truckTypes.find(t => t.value === route.truckType)?.label || "2 Eixos"}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Custo Total</span>
                      <span className="font-medium text-blue-600">{formatCurrency(route.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço Sugerido</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(route.suggestedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lucro Líquido</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatCurrency(route.netProfit)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
