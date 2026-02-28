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
import { Loader2, X, CreditCard, User, Send, FileText, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Driver, Contract } from "@shared/schema";
import { getAccessToken } from "@/hooks/use-auth";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const cnhTypes = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

function buildFullAddress(driver: Driver): string {
  const parts = [];
  if (driver.address) {
    let addressPart = driver.address;
    if (driver.addressNumber) addressPart += `, ${driver.addressNumber}`;
    parts.push(addressPart);
  }
  if (driver.neighborhood) parts.push(driver.neighborhood);
  if (driver.city) {
    let cityPart = driver.city;
    if (driver.state) cityPart += ` - ${driver.state}`;
    parts.push(cityPart);
  }
  if (driver.cep) parts.push(driver.cep);
  return parts.join(", ");
}

const driverFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  phone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  fullAddress: z.string().optional().or(z.literal("")),
  cep: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  modality: z.enum(["pj", "clt", "agregado"]).optional().or(z.literal("")),
  cnhType: z.enum(cnhTypes, { required_error: "Tipo de CNH é obrigatório" }),
  cnhFrontPhoto: z.string().optional(),
  cnhBackPhoto: z.string().optional(),
  profilePhoto: z.string().optional(),
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

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birthDate: "",
      fullAddress: "",
      cep: "",
      address: "",
      addressNumber: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      latitude: "",
      longitude: "",
      modality: undefined,
      cnhType: undefined,
      cnhFrontPhoto: "",
      cnhBackPhoto: "",
      profilePhoto: "",
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
        fullAddress: buildFullAddress(driver),
        cep: driver.cep || "",
        address: driver.address || "",
        addressNumber: driver.addressNumber || "",
        complement: driver.complement || "",
        neighborhood: driver.neighborhood || "",
        city: driver.city || "",
        state: driver.state || "",
        latitude: driver.latitude || "",
        longitude: driver.longitude || "",
        modality: driver.modality,
        cnhType: driver.cnhType as typeof cnhTypes[number],
        cnhFrontPhoto: driver.cnhFrontPhoto || "",
        cnhBackPhoto: driver.cnhBackPhoto || "",
        profilePhoto: driver.profilePhoto || "",
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
        fullAddress: "",
        cep: "",
        address: "",
        addressNumber: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        latitude: "",
        longitude: "",
        modality: undefined,
        cnhType: undefined,
        cnhFrontPhoto: "",
        cnhBackPhoto: "",
        profilePhoto: "",
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
    fieldName: "cnhFrontPhoto" | "cnhBackPhoto" | "profilePhoto"
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

  const handleAddressSelect = (addressData: {
    address: string;
    addressNumber: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    formattedAddress: string;
    latitude?: number;
    longitude?: number;
  }) => {
    form.setValue("fullAddress", addressData.formattedAddress);
    form.setValue("address", addressData.address);
    form.setValue("addressNumber", addressData.addressNumber);
    form.setValue("neighborhood", addressData.neighborhood);
    form.setValue("city", addressData.city);
    form.setValue("state", addressData.state);
    form.setValue("cep", addressData.cep);
    if (addressData.latitude) {
      form.setValue("latitude", String(addressData.latitude));
    }
    if (addressData.longitude) {
      form.setValue("longitude", String(addressData.longitude));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-address-suggestion]')) {
            e.preventDefault();
          }
        }}
      >
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <AddressAutocomplete
                              value={field.value || ""}
                              onChange={handleAddressSelect}
                              onInputChange={field.onChange}
                              placeholder="Digite o endereço para buscar..."
                              testId="input-driver-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="complement"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Apto, Casa, Bloco..." data-testid="input-driver-complement" />
                          </FormControl>
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
                          <FormLabel>Modalidade</FormLabel>
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
                      name="profilePhoto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Foto de Perfil</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {field.value ? (
                                <div className="relative inline-block">
                                  <img 
                                    src={field.value} 
                                    alt="Foto de Perfil" 
                                    className="h-24 w-24 rounded-full object-cover border"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="absolute -right-2 -top-2 h-6 w-6"
                                    onClick={() => form.setValue("profilePhoto", "")}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(e, "profilePhoto")}
                                    disabled={isUploading}
                                    data-testid="upload-profile-photo"
                                  />
                                  {isUploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                      <User className="h-6 w-6" />
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
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="isApto"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Apto para Trabalhar</FormLabel>
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

            {isEditing && driver && (
              <DocumentReviewSection driver={driver} driverId={driverId!} />
            )}

            {isEditing && (
              <SendContractSection driverId={driverId!} driverEmail={form.watch("email")} />
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentReviewSection({ driver, driverId }: { driver: Driver; driverId: string }) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasDocuments = driver.profilePhoto || driver.cnhFrontPhoto || driver.cnhBackPhoto;
  const approvalStatus = driver.documentsApproved || "pendente";

  const approveMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("POST", `/api/drivers/${driverId}/approve-documents`, { status });
    },
    onSuccess: (_res, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers", driverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      const msgs: Record<string, string> = {
        aprovado: "Documentos aprovados com sucesso!",
        reprovado: "Documentos reprovados.",
        pendente: "Status dos documentos voltou para pendente.",
      };
      toast({ title: msgs[status] || "Status atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status dos documentos", variant: "destructive" });
    },
  });

  const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
    aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
    reprovado: { label: "Reprovado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  };

  const current = statusConfig[approvalStatus] || statusConfig.pendente;
  const StatusIcon = current.icon;

  return (
    <div className="space-y-4 mt-6 pt-6 border-t">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Verificação de Documentos
        </h3>
        <Badge variant="outline" className={current.className} data-testid="badge-documents-status">
          <StatusIcon className="h-3 w-3 mr-1" />
          {current.label}
        </Badge>
      </div>

      {driver.documentsApprovedBy && approvalStatus !== "pendente" && (
        <p className="text-xs text-muted-foreground">
          {approvalStatus === "aprovado" ? "Aprovado" : "Reprovado"} por: {driver.documentsApprovedBy}
          {driver.documentsApprovedAt && ` em ${new Date(driver.documentsApprovedAt).toLocaleDateString("pt-BR")}`}
        </p>
      )}

      {!hasDocuments ? (
        <p className="text-sm text-muted-foreground">
          Nenhum documento enviado pelo motorista. Os documentos (foto de perfil, CNH frente e verso) precisam ser enviados antes da aprovação.
        </p>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-3">
            {[
              { label: "Foto de Perfil", src: driver.profilePhoto, rounded: true },
              { label: "CNH Frente", src: driver.cnhFrontPhoto, rounded: false },
              { label: "CNH Verso", src: driver.cnhBackPhoto, rounded: false },
            ].map((doc) => (
              <div key={doc.label} className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">{doc.label}</span>
                {doc.src ? (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(doc.src!)}
                    className={`overflow-hidden border-2 cursor-pointer transition-opacity hover:opacity-80 ${
                      doc.rounded ? "h-20 w-20 rounded-full" : "h-20 w-28 rounded-md"
                    } ${approvalStatus === "aprovado" ? "border-green-500" : approvalStatus === "reprovado" ? "border-red-500" : "border-muted"}`}
                    data-testid={`button-view-${doc.label.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <img src={doc.src} alt={doc.label} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className={`flex items-center justify-center bg-muted text-muted-foreground ${
                    doc.rounded ? "h-20 w-20 rounded-full" : "h-20 w-28 rounded-md"
                  }`}>
                    <span className="text-xs">Não enviado</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {approvalStatus !== "aprovado" && (
              <Button
                type="button"
                onClick={() => approveMutation.mutate("aprovado")}
                disabled={approveMutation.isPending}
                data-testid="button-approve-documents"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aprovar Documentos
              </Button>
            )}
            {approvalStatus !== "reprovado" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => approveMutation.mutate("reprovado")}
                disabled={approveMutation.isPending}
                data-testid="button-reject-documents"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reprovar
              </Button>
            )}
            {approvalStatus !== "pendente" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => approveMutation.mutate("pendente")}
                disabled={approveMutation.isPending}
                data-testid="button-reset-documents"
              >
                <Clock className="mr-2 h-4 w-4" />
                Voltar para Pendente
              </Button>
            )}
          </div>
        </>
      )}

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Visualizar Documento</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              <img src={selectedImage} alt="Documento" className="max-h-[60vh] max-w-full object-contain rounded-md" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SendContractSection({ driverId, driverEmail }: { driverId: string; driverEmail?: string }) {
  const { toast } = useToast();
  const [selectedContractId, setSelectedContractId] = useState<string>("");

  const { data: contractsList = [] } = useQuery<(Contract & { driver?: any })[]>({
    queryKey: ["/api/contracts"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/contracts/${selectedContractId}/send-email`, {
        driverId,
      });
    },
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: data.message || "Contrato enviado com sucesso!" });
      setSelectedContractId("");
    },
    onError: async (error: any) => {
      let msg = "Erro ao enviar contrato por email";
      try {
        if (error?.message) msg = error.message;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 mt-6 pt-6 border-t">
      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Enviar Contrato por Email
      </h3>
      {!driverEmail && (
        <p className="text-sm text-muted-foreground">
          Este motorista não possui email cadastrado. Adicione um email acima para poder enviar contratos.
        </p>
      )}
      {driverEmail && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Selecione um contrato cadastrado para enviar ao email do motorista ({driverEmail}).
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger data-testid="select-contract-to-send">
                  <SelectValue placeholder="Selecione um contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contractsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} - {c.title || "Sem título"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={!selectedContractId || sendMutation.isPending}
              data-testid="button-send-contract-email"
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
