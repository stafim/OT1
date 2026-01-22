import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import {
  Star,
  Truck,
  User,
  MapPin,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Send,
} from "lucide-react";
import type { Transport, Driver, Vehicle, Client, DeliveryLocation, DriverEvaluation } from "@shared/schema";

interface TransportWithDetails extends Transport {
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  client?: Client | null;
  deliveryLocation?: DeliveryLocation | null;
}

interface EvaluationWithDetails extends DriverEvaluation {
  driver?: Driver;
  transport?: Transport;
}

type RatingValue = "pessimo" | "ruim" | "regular" | "bom" | "excelente";

const ratingOptions: { value: RatingValue; label: string; description: string; color: string }[] = [
  { value: "pessimo", label: "Pessimo", description: "Comprometeu a imagem da empresa ou a seguranca", color: "text-red-600" },
  { value: "ruim", label: "Ruim", description: "Abaixo do padrao, exige reorientacao", color: "text-orange-600" },
  { value: "regular", label: "Regular", description: "Cumpriu a obrigacao, mas sem capricho", color: "text-yellow-600" },
  { value: "bom", label: "Bom", description: "Atendeu a todas as expectativas", color: "text-green-600" },
  { value: "excelente", label: "Excelente", description: "Superou as expectativas", color: "text-emerald-600" },
];

