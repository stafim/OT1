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
import { Loader2 } from "lucide-react";
import type { Yard } from "@shared/schema";
import { fetchAddressFromCep } from "@/lib/cep";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
] as const;

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cep: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  maxVehicles: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.string().default("true"),
});

type FormData = z.infer<typeof formSchema>;

interface YardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yardId?: string | null;
}

export function YardFormDialog({ open, onOpenChange, yardId }: YardFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!yardId;
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const { data: yard, isLoading } = useQuery<Yard>({
    queryKey: ["/api/yards", yardId],
    enabled: isEditing && open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      cep: "",
      address: "",
      addressNumber: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      phone: "",
      maxVehicles: null,
      isActive: "true",
    },
  });

  useEffect(() => {
    if (yard && isEditing) {
      form.reset({
        name: yard.name || "",
        cep: yard.cep || "",
        address: yard.address || "",
        addressNumber: yard.addressNumber || "",
        complement: yard.complement || "",
        neighborhood: yard.neighborhood || "",
        city: yard.city || "",
        state: yard.state || "",
        phone: yard.phone || "",
        maxVehicles: yard.maxVehicles ?? null,
        isActive: yard.isActive || "true",
      });
    } else if (!isEditing && open) {
      form.reset({
        name: "",
        cep: "",
        address: "",
        addressNumber: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        phone: "",
        maxVehicles: null,
        isActive: "true",
      });
    }
  }, [yard, form, isEditing, open]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/yards/${yardId}`, data);
      }
      return apiRequest("POST", "/api/yards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yards"] });
      toast({ title: isEditing ? "Pátio atualizado com sucesso" : "Pátio cadastrado com sucesso" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar pátio", variant: "destructive" });
    },
  });

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
        form.setValue("state", addressData.state);
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
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditing ? "Editar Pátio" : "Novo Pátio"}</DialogTitle>
        </DialogHeader>
        
        {isEditing && isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-8rem)] px-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados do Pátio</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Matriz, Pátio SP" data-testid="input-yard-name" />
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
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="(00) 00000-0000"
                              onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              maxLength={15}
                              data-testid="input-yard-phone" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxVehicles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de Veículos</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                              placeholder="Ex: 100"
                              data-testid="input-yard-max-vehicles" 
                            />
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
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field}
                                placeholder="00000-000"
                                data-testid="input-yard-cep"
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
                        <FormItem>
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-yard-address" />
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
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-yard-number" />
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
                            <Input {...field} data-testid="input-yard-complement" />
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
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-yard-neighborhood" />
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
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-yard-city" />
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
                          <FormLabel>UF</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-yard-state">
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
                              data-testid="switch-yard-active"
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
                  <Button type="submit" disabled={mutation.isPending} data-testid="button-save-yard">
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
