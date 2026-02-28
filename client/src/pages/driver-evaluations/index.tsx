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
  Shield,
  ShieldAlert,
  ShieldCheck,
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

type SeverityLevel = "sem_ocorrencia" | "leve" | "medio" | "grave";

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const severityLabels: Record<SeverityLevel, string> = {
  sem_ocorrencia: "Sem Ocorrência",
  leve: "Leve",
  medio: "Médio",
  grave: "Grave",
};

const severityColors: Record<SeverityLevel, string> = {
  sem_ocorrencia: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  leve: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  medio: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  grave: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
};

const severityIcons: Record<SeverityLevel, typeof ShieldCheck> = {
  sem_ocorrencia: ShieldCheck,
  leve: Shield,
  medio: ShieldAlert,
  grave: ShieldAlert,
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

function SeveritySelector({
  criteria,
  severity,
  onChange,
}: {
  criteria: EvaluationCriteria;
  severity: SeverityLevel;
  onChange: (severity: SeverityLevel) => void;
}) {
  const getPenalty = (sev: SeverityLevel) => {
    if (sev === "sem_ocorrencia") return 0;
    if (sev === "leve") return parseFloat(criteria.penaltyLeve || "10");
    if (sev === "medio") return parseFloat(criteria.penaltyMedio || "50");
    if (sev === "grave") return parseFloat(criteria.penaltyGrave || "100");
    return 0;
  };

  const currentPenalty = getPenalty(severity);
  const currentScore = 100 - currentPenalty;

  return (
    <div className="space-y-2 p-3 rounded-lg border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{criteria.name}</p>
          <p className="text-xs text-muted-foreground">Peso: {parseFloat(criteria.weight).toFixed(0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${currentScore >= 80 ? "text-green-600" : currentScore >= 50 ? "text-orange-600" : "text-red-600"}`}>
            {currentScore.toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(["sem_ocorrencia", "leve", "medio", "grave"] as SeverityLevel[]).map((sev) => {
          const Icon = severityIcons[sev];
          const isSelected = severity === sev;
          const penalty = getPenalty(sev);
          return (
            <button
              key={sev}
              type="button"
              onClick={() => onChange(sev)}
              className={`flex flex-col items-center gap-1 p-2 rounded-md border-2 transition-all text-xs ${
                isSelected
                  ? `${severityColors[sev]} border-current font-semibold ring-2 ring-offset-1 ring-current/30`
                  : "bg-muted/30 border-transparent hover:border-muted-foreground/20 text-muted-foreground"
              }`}
              data-testid={`button-severity-${sev}-${criteria.id}`}
            >
              <Icon className="h-4 w-4" />
              <span>{severityLabels[sev]}</span>
              {sev !== "sem_ocorrencia" && (
                <span className="text-[10px] opacity-70">-{penalty}%</span>
              )}
            </button>
          );
        })}
      </div>
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
  const [criteriaSeverities, setCriteriaSeverities] = useState<Record<string, SeverityLevel>>({});
  const [manualScore, setManualScore] = useState("100");
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
        title: "Avaliação enviada",
        description: "A avaliação do motorista foi registrada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a avaliação.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCriteriaSeverities({});
    setHadIncident(false);
    setIncidentDescription("");
    setManualScore("100");
    setSelectedTransport(null);
  };

  const handleOpenEvaluation = (transport: TransportWithDetails) => {
    setSelectedTransport(transport);
    const defaultSeverities: Record<string, SeverityLevel> = {};
    activeCriteria.forEach(c => {
      defaultSeverities[c.id] = "sem_ocorrencia";
    });
    setCriteriaSeverities(defaultSeverities);
    setHadIncident(false);
    setIncidentDescription("");
    setManualScore("100");
    setShowEvaluationDialog(true);
  };

  const getScoreForCriteria = (criteriaItem: EvaluationCriteria, severity: SeverityLevel) => {
    let penalty = 0;
    if (severity === "leve") penalty = parseFloat(criteriaItem.penaltyLeve || "10");
    else if (severity === "medio") penalty = parseFloat(criteriaItem.penaltyMedio || "50");
    else if (severity === "grave") penalty = parseFloat(criteriaItem.penaltyGrave || "100");
    return 100 - penalty;
  };

  const calculateWeightedScore = () => {
    if (activeCriteria.length === 0) return 0;
    let weightedSum = 0;
    for (const c of activeCriteria) {
      const severity = criteriaSeverities[c.id] || "sem_ocorrencia";
      const score = getScoreForCriteria(c, severity);
      const weight = parseFloat(c.weight);
      weightedSum += score * (weight / 100);
    }
    return weightedSum;
  };

  const calculateSimpleAverage = () => {
    if (activeCriteria.length === 0) return 0;
    const total = activeCriteria.reduce((sum, c) => {
      const severity = criteriaSeverities[c.id] || "sem_ocorrencia";
      return sum + getScoreForCriteria(c, severity);
    }, 0);
    return total / activeCriteria.length;
  };

  const handleSubmitEvaluation = () => {
    if (!selectedTransport?.driverId) return;

    if (activeCriteria.length === 0) {
      toast({
        title: "Sem critérios",
        description: "Configure os critérios de avaliação antes de avaliar.",
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
      severity: criteriaSeverities[c.id] || "sem_ocorrencia",
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
      <PageHeader title="Avaliação de Motoristas" />

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
                    Nenhuma avaliação registrada ainda
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
                    <p className="text-sm font-medium">Nenhum critério configurado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure os critérios de avaliação na página de Avaliação antes de avaliar motoristas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Avalie cada critério por severidade</Label>
                  {activeCriteria.map((c) => (
                    <SeveritySelector
                      key={c.id}
                      criteria={c}
                      severity={criteriaSeverities[c.id] || "sem_ocorrencia"}
                      onChange={(sev) => setCriteriaSeverities(prev => ({ ...prev, [c.id]: sev }))}
                    />
                  ))}
                </div>
              )}

              {activeCriteria.length > 0 && (
                hadIncident ? (
                  <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Nota Final (editável):</span>
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
                        Como houve imprevisto, você pode ajustar a nota final ponderada manualmente.
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
                          <p className="text-xs text-muted-foreground">Média simples: {calculateSimpleAverage().toFixed(1)}</p>
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
              Enviar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Detalhes da Avaliação
            </DialogTitle>
          </DialogHeader>

          {selectedEvaluation && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedEvaluation.driver?.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedEvaluation.transport?.requestNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="text-sm">{formatDate(selectedEvaluation.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedEvaluation.hadIncident === "true" && (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-sm text-yellow-700 dark:text-yellow-400">Imprevisto Registrado</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedEvaluation.incidentDescription}</p>
                  </CardContent>
                </Card>
              )}

              {selectedEvaluation.scores && selectedEvaluation.scores.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Critérios Avaliados</Label>
                  {selectedEvaluation.scores.map((score) => {
                    const severityValue = (score.severity || "sem_ocorrencia") as SeverityLevel;
                    const scoreNum = parseFloat(score.score);
                    return (
                      <div key={score.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{score.criteria?.name || "Critério"}</p>
                          <Badge className={`mt-1 text-xs ${severityColors[severityValue]}`} variant="outline">
                            {severityLabels[severityValue]}
                          </Badge>
                        </div>
                        <ScoreDisplay score={scoreNum} label="pts" />
                      </div>
                    );
                  })}
                </div>
              )}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Nota Final Ponderada</p>
                      <p className="text-xs text-muted-foreground">
                        Média simples: {parseFloat(selectedEvaluation.averageScore || "0").toFixed(1)}
                      </p>
                    </div>
                    <ScoreDisplay
                      score={parseFloat(selectedEvaluation.weightedScore || selectedEvaluation.averageScore || "0")}
                      label="pts"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
