import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, ChevronsUpDown, Upload, X, MapPin, Camera, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transport, Client, Yard, Vehicle, DeliveryLocation, Driver } from "@shared/schema";

interface PhotoUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  testId: string;
}

function PhotoUpload({ label, value, onChange, testId }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");

      const { signedUrl, objectPath } = await response.json();

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const publicUrl = `/api/object-storage${objectPath}`;
      onChange(publicUrl);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-24 w-24 rounded-md object-cover border" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={() => onChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
            data-testid={testId}
          />
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </label>
      )}
    </div>
  );
}

interface MultiPhotoUploadProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  testId: string;
  maxPhotos?: number;
}

function MultiPhotoUpload({ label, values = [], onChange, testId, maxPhotos = 5 }: MultiPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          name: file.name,
          isPublic: false,
        }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");

      const { signedUrl, objectPath } = await response.json();

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const publicUrl = `/api/object-storage/${encodeURIComponent(objectPath)}`;
      onChange([...values, publicUrl]);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((url, index) => (
          <div key={index} className="relative">
            <img src={url} alt={`${label} ${index + 1}`} className="h-20 w-20 rounded-md object-cover border" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5"
              onClick={() => removePhoto(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {values.length < maxPhotos && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
              data-testid={testId}
            />
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </label>
        )}
      </div>
    </div>
  );
}

const formSchema = z.object({
  vehicleChassi: z.string().min(1, "Veículo é obrigatório"),
  clientId: z.string().min(1, "Cliente é obrigatório"),
  originYardId: z.string().min(1, "Pátio de origem é obrigatório"),
  deliveryLocationId: z.string().min(1, "Local de entrega é obrigatório"),
  driverId: z.string().optional(),
  status: z.enum(["pendente", "em_transito", "entregue", "cancelado"]),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  checkinLatitude: z.string().optional(),
  checkinLongitude: z.string().optional(),
  checkinSelfiePhoto: z.string().optional(),
  checkinBodyPhotos: z.array(z.string()).optional(),
  checkinOdometerPhoto: z.string().optional(),
  checkinDamagePhotos: z.array(z.string()).optional(),
  checkinNotes: z.string().optional(),
  checkoutLatitude: z.string().optional(),
  checkoutLongitude: z.string().optional(),
  checkoutSelfiePhoto: z.string().optional(),
  checkoutBodyPhotos: z.array(z.string()).optional(),
  checkoutOdometerPhoto: z.string().optional(),
  checkoutDamagePhotos: z.array(z.string()).optional(),
  checkoutNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function TransportFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = id && id !== "novo";
  const [chassiOpen, setChassiOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [gettingCheckinLocation, setGettingCheckinLocation] = useState(false);
  const [gettingCheckoutLocation, setGettingCheckoutLocation] = useState(false);

  const { data: transport, isLoading: transportLoading } = useQuery<Transport>({
    queryKey: ["/api/transports", id],
    enabled: !!isEditing,
  });

  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: yards } = useQuery<Yard[]>({ queryKey: ["/api/yards"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleChassi: "",
      clientId: "",
      originYardId: "",
      deliveryLocationId: "",
      driverId: "",
      status: "pendente",
      deliveryDate: "",
      notes: "",
      checkinLatitude: "",
      checkinLongitude: "",
      checkinSelfiePhoto: "",
      checkinBodyPhotos: [],
      checkinOdometerPhoto: "",
      checkinDamagePhotos: [],
      checkinNotes: "",
      checkoutLatitude: "",
      checkoutLongitude: "",
      checkoutSelfiePhoto: "",
      checkoutBodyPhotos: [],
      checkoutOdometerPhoto: "",
      checkoutDamagePhotos: [],
      checkoutNotes: "",
    },
  });

  const clientId = form.watch("clientId");

  const { data: deliveryLocations } = useQuery<DeliveryLocation[]>({
    queryKey: ["/api/clients", clientId, "locations"],
    enabled: !!clientId,
  });

  useEffect(() => {
    if (transport) {
      form.reset({
        vehicleChassi: transport.vehicleChassi || "",
        clientId: transport.clientId || "",
        originYardId: transport.originYardId || "",
        deliveryLocationId: transport.deliveryLocationId || "",
        driverId: transport.driverId || "",
        status: transport.status,
        deliveryDate: transport.deliveryDate || "",
        notes: transport.notes || "",
        checkinLatitude: transport.checkinLatitude || "",
        checkinLongitude: transport.checkinLongitude || "",
        checkinSelfiePhoto: transport.checkinSelfiePhoto || "",
        checkinBodyPhotos: transport.checkinBodyPhotos || [],
        checkinOdometerPhoto: transport.checkinOdometerPhoto || "",
        checkinDamagePhotos: transport.checkinDamagePhotos || [],
        checkinNotes: transport.checkinNotes || "",
        checkoutLatitude: transport.checkoutLatitude || "",
        checkoutLongitude: transport.checkoutLongitude || "",
        checkoutSelfiePhoto: transport.checkoutSelfiePhoto || "",
        checkoutBodyPhotos: transport.checkoutBodyPhotos || [],
        checkoutOdometerPhoto: transport.checkoutOdometerPhoto || "",
        checkoutDamagePhotos: transport.checkoutDamagePhotos || [],
        checkoutNotes: transport.checkoutNotes || "",
      });
    }
  }, [transport, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        driverId: data.driverId || null,
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/transports/${id}`, payload);
      }
      return apiRequest("POST", "/api/transports", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: isEditing ? "Transporte atualizado com sucesso" : "Transporte criado com sucesso" });
      navigate("/transportes");
    },
    onError: () => {
      toast({ title: "Erro ao salvar transporte", variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      return apiRequest("PATCH", `/api/transports/${id}/checkin`, {
        latitude: data.checkinLatitude,
        longitude: data.checkinLongitude,
        selfiePhoto: data.checkinSelfiePhoto,
        bodyPhotos: data.checkinBodyPhotos,
        odometerPhoto: data.checkinOdometerPhoto,
        damagePhotos: data.checkinDamagePhotos,
        notes: data.checkinNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transports", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-in realizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao realizar check-in", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      return apiRequest("PATCH", `/api/transports/${id}/checkout`, {
        latitude: data.checkoutLatitude,
        longitude: data.checkoutLongitude,
        selfiePhoto: data.checkoutSelfiePhoto,
        bodyPhotos: data.checkoutBodyPhotos,
        odometerPhoto: data.checkoutOdometerPhoto,
        damagePhotos: data.checkoutDamagePhotos,
        notes: data.checkoutNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transports", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Check-out realizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao realizar check-out", variant: "destructive" });
    },
  });

  const getCheckinLocation = () => {
    setGettingCheckinLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("checkinLatitude", position.coords.latitude.toString());
        form.setValue("checkinLongitude", position.coords.longitude.toString());
        setGettingCheckinLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({ title: "Erro ao obter localização", variant: "destructive" });
        setGettingCheckinLocation(false);
      }
    );
  };

  const getCheckoutLocation = () => {
    setGettingCheckoutLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("checkoutLatitude", position.coords.latitude.toString());
        form.setValue("checkoutLongitude", position.coords.longitude.toString());
        setGettingCheckoutLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({ title: "Erro ao obter localização", variant: "destructive" });
        setGettingCheckoutLocation(false);
      }
    );
  };

  const availableVehicles = vehicles?.filter((v) => v.status === "em_estoque" || v.chassi === transport?.vehicleChassi);
  const activeDrivers = drivers?.filter((d) => d.isActive === "true" && d.isApto === "true");

  if (isEditing && transportLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={isEditing ? "Editar Transporte" : "Novo Transporte"}
        breadcrumbs={[
          { label: "Operação", href: "/" },
          { label: "Transportes", href: "/transportes" },
          { label: isEditing ? "Editar" : "Novo" },
        ]}
      />
      {isEditing && (
        <div className="flex justify-end px-4 md:px-6 pt-4">
          <Button
            type="button"
            variant={isEditMode ? "default" : "outline"}
            onClick={() => setIsEditMode(!isEditMode)}
            data-testid="button-toggle-edit"
          >
            {isEditMode ? "Visualizar" : "Editar"}
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Transporte</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vehicleChassi"
                  render={({ field }) => {
                    const selectedVehicle = availableVehicles?.find(v => v.chassi === field.value);
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Veículo (Chassi) *</FormLabel>
                        <Popover open={chassiOpen} onOpenChange={setChassiOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={chassiOpen}
                                className={cn(
                                  "justify-between font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-transport-vehicle"
                              >
                                {selectedVehicle
                                  ? selectedVehicle.chassi
                                  : "Buscar chassi..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Digite para buscar chassi..." />
                              <CommandList>
                                <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {availableVehicles?.map((v) => (
                                    <CommandItem
                                      key={v.chassi}
                                      value={v.chassi}
                                      onSelect={() => {
                                        field.onChange(v.chassi);
                                        setChassiOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === v.chassi ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {v.chassi}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transport-status">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_transito">Em Trânsito</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originYardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pátio de Origem *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transport-origin">
                            <SelectValue placeholder="Selecione o pátio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {yards?.map((y) => (
                            <SelectItem key={y.id} value={y.id}>
                              {y.name}
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
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("deliveryLocationId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-transport-client">
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                  name="deliveryLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Entrega *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!clientId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-transport-delivery">
                            <SelectValue placeholder={clientId ? "Selecione o local" : "Selecione um cliente primeiro"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deliveryLocations?.map((loc) => (
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
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-transport-date" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transport-driver">
                            <SelectValue placeholder="Selecione o motorista" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeDrivers?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} - {d.phone}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-transport-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {isEditing && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-base">Check-in (Retirada do Pátio)</CardTitle>
                    <div className="flex items-center gap-2">
                      {transport?.checkinDateTime ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Realizado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {transport?.checkinDateTime && (
                      <p className="text-sm text-muted-foreground">
                        Realizado em {format(new Date(transport.checkinDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {isEditMode && !transport?.checkinDateTime ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="checkinLatitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Latitude</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Latitude" data-testid="input-checkin-latitude" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="checkinLongitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Longitude</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Longitude" data-testid="input-checkin-longitude" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={getCheckinLocation}
                          disabled={gettingCheckinLocation}
                        >
                          {gettingCheckinLocation ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="mr-2 h-4 w-4" />
                          )}
                          Obter Localização
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="checkinSelfiePhoto"
                            render={({ field }) => (
                              <PhotoUpload
                                label="Selfie"
                                value={field.value || ""}
                                onChange={field.onChange}
                                testId="upload-checkin-selfie"
                              />
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="checkinOdometerPhoto"
                            render={({ field }) => (
                              <PhotoUpload
                                label="Odômetro"
                                value={field.value || ""}
                                onChange={field.onChange}
                                testId="upload-checkin-odometer"
                              />
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="checkinBodyPhotos"
                          render={({ field }) => (
                            <MultiPhotoUpload
                              label="Fotos da Lataria"
                              values={field.value || []}
                              onChange={field.onChange}
                              testId="upload-checkin-body"
                            />
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="checkinDamagePhotos"
                          render={({ field }) => (
                            <MultiPhotoUpload
                              label="Fotos de Avarias"
                              values={field.value || []}
                              onChange={field.onChange}
                              testId="upload-checkin-damage"
                            />
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="checkinNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="input-checkin-notes" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          onClick={() => checkinMutation.mutate()}
                          disabled={checkinMutation.isPending}
                          className="w-full"
                          data-testid="button-checkin"
                        >
                          {checkinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Realizar Check-in
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Latitude</p>
                            <p className="text-sm font-mono">{transport?.checkinLatitude || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Longitude</p>
                            <p className="text-sm font-mono">{transport?.checkinLongitude || "-"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {transport?.checkinSelfiePhoto && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Selfie</p>
                              <img src={transport.checkinSelfiePhoto} alt="Selfie" className="h-20 w-20 rounded-md object-cover border" />
                            </div>
                          )}
                          {transport?.checkinOdometerPhoto && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Odômetro</p>
                              <img src={transport.checkinOdometerPhoto} alt="Odômetro" className="h-20 w-20 rounded-md object-cover border" />
                            </div>
                          )}
                        </div>
                        {transport?.checkinBodyPhotos?.length ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fotos da Lataria</p>
                            <div className="flex flex-wrap gap-2">
                              {transport.checkinBodyPhotos.map((photo, i) => (
                                <img key={i} src={photo} alt={`Lataria ${i + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {transport?.checkinDamagePhotos?.length ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fotos de Avarias</p>
                            <div className="flex flex-wrap gap-2">
                              {transport.checkinDamagePhotos.map((photo, i) => (
                                <img key={i} src={photo} alt={`Avaria ${i + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {transport?.checkinNotes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <p className="text-sm">{transport.checkinNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-base">Check-out (Entrega ao Cliente)</CardTitle>
                    <div className="flex items-center gap-2">
                      {transport?.checkoutDateTime ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Realizado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {transport?.checkoutDateTime && (
                      <p className="text-sm text-muted-foreground">
                        Realizado em {format(new Date(transport.checkoutDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {isEditMode && !transport?.checkoutDateTime && transport?.checkinDateTime ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="checkoutLatitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Latitude</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Latitude" data-testid="input-checkout-latitude" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="checkoutLongitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Longitude</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Longitude" data-testid="input-checkout-longitude" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={getCheckoutLocation}
                          disabled={gettingCheckoutLocation}
                        >
                          {gettingCheckoutLocation ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="mr-2 h-4 w-4" />
                          )}
                          Obter Localização
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="checkoutSelfiePhoto"
                            render={({ field }) => (
                              <PhotoUpload
                                label="Selfie"
                                value={field.value || ""}
                                onChange={field.onChange}
                                testId="upload-checkout-selfie"
                              />
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="checkoutOdometerPhoto"
                            render={({ field }) => (
                              <PhotoUpload
                                label="Odômetro"
                                value={field.value || ""}
                                onChange={field.onChange}
                                testId="upload-checkout-odometer"
                              />
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="checkoutBodyPhotos"
                          render={({ field }) => (
                            <MultiPhotoUpload
                              label="Fotos da Lataria"
                              values={field.value || []}
                              onChange={field.onChange}
                              testId="upload-checkout-body"
                            />
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="checkoutDamagePhotos"
                          render={({ field }) => (
                            <MultiPhotoUpload
                              label="Fotos de Avarias"
                              values={field.value || []}
                              onChange={field.onChange}
                              testId="upload-checkout-damage"
                            />
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="checkoutNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="input-checkout-notes" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          onClick={() => checkoutMutation.mutate()}
                          disabled={checkoutMutation.isPending}
                          className="w-full"
                          data-testid="button-checkout"
                        >
                          {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Realizar Check-out
                        </Button>
                      </>
                    ) : !transport?.checkinDateTime ? (
                      <p className="text-sm text-muted-foreground">
                        Realize o check-in primeiro para habilitar o check-out.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Latitude</p>
                            <p className="text-sm font-mono">{transport?.checkoutLatitude || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Longitude</p>
                            <p className="text-sm font-mono">{transport?.checkoutLongitude || "-"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {transport?.checkoutSelfiePhoto && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Selfie</p>
                              <img src={transport.checkoutSelfiePhoto} alt="Selfie" className="h-20 w-20 rounded-md object-cover border" />
                            </div>
                          )}
                          {transport?.checkoutOdometerPhoto && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Odômetro</p>
                              <img src={transport.checkoutOdometerPhoto} alt="Odômetro" className="h-20 w-20 rounded-md object-cover border" />
                            </div>
                          )}
                        </div>
                        {transport?.checkoutBodyPhotos?.length ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fotos da Lataria</p>
                            <div className="flex flex-wrap gap-2">
                              {transport.checkoutBodyPhotos.map((photo, i) => (
                                <img key={i} src={photo} alt={`Lataria ${i + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {transport?.checkoutDamagePhotos?.length ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fotos de Avarias</p>
                            <div className="flex flex-wrap gap-2">
                              {transport.checkoutDamagePhotos.map((photo, i) => (
                                <img key={i} src={photo} alt={`Avaria ${i + 1}`} className="h-16 w-16 rounded-md object-cover border" />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {transport?.checkoutNotes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <p className="text-sm">{transport.checkoutNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/transportes")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-transport">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar Transporte"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
