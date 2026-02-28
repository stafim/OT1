import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Truck,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Calendar,
  Building2,
  Route,
  BadgeCheck,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Driver, Contract } from "@shared/schema";

const modalityLabels: Record<string, string> = {
  pj: "Pessoa Jurídica (PJ)",
  clt: "CLT",
  agregado: "Agregado",
};

const driverTypeLabels: Record<string, string> = {
  coleta: "Coleta",
  transporte: "Transporte",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return "—";
  return parseFloat(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const docStatusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  reprovado: { label: "Reprovado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

interface DriverDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null;
  onEdit: (driverId: string) => void;
}

export function DriverDetailDialog({ open, onOpenChange, driverId, onEdit }: DriverDetailDialogProps) {
  const { data: driver, isLoading } = useQuery<Driver>({
    queryKey: ["/api/drivers", driverId],
    enabled: !!driverId && open,
  });

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", driver?.freightContractId],
    enabled: !!driver?.freightContractId && open,
    retry: false,
  });

  const docStatus = docStatusConfig[driver?.documentsApproved || "pendente"] || docStatusConfig.pendente;
  const DocIcon = docStatus.icon;

  const fullAddress = (() => {
    if (!driver) return null;
    const parts: string[] = [];
    if (driver.address) {
      let part = driver.address;
      if (driver.addressNumber) part += `, ${driver.addressNumber}`;
      parts.push(part);
    }
    if (driver.complement) parts.push(driver.complement);
    if (driver.neighborhood) parts.push(driver.neighborhood);
    if (driver.city) {
      let cityPart = driver.city;
      if (driver.state) cityPart += ` - ${driver.state}`;
      parts.push(cityPart);
    }
    if (driver.cep) parts.push(`CEP: ${driver.cep}`);
    return parts.join(", ") || null;
  })();

  const contractStatusColors: Record<string, string> = {
    ativo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    suspenso: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    expirado: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha do Motorista</DialogTitle>
        </DialogHeader>

        {isLoading || !driver ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header: photo + name + badges */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {driver.profilePhoto ? (
                  <img
                    src={driver.profilePhoto}
                    alt={driver.name}
                    className="h-20 w-20 rounded-full object-cover border-2 border-muted"
                    data-testid="img-driver-profile"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-muted">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate" data-testid="text-driver-name">{driver.name}</h2>
                <p className="text-sm text-muted-foreground mb-2">CPF: {driver.cpf}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={driver.isActive === "true" ? "default" : "secondary"} data-testid="badge-driver-active">
                    {driver.isActive === "true" ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant={driver.isApto === "true" ? "default" : "outline"} data-testid="badge-driver-apto">
                    {driver.isApto === "true" ? "Apto" : "Inapto"}
                  </Badge>
                  {driver.modality && (
                    <Badge variant="secondary" data-testid="badge-driver-modality">
                      {modalityLabels[driver.modality] || driver.modality}
                    </Badge>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${docStatus.className}`} data-testid="badge-doc-status">
                    <DocIcon className="h-3 w-3" />
                    Docs: {docStatus.label}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onOpenChange(false); onEdit(driver.id); }}
                data-testid="button-edit-driver-detail"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>

            <Separator />

            {/* Personal info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações Pessoais</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoRow
                  label="Telefone"
                  value={
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {driver.phone}
                    </span>
                  }
                />
                <InfoRow
                  label="Email"
                  value={driver.email ? (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{driver.email}</span>
                    </span>
                  ) : "—"}
                />
                <InfoRow
                  label="Data de Nascimento"
                  value={
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(driver.birthDate)}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Address */}
            {fullAddress && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
                  </div>
                  <p className="text-sm" data-testid="text-driver-address">{fullAddress}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Professional info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Profissionais</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoRow label="Tipo de Motorista" value={driver.driverType ? driverTypeLabels[driver.driverType] || driver.driverType : "—"} />
                <InfoRow label="Modalidade" value={driver.modality ? modalityLabels[driver.modality] || driver.modality : "—"} />
                <InfoRow
                  label="Categoria CNH"
                  value={
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      {driver.cnhType || "—"}
                    </span>
                  }
                />
              </div>

              {/* CNH Photos */}
              {(driver.cnhFrontPhoto || driver.cnhBackPhoto) && (
                <div className="flex gap-3 mt-4">
                  {driver.cnhFrontPhoto && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CNH Frente</p>
                      <img
                        src={driver.cnhFrontPhoto}
                        alt="CNH Frente"
                        className="h-20 w-32 rounded-md object-cover border"
                        data-testid="img-cnh-front"
                      />
                    </div>
                  )}
                  {driver.cnhBackPhoto && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CNH Verso</p>
                      <img
                        src={driver.cnhBackPhoto}
                        alt="CNH Verso"
                        className="h-20 w-32 rounded-md object-cover border"
                        data-testid="img-cnh-back"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Linked contract (Gestor de Contratos) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contrato Vinculado</h3>
              </div>

              {!driver.freightContractId ? (
                <p className="text-sm text-muted-foreground italic">Nenhum contrato vinculado</p>
              ) : contractLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando contrato...
                </div>
              ) : contract ? (
                <Card className="border-primary/20" data-testid="card-linked-contract">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        {contract.contractNumber} — {contract.title}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contractStatusColors[contract.status] || ""}`}>
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Tipo
                        </p>
                        <p className="font-medium">{modalityLabels[contract.contractType] || contract.contractType}</p>
                      </div>
                      {contract.paymentType && (
                        <div>
                          <p className="text-xs text-muted-foreground">Pagamento</p>
                          <p className="font-medium">
                            {{
                              por_km: "Por km",
                              fixo_mensal: "Fixo mensal",
                              por_entrega: "Por entrega",
                              comissao: "Comissão",
                            }[contract.paymentType] || contract.paymentType}
                            {contract.paymentValue ? ` — ${formatCurrency(contract.paymentValue)}` : ""}
                          </p>
                        </div>
                      )}
                      {contract.workRegion && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Route className="h-3 w-3" /> Região de Atuação
                          </p>
                          <p className="font-medium">{contract.workRegion}</p>
                        </div>
                      )}
                      {contract.startDate && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Vigência
                          </p>
                          <p className="font-medium">
                            {formatDate(contract.startDate)}
                            {contract.endDate ? ` até ${formatDate(contract.endDate)}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground italic">Contrato não encontrado</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
