import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, CreditCard } from "lucide-react";
import type { Driver } from "@shared/schema";
import { fetchAddressFromCep } from "@/lib/cep";
import { getAccessToken } from "@/hooks/use-auth";

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
] as const;

const cnhTypes = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

const driverFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  phone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  cep: z.string().min(8, "CEP é obrigatório"),
  address: z.string().min(5, "Endereço é obrigatório"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Município é obrigatório"),
  state: z.enum(brazilianStates, { required_error: "UF é obrigatória" }),
  modality: z.enum(["pj", "clt", "agregado"], { required_error: "Modalidade é obrigatória" }),
  cnhType: z.enum(cnhTypes, { required_error: "Tipo de CNH é obrigatório" }),
  cnhFrontPhoto: z.string().optional(),
  cnhBackPhoto: z.string().optional(),
  isApto: z.string().default("false"),
  isActive: z.string().default("true"),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId?: string | null;
}

export function DriverFormDialog({ open, onOpenChange, driverId }: DriverFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!driverId;

  const { data: driver, isLoading: driverLoading } = useQuery<Driver>({
    queryKey: ["/api/drivers", driverId],
    enabled: isEditing && open,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birthDate: "",
      cep: "",
      address: "",
      addressNumber: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: undefined,
      modality: undefined,
      cnhType: undefined,
      cnhFrontPhoto: "",
      cnhBackPhoto: "",
      isApto: "false",
      isActive: "true",
    },
  });

  useEffect(() => {
    if (driver && isEditing) {
      form.reset({
        name: driver.name || "",
        cpf: driver.cpf || "",
        phone: driver.phone || "",
        email: driver.email || "",
        birthDate: driver.birthDate || "",
        cep: driver.cep || "",
        address: driver.address || "",
        addressNumber: driver.addressNumber || "",
        complement: driver.complement || "",
        neighborhood: driver.neighborhood || "",
        city: driver.city || "",
        state: (driver.state as typeof brazilianStates[number]) || undefined,
        modality: driver.modality,
        cnhType: driver.cnhType as typeof cnhTypes[number],
        cnhFrontPhoto: driver.cnhFrontPhoto || "",
        cnhBackPhoto: driver.cnhBackPhoto || "",
        isApto: driver.isApto || "false",
        isActive: driver.isActive || "true",
      });
    } else if (!isEditing && open) {
      form.reset({
        name: "",
        cpf: "",
        phone: "",
        email: "",
        birthDate: "",
        cep: "",
        address: "",
        addressNumber: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: undefined,
        modality: undefined,
        cnhType: undefined,
        cnhFrontPhoto: "",
        cnhBackPhoto: "",
        isApto: "false",
        isActive: "true",
      });
    }
  }, [driver, form, isEditing, open]);

  const uploadPhoto = async (file: File): Promise<string> => {
    const token = getAccessToken();
    const response = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    if (!response.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, objectPath } = await response.json();
    await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return objectPath;
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "cnhFrontPhoto" | "cnhBackPhoto"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const path = await uploadPhoto(file);
      form.setValue(fieldName, path);
      toast({ title: "Foto enviada com sucesso" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/drivers/${driverId}`, data);
      }
      return apiRequest("POST", "/api/drivers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: isEditing ? "Motorista atualizado com sucesso" : "Motorista cadastrado com sucesso" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar motorista", variant: "destructive" });
    },
  });

  const onSubmit = (data: DriverFormData) => {
    mutation.mutate(data);
  };

  const handleCepBlur = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const addressData = await fetchAddressFromCep(cleanCep);
      if (addressData) {
        form.setValue("address", addressData.address);
        form.setValue("neighborhood", addressData.neighborhood);
        form.setValue("city", addressData.city);
        form.setValue("state", addressData.state as typeof brazilianStates[number]);
        toast({ title: "Endereço preenchido automaticamente" });
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setIsFetchingCep(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditing ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
        </DialogHeader>
        
        {isEditing && driverLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-8rem)] px-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados Pessoais</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="000.000.000-00" data-testid="input-driver-cpf" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-driver-birthdate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-driver-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(00) 00000-0000" data-testid="input-driver-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Endereço</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                placeholder="00000-000" 
                                data-testid="input-driver-cep"
                                onBlur={(e) => {
                                  field.onBlur();
                                  handleCepBlur(e.target.value);
                                }}
                              />
                              {isFetchingCep && (
                                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="addressNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-complement" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-neighborhood" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Município *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-driver-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-driver-state">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brazilianStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados Profissionais</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="modality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modalidade *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-driver-modality">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="clt">CLT</SelectItem>
                              <SelectItem value="pj">PJ</SelectItem>
                              <SelectItem value="agregado">Agregado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cnhType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de CNH *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-driver-cnh-type">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cnhTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
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
                      name="cnhFrontPhoto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNH Frente</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {field.value ? (
                                <div className="relative inline-block">
                                  <img 
                                    src={field.value} 
                                    alt="CNH Frente" 
                                    className="h-24 w-36 rounded-md object-cover border"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="absolute -right-2 -top-2 h-6 w-6"
                                    onClick={() => form.setValue("cnhFrontPhoto", "")}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex h-24 w-36 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(e, "cnhFrontPhoto")}
                                    disabled={isUploading}
                                    data-testid="upload-cnh-front"
                                  />
                                  {isUploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                      <CreditCard className="h-6 w-6" />
                                      <span className="text-xs">Upload</span>
                                    </div>
                                  )}
                                </label>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cnhBackPhoto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNH Verso</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {field.value ? (
                                <div className="relative inline-block">
                                  <img 
                                    src={field.value} 
                                    alt="CNH Verso" 
                                    className="h-24 w-36 rounded-md object-cover border"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="absolute -right-2 -top-2 h-6 w-6"
                                    onClick={() => form.setValue("cnhBackPhoto", "")}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex h-24 w-36 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(e, "cnhBackPhoto")}
                                    disabled={isUploading}
                                    data-testid="upload-cnh-back"
                                  />
                                  {isUploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                      <CreditCard className="h-6 w-6" />
                                      <span className="text-xs">Upload</span>
                                    </div>
                                  )}
                                </label>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="isApto"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Apto para Serviço</FormLabel>
                            <p className="text-xs text-muted-foreground">Motorista disponível para transportes</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value === "true"}
                              onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              data-testid="switch-driver-apto"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ativo</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value === "true"}
                              onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                              data-testid="switch-driver-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={mutation.isPending} data-testid="button-save-driver">
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
