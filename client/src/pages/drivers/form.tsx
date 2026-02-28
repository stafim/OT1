import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, CreditCard, Search } from "lucide-react";
import type { Driver } from "@shared/schema";
import { fetchAddressFromCep } from "@/lib/cep";

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
  address: z.string().optional().or(z.literal("")),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Município é obrigatório"),
  state: z.enum(brazilianStates, { required_error: "UF é obrigatória" }),
  driverType: z.enum(["coleta", "transporte"]).optional().or(z.literal("")),
  modality: z.enum(["pj", "clt", "agregado"]).optional().or(z.literal("")),
  cnhType: z.enum(cnhTypes, { required_error: "Tipo de CNH é obrigatório" }),
  cnhFrontPhoto: z.string().optional(),
  cnhBackPhoto: z.string().optional(),
  isApto: z.string().default("false"),
  isActive: z.string().default("true"),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

export default function DriverFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = id && id !== "novo";

  const { data: driver, isLoading: driverLoading } = useQuery<Driver>({
    queryKey: ["/api/drivers", id],
    enabled: !!isEditing,
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
      driverType: undefined,
      modality: undefined,
      cnhType: undefined,
      cnhFrontPhoto: "",
      cnhBackPhoto: "",
      isApto: "false",
      isActive: "true",
    },
  });

  useEffect(() => {
    if (driver) {
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
        driverType: driver.driverType || undefined,
        modality: driver.modality || undefined,
        cnhType: driver.cnhType as typeof cnhTypes[number],
        cnhFrontPhoto: driver.cnhFrontPhoto || "",
        cnhBackPhoto: driver.cnhBackPhoto || "",
        isApto: driver.isApto || "false",
        isActive: driver.isActive || "true",
      });
    }
  }, [driver, form]);

  const uploadPhoto = async (file: File): Promise<string> => {
    const response = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        return apiRequest("PATCH", `/api/drivers/${id}`, data);
      }
      return apiRequest("POST", "/api/drivers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: isEditing ? "Motorista atualizado com sucesso" : "Motorista cadastrado com sucesso" });
      navigate("/motoristas");
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

  if (isEditing && driverLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={isEditing ? "Editar Motorista" : "Novo Motorista"}
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Motoristas", href: "/motoristas" },
          { label: isEditing ? "Editar" : "Novo" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                      <FormLabel>Endereço</FormLabel>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="driverType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Motorista</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-driver-type">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="coleta">Coleta</SelectItem>
                          <SelectItem value="transporte">Transporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/motoristas")}
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
      </div>
    </div>
  );
}