const ratingToNumber = (rating: RatingValue): number => {
  const map: Record<RatingValue, number> = {
    pessimo: 1,
    ruim: 2,
    regular: 3,
    bom: 4,
    excelente: 5,
  };
  return map[rating];
};

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RatingValue | "";
  onChange: (value: RatingValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as RatingValue)} className="flex flex-wrap gap-2">
        {ratingOptions.map((option) => (
          <div key={option.value} className="flex items-center">
            <RadioGroupItem value={option.value} id={`${label}-${option.value}`} className="sr-only" />
            <Label
              htmlFor={`${label}-${option.value}`}
              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs border transition-all ${
                value === option.value
                  ? `bg-primary text-primary-foreground border-primary`
                  : "bg-card border-border hover-elevate"
              }`}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= fullStars
              ? "text-yellow-500 fill-yellow-500"
              : i === fullStars + 1 && hasHalf
              ? "text-yellow-500 fill-yellow-500/50"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{score.toFixed(1)}</span>
    </div>
  );
}

export default function DriverEvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportWithDetails | null>(null);
  const [hadIncident, setHadIncident] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [manualScore, setManualScore] = useState<string>("4.0");
  const [ratings, setRatings] = useState<{
    posturaProfissional: RatingValue | "";
    pontualidade: RatingValue | "";
    apresentacaoPessoal: RatingValue | "";
    cordialidade: RatingValue | "";
    cumpriuProcesso: RatingValue | "";
  }>({
    posturaProfissional: "",
    pontualidade: "",
    apresentacaoPessoal: "",
    cordialidade: "",
    cumpriuProcesso: "",
  });
  const { toast } = useToast();

  const { data: pendingTransports, isLoading: loadingPending } = useQuery<TransportWithDetails[]>({
    queryKey: ["/api/driver-evaluations/pending-transports"],
  });

  const { data: evaluations, isLoading: loadingEvaluations } = useQuery<EvaluationWithDetails[]>({
    queryKey: ["/api/driver-evaluations"],
  });

  const submitEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/driver-evaluations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver-evaluations/pending-transports"] });
      setShowEvaluationDialog(false);
      resetForm();
      toast({
        title: "Avaliacao enviada",
        description: "A avaliacao do motorista foi registrada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel enviar a avaliacao.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRatings({
      posturaProfissional: "",
      pontualidade: "",
      apresentacaoPessoal: "",
      cordialidade: "",
      cumpriuProcesso: "",
    });
    setHadIncident(false);
    setIncidentDescription("");
    setManualScore("4.0");
    setSelectedTransport(null);
  };

  const handleOpenEvaluation = (transport: TransportWithDetails) => {
    setSelectedTransport(transport);
    if (!hadIncident) {
      setRatings({
        posturaProfissional: "bom",
        pontualidade: "bom",
        apresentacaoPessoal: "bom",
        cordialidade: "bom",
        cumpriuProcesso: "bom",
      });
    }
    setShowEvaluationDialog(true);
  };

  const handleSubmitEvaluation = () => {
    if (!selectedTransport?.driverId) return;
    
    const allRated = Object.values(ratings).every((r) => r !== "");
    if (!allRated) {
      toast({
        title: "Campos obrigatorios",
        description: "Por favor, avalie todos os criterios.",
        variant: "destructive",
      });
      return;
    }

    if (hadIncident && !incidentDescription.trim()) {
      toast({
        title: "Descreva o imprevisto",
        description: "Por favor, descreva o que aconteceu durante a viagem.",
        variant: "destructive",
      });
      return;
    }

    if (hadIncident) {
      const score = parseFloat(manualScore);
      if (isNaN(score) || score < 1 || score > 5) {
        toast({
          title: "Nota invalida",
          description: "Por favor, insira uma nota entre 1.0 e 5.0.",
          variant: "destructive",
        });
        return;
      }
    }

    const finalScore = hadIncident 
      ? parseFloat(manualScore) 
      : calculateAverageFromRatings();

    submitEvaluationMutation.mutate({
      transportId: selectedTransport.id,
      driverId: selectedTransport.driverId,
      evaluatorId: "system",
      evaluatorName: "Sistema",
      posturaProfissional: ratings.posturaProfissional,
      pontualidade: ratings.pontualidade,
      apresentacaoPessoal: ratings.apresentacaoPessoal,
      cordialidade: ratings.cordialidade,
      cumpriuProcesso: ratings.cumpriuProcesso,
      averageScore: finalScore.toFixed(1),
      hadIncident: hadIncident ? "true" : "false",
      incidentDescription: hadIncident ? incidentDescription : null,
    });
  };

  const filteredPending = pendingTransports?.filter((t) =>
    t.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredEvaluations = evaluations?.filter((e) =>
    e.transport?.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const calculateAverageFromRatings = () => {
    const values = Object.values(ratings).filter((r) => r !== "") as RatingValue[];
    if (values.length === 0) return 0;
    return values.reduce((acc, r) => acc + ratingToNumber(r), 0) / values.length;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Avaliacao de Motoristas" />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OTD ou motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-evaluations"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending" data-testid="tab-pending">
              <Clock className="h-4 w-4 mr-2" />
              Pendentes ({filteredPending.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Avaliados ({filteredEvaluations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loadingPending ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPending.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Todos os transportes finalizados foram avaliados!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPending.map((transport) => (
                  <Card key={transport.id} className="hover-elevate" data-testid={`card-transport-${transport.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{transport.requestNumber}</p>
                          <Badge variant="outline" className="mt-1">Entregue</Badge>
                        </div>
                        <Truck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{transport.driver?.name || "Sem motorista"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{transport.deliveryLocation?.city || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(transport.checkoutDateTime)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full mt-4"
                        onClick={() => handleOpenEvaluation(transport)}
                        data-testid={`button-evaluate-${transport.id}`}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Avaliar Motorista
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loadingEvaluations ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhuma avaliacao registrada ainda
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="hover-elevate" data-testid={`card-evaluation-${evaluation.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{evaluation.transport?.requestNumber}</p>
                          <p className="text-sm text-muted-foreground">{evaluation.driver?.name}</p>
                        </div>
                        <StarRating score={parseFloat(evaluation.averageScore || "0")} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span>Postura</span>
                          <Badge variant="outline" className="text-xs">{evaluation.posturaProfissional}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span>Pontualidade</span>
                          <Badge variant="outline" className="text-xs">{evaluation.pontualidade}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span>Apresentacao</span>
                          <Badge variant="outline" className="text-xs">{evaluation.apresentacaoPessoal}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span>Cordialidade</span>
                          <Badge variant="outline" className="text-xs">{evaluation.cordialidade}</Badge>
                        </div>
                      </div>

                      {evaluation.hadIncident === "true" && (
                        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Houve imprevisto
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{evaluation.incidentDescription}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        Avaliado em {formatDate(evaluation.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Avaliar Motorista
            </DialogTitle>
          </DialogHeader>

          {selectedTransport && (
            <div className="space-y-6">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedTransport.driver?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTransport.requestNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm">Aconteceu algum imprevisto?</p>
                    <p className="text-xs text-muted-foreground">Marque se houve algum problema na viagem</p>
                  </div>
                </div>
                <Switch
                  checked={hadIncident}
                  onCheckedChange={(checked) => {
                    setHadIncident(checked);
                    if (!checked) {
                      setRatings({
                        posturaProfissional: "bom",
                        pontualidade: "bom",
                        apresentacaoPessoal: "bom",
                        cordialidade: "bom",
                        cumpriuProcesso: "bom",
                      });
                    } else {
                      setRatings({
                        posturaProfissional: "",
                        pontualidade: "",
                        apresentacaoPessoal: "",
                        cordialidade: "",
                        cumpriuProcesso: "",
                      });
                    }
                  }}
                  data-testid="switch-incident"
                />
              </div>

              {hadIncident && (
                <div className="space-y-2">
                  <Label>Descreva o que aconteceu:</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente o imprevisto ocorrido durante a viagem..."
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    rows={3}
                    data-testid="textarea-incident"
                  />
                </div>
              )}

              <div className="space-y-4">
                <RatingSelector
                  label="Postura Profissional"
                  value={ratings.posturaProfissional}
                  onChange={(v) => setRatings({ ...ratings, posturaProfissional: v })}
                />
                <RatingSelector
                  label="Pontualidade"
                  value={ratings.pontualidade}
                  onChange={(v) => setRatings({ ...ratings, pontualidade: v })}
                />
                <RatingSelector
                  label="Apresentacao Pessoal"
                  value={ratings.apresentacaoPessoal}
                  onChange={(v) => setRatings({ ...ratings, apresentacaoPessoal: v })}
                />
                <RatingSelector
                  label="Cordialidade"
                  value={ratings.cordialidade}
                  onChange={(v) => setRatings({ ...ratings, cordialidade: v })}
                />
                <RatingSelector
                  label="Cumpriu o Processo"
                  value={ratings.cumpriuProcesso}
                  onChange={(v) => setRatings({ ...ratings, cumpriuProcesso: v })}
                />
              </div>

              {hadIncident ? (
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Nota Final (editavel):</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={manualScore}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= 1 && val <= 5) {
                              setManualScore(e.target.value);
                            } else if (e.target.value === "") {
                              setManualScore("");
                            }
                          }}
                          className="w-20 text-center font-bold"
                          data-testid="input-manual-score"
                        />
                        <span className="text-muted-foreground text-sm">(1.0 a 5.0)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Como houve um imprevisto, voce pode definir a nota final manualmente.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                Object.values(ratings).every((r) => r !== "") && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium">Media da Avaliacao:</span>
                      <StarRating score={calculateAverageFromRatings()} />
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEvaluationDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitEvaluation}
              disabled={submitEvaluationMutation.isPending}
              data-testid="button-submit-evaluation"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
