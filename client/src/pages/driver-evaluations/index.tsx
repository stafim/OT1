import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import {
  Truck,
  User,
  MapPin,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Scale,
  Award,
} from "lucide-react";
import type { Transport, Driver, Vehicle, Client, DeliveryLocation, DriverEvaluation, EvaluationCriteria, EvaluationScore } from "@shared/schema";

interface TransportWithDetails extends Transport {
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  client?: Client | null;
  deliveryLocation?: DeliveryLocation | null;
}

interface ScoreWithCriteria extends EvaluationScore {
  criteria?: EvaluationCriteria;
}

interface EvaluationWithDetails extends DriverEvaluation {
  driver?: Driver;
  transport?: Transport;
  scores?: ScoreWithCriteria[];
}

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function ScoreDisplay({ score, label }: { score: number; label?: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-yellow-600";
    if (s >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (s >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    if (s >= 40) return "bg-orange-100 dark:bg-orange-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`px-2 py-0.5 rounded ${getBgColor(score)}`}>
        <span className={`text-sm font-bold ${getColor(score)}`}>{score.toFixed(1)}</span>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

function CriteriaScoreInput({
  criteria,
  score,
  onChange,
}: {
  criteria: EvaluationCriteria;
  score: number;
  onChange: (score: number) => void;
}) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-yellow-600";
    if (s >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-2 p-3 rounded-lg border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{criteria.name}</p>
          <p className="text-xs text-muted-foreground">Peso: {parseFloat(criteria.weight).toFixed(0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 100) onChange(val);
              else if (e.target.value === "") onChange(0);
            }}
            className="w-20 text-center font-bold"
            data-testid={`input-score-${criteria.id}`}
          />
          <span className={`text-sm font-bold w-6 ${getColor(score)}`}>pts</span>
        </div>
      </div>
      <Slider
        value={[score]}
        min={0}
        max={100}
        step={1}
        onValueChange={([val]) => onChange(val)}
        data-testid={`slider-score-${criteria.id}`}
      />
    </div>
  );
}

export default function DriverEvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportWithDetails | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationWithDetails | null>(null);
  const [hadIncident, setHadIncident] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [manualScore, setManualScore] = useState("80");
  const { toast } = useToast();

  const { data: pendingTransports, isLoading: loadingPending } = useQuery<TransportWithDetails[]>({
    queryKey: ["/api/driver-evaluations/pending-transports"],
  });

  const { data: evaluations, isLoading: loadingEvaluations } = useQuery<EvaluationWithDetails[]>({
    queryKey: ["/api/driver-evaluations"],
  });

  const { data: criteria } = useQuery<EvaluationCriteria[]>({
    queryKey: ["/api/evaluation-criteria"],
  });

  const activeCriteria = criteria?.filter(c => c.isActive === "true") || [];

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
    setCriteriaScores({});
    setHadIncident(false);
    setIncidentDescription("");
    setManualScore("80");
    setSelectedTransport(null);
  };

  const handleOpenEvaluation = (transport: TransportWithDetails) => {
    setSelectedTransport(transport);
    const defaultScores: Record<string, number> = {};
    activeCriteria.forEach(c => {
      defaultScores[c.id] = 80;
    });
    setCriteriaScores(defaultScores);
    setHadIncident(false);
    setIncidentDescription("");
    setManualScore("80");
    setShowEvaluationDialog(true);
  };

  const calculateWeightedScore = () => {
    if (activeCriteria.length === 0) return 0;
    let weightedSum = 0;
    for (const c of activeCriteria) {
      const score = criteriaScores[c.id] || 0;
      const weight = parseFloat(c.weight);
      weightedSum += score * (weight / 100);
    }
    return weightedSum;
  };

  const calculateSimpleAverage = () => {
    if (activeCriteria.length === 0) return 0;
    const total = activeCriteria.reduce((sum, c) => sum + (criteriaScores[c.id] || 0), 0);
    return total / activeCriteria.length;
  };

  const handleSubmitEvaluation = () => {
    if (!selectedTransport?.driverId) return;

    if (activeCriteria.length === 0) {
      toast({
        title: "Sem criterios",
        description: "Configure os criterios de avaliacao antes de avaliar.",
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

    const scoresToSubmit = activeCriteria.map(c => ({
      criteriaId: c.id,
      score: criteriaScores[c.id] || 0,
    }));

    const finalWeightedScore = hadIncident ? parseFloat(manualScore) : calculateWeightedScore();

    submitEvaluationMutation.mutate({
      transportId: selectedTransport.id,
      driverId: selectedTransport.driverId,
      evaluatorId: "system",
      evaluatorName: "Sistema",
      hadIncident: hadIncident ? "true" : "false",
      incidentDescription: hadIncident ? incidentDescription : null,
      averageScore: calculateSimpleAverage().toFixed(2),
      weightedScore: finalWeightedScore.toFixed(2),
      criteriaScores: scoresToSubmit,
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
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
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
              <div className="border rounded-md divide-y">
                {filteredPending.map((transport) => (
                  <div
                    key={transport.id}
                    className="flex items-center justify-between p-3 hover-elevate"
                    data-testid={`row-transport-${transport.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{transport.requestNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{transport.driver?.name || "Sem motorista"}</span>
                      </div>
                      <div className="flex items-center gap-2 hidden md:flex">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">{transport.deliveryLocation?.city || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 hidden lg:flex">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{formatDate(transport.checkoutDateTime)}</span>
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex">Entregue</Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEvaluation(transport)}
                      data-testid={`button-evaluate-${transport.id}`}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Avaliar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loadingEvaluations ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhuma avaliacao registrada ainda
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-md divide-y">
                {filteredEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="p-3 hover-elevate cursor-pointer"
                    data-testid={`row-evaluation-${evaluation.id}`}
                    onClick={() => {
                      setSelectedEvaluation(evaluation);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm">{evaluation.transport?.requestNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{evaluation.driver?.name}</span>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{formatDate(evaluation.createdAt)}</span>
                        </div>
                        {evaluation.hadIncident === "true" && (
                          <Badge variant="destructive" className="hidden sm:inline-flex text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Imprevisto
                          </Badge>
                        )}
                      </div>
                      <ScoreDisplay score={parseFloat(evaluation.weightedScore || evaluation.averageScore || "0")} label="pts" />
                    </div>
                  </div>
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
              <Award className="h-5 w-5 text-primary" />
              Avaliar Motorista
            </DialogTitle>
          </DialogHeader>

          {selectedTransport && (
            <div className="space-y-4">
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
                    <p className="text-xs text-muted-foreground">Marque se houve algum problema</p>
                  </div>
                </div>
                <Switch
                  checked={hadIncident}
                  onCheckedChange={setHadIncident}
                  data-testid="switch-incident"
                />
              </div>

              {hadIncident && (
                <div className="space-y-2">
                  <Label>Descreva o que aconteceu:</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente o imprevisto..."
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    rows={3}
                    data-testid="textarea-incident"
                  />
                </div>
              )}

              {activeCriteria.length === 0 ? (
                <Card className="border-destructive">
                  <CardContent className="p-4 text-center">
                    <Scale className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Nenhum criterio configurado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure os criterios de avaliacao na pagina de Avaliacao antes de avaliar motoristas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Criterios (0 a 100 pontos)</Label>
                  {activeCriteria.map((c) => (
                    <CriteriaScoreInput
                      key={c.id}
                      criteria={c}
                      score={criteriaScores[c.id] || 0}
                      onChange={(score) => setCriteriaScores(prev => ({ ...prev, [c.id]: score }))}
                    />
                  ))}
                </div>
              )}

              {activeCriteria.length > 0 && (
                hadIncident ? (
                  <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Nota Final (editavel):</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={manualScore}
                            onChange={(e) => setManualScore(e.target.value)}
                            className="w-20 text-center font-bold"
                            data-testid="input-manual-score"
                          />
                          <span className="text-muted-foreground text-sm">pts</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Como houve imprevisto, voce pode ajustar a nota final ponderada manualmente.
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Nota calculada seria:</span>
                        <span className="font-medium">{calculateWeightedScore().toFixed(1)} pts</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Nota Final Ponderada</p>
                          <p className="text-xs text-muted-foreground">Media simples: {calculateSimpleAverage().toFixed(1)}</p>
                        </div>
                        <ScoreDisplay score={calculateWeightedScore()} label="pts" />
                      </div>
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
              disabled={submitEvaluationMutation.isPending || activeCriteria.length === 0}
              data-testid="button-submit-evaluation"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Detalhes da Avaliacao
            </DialogTitle>
          </DialogHeader>

          {selectedEvaluation && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedEvaluation.driver?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEvaluation.driver?.cpf}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedEvaluation.driver?.modality}</Badge>
                    <ScoreDisplay score={parseFloat(selectedEvaluation.weightedScore || selectedEvaluation.averageScore || "0")} label="pts" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Transporte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requisicao:</span>
                      <span className="font-medium">{selectedEvaluation.transport?.requestNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Veiculo:</span>
                      <span>{selectedEvaluation.transport?.vehicleChassi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="secondary">{selectedEvaluation.transport?.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nota Ponderada:</span>
                      <span className="font-bold">{parseFloat(selectedEvaluation.weightedScore || "0").toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Media Simples:</span>
                      <span>{parseFloat(selectedEvaluation.averageScore || "0").toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span>{formatDate(selectedEvaluation.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedEvaluation.scores && selectedEvaluation.scores.length > 0 && (
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Notas por Criterio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {selectedEvaluation.scores.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{s.criteria?.name || "Criterio"}</span>
                          {s.criteria?.weight && (
                            <span className="text-xs text-muted-foreground ml-2">(peso: {parseFloat(s.criteria.weight).toFixed(0)})</span>
                          )}
                        </div>
                        <ScoreDisplay score={parseFloat(s.score)} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {selectedEvaluation.hadIncident === "true" && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Houve imprevisto
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvaluation.incidentDescription}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
