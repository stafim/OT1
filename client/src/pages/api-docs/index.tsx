import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Server, Key, FileText, Download, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

interface EndpointDoc {
  method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  headers: { name: string; value: string; description: string }[];
  body: {
    field: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  example: object;
  response: object;
}

const endpoints: { category: string; items: EndpointDoc[] }[] = [
  {
    category: "Motoristas",
    items: [
      {
        method: "POST",
        path: "/api/drivers",
        description: "Cria um novo motorista no sistema. Envie como multipart/form-data para incluir os arquivos de foto da CNH (frente e verso).",
        headers: [
          { name: "Content-Type", value: "multipart/form-data", description: "Tipo do conteúdo (formulário com arquivos)" },
          { name: "Authorization", value: "Bearer <access_token>", description: "Token de acesso" },
        ],
        body: [
          { field: "name", type: "string", required: true, description: "Nome completo do motorista" },
          { field: "cpf", type: "string", required: true, description: "CPF do motorista (somente números)" },
          { field: "phone", type: "string", required: true, description: "Telefone com DDD" },
          { field: "birthDate", type: "string", required: true, description: "Data de nascimento (YYYY-MM-DD)" },
          { field: "cnhType", type: "string", required: true, description: "Categoria da CNH (A, B, C, D, E)" },
          { field: "cnhFrontFile", type: "file", required: false, description: "Arquivo de imagem da frente da CNH (JPG, PNG)" },
          { field: "cnhBackFile", type: "file", required: false, description: "Arquivo de imagem do verso da CNH (JPG, PNG)" },
          { field: "cep", type: "string", required: false, description: "CEP do endereço" },
          { field: "address", type: "string", required: false, description: "Rua/Logradouro" },
          { field: "addressNumber", type: "string", required: false, description: "Número" },
          { field: "complement", type: "string", required: false, description: "Complemento" },
          { field: "neighborhood", type: "string", required: false, description: "Bairro" },
          { field: "city", type: "string", required: false, description: "Cidade" },
          { field: "state", type: "string", required: false, description: "Estado (UF)" },
          { field: "modality", type: "string", required: false, description: "Modalidade: pj, clt ou agregado" },
          { field: "driverType", type: "string", required: false, description: "Tipo de motorista: coleta ou transporte" },
        ],
        example: {
          "Content-Type": "multipart/form-data",
          "campos_texto": {
            name: "João Silva",
            cpf: "12345678900",
            phone: "11999998888",
            birthDate: "1985-03-15",
            cnhType: "D",
            modality: "pj",
            driverType: "transporte",
          },
          "campos_arquivo": {
            cnhFrontFile: "<arquivo_imagem_frente.jpg>",
            cnhBackFile: "<arquivo_imagem_verso.jpg>",
          }
        },
        response: {
          id: "uuid-do-motorista",
          name: "João Silva",
          cpf: "12345678900",
          modality: "pj",
          driverType: "transporte",
          cnhFrontPhoto: "/uploads/abc123.jpg",
          cnhBackPhoto: "/uploads/def456.jpg",
        }
      }
    ]
  },
  {
    category: "Coletas",
    items: [
      {
        method: "POST",
        path: "/api/collects",
        description: "Cria uma nova coleta de veículos",
        headers: [
          { name: "Content-Type", value: "application/json", description: "Tipo do conteúdo" },
        ],
        body: [
          { field: "driverId", type: "number", required: true, description: "ID do motorista responsável" },
          { field: "manufacturerId", type: "number", required: true, description: "ID da montadora de origem" },
          { field: "yardId", type: "number", required: true, description: "ID do pátio de destino" },
          { field: "scheduledDate", type: "string", required: true, description: "Data agendada (YYYY-MM-DD)" },
          { field: "vehicleChassis", type: "string[]", required: true, description: "Lista de chassis dos veículos" },
          { field: "notes", type: "string", required: false, description: "Observações" },
        ],
        example: {
          driverId: 1,
          manufacturerId: 2,
          yardId: 3,
          scheduledDate: "2026-01-15",
          vehicleChassis: ["9BWZZZ377VT004251", "9BWZZZ377VT004252"],
          notes: "Coleta urgente"
        },
        response: {
          id: 1,
          status: "pendente",
          driverId: 1,
          manufacturerId: 2,
          yardId: 3,
          scheduledDate: "2026-01-15"
        }
      }
    ]
  },
  {
    category: "Autenticação Externa",
    items: [
      {
        method: "POST",
        path: "/api/external/auth/token",
        description: "Gera um par de tokens (access + refresh) para autenticação externa. O access_token deve ser enviado no header Authorization de todas as requisições protegidas.",
        headers: [
          { name: "Content-Type", value: "application/json", description: "Tipo do conteúdo" },
        ],
        body: [
          { field: "username", type: "string", required: true, description: "Nome de usuário cadastrado no sistema" },
          { field: "password", type: "string", required: true, description: "Senha do usuário" },
        ],
        example: {
          username: "admin",
          password: "admin123"
        },
        response: {
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          token_type: "Bearer",
          expires_in: 900,
          user: {
            id: "uuid-do-usuario",
            username: "admin",
            email: "admin@otdentregas.com",
            role: "admin",
            firstName: "Administrador",
            lastName: "Sistema",
            driverType: "transporte"
          }
        }
      },
      {
        method: "POST",
        path: "/api/external/auth/refresh",
        description: "Renova o access_token usando um refresh_token válido. Use quando o access_token expirar (após 15 minutos).",
        headers: [
          { name: "Content-Type", value: "application/json", description: "Tipo do conteúdo" },
        ],
        body: [
          { field: "refresh_token", type: "string", required: true, description: "Refresh token obtido no login" },
        ],
        example: {
          refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        },
        response: {
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          token_type: "Bearer",
          expires_in: 900
        }
      },
      {
        method: "GET",
        path: "/api/external/auth/validate",
        description: "Valida se um access_token ainda é válido e retorna os dados do usuário autenticado. Envie o token no header Authorization.",
        headers: [
          { name: "Authorization", value: "Bearer <access_token>", description: "Token de acesso obtido no login" },
        ],
        body: [],
        example: {},
        response: {
          valid: true,
          user: {
            id: "uuid-do-usuario",
            username: "admin",
            email: "admin@otdentregas.com",
            role: "admin",
            firstName: "Administrador",
            lastName: "Sistema",
            driverType: "transporte"
          }
        }
      }
    ]
  }
];

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    POST: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    PUT: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    PATCH: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    DELETE: "bg-red-500/20 text-red-700 dark:text-red-400",
  };
  
  return (
    <Badge className={`${colors[method]} font-mono text-xs`}>
      {method}
    </Badge>
  );
}

function CodeBlock({ code }: { code: object }) {
  return (
    <ScrollArea className="h-auto max-h-64">
      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
        {JSON.stringify(code, null, 2)}
      </pre>
    </ScrollArea>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint.path}</code>
        </div>
        <CardDescription className="mt-2">{endpoint.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="params" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="params" data-testid="tab-params">Parâmetros</TabsTrigger>
            <TabsTrigger value="example" data-testid="tab-example">Exemplo</TabsTrigger>
            <TabsTrigger value="response" data-testid="tab-response">Resposta</TabsTrigger>
          </TabsList>
          
          <TabsContent value="params">
            <div className="space-y-4">
              {endpoint.headers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Headers</h4>
                  <div className="space-y-1">
                    {endpoint.headers.map((h) => (
                      <div key={h.name} className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{h.name}</code>
                        <span className="text-muted-foreground">{h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Body (JSON)</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Campo</th>
                        <th className="text-left px-3 py-2 font-medium">Tipo</th>
                        <th className="text-left px-3 py-2 font-medium">Obrigatório</th>
                        <th className="text-left px-3 py-2 font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.body.map((field) => (
                        <tr key={field.field} className="border-t">
                          <td className="px-3 py-2">
                            <code className="text-xs">{field.field}</code>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{field.type}</td>
                          <td className="px-3 py-2">
                            {field.required ? (
                              <Badge variant="destructive" className="text-xs">Sim</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Não</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="example">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Requisição</h4>
              <CodeBlock code={endpoint.example} />
            </div>
          </TabsContent>
          
          <TabsContent value="response">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Resposta de sucesso</h4>
              <CodeBlock code={endpoint.response} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function generatePdf() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  }

  function drawLine() {
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  }

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("OTD Entregas - Documentação da API", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Base URL: ${window.location.origin}`, margin, y);
  y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 10;
  doc.setTextColor(0);

  drawLine();

  for (const category of endpoints) {
    checkPage(20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(category.category, margin, y);
    y += 8;

    for (const ep of category.items) {
      checkPage(30);

      const methodColors: Record<string, [number, number, number]> = {
        GET: [16, 185, 129],
        POST: [59, 130, 246],
        PUT: [245, 158, 11],
        PATCH: [249, 115, 22],
        DELETE: [239, 68, 68],
      };
      const color = methodColors[ep.method] || [100, 100, 100];

      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(margin, y - 4, 14, 6, 1, 1, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);
      doc.text(ep.method, margin + 2, y);

      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont("courier", "normal");
      doc.text(ep.path, margin + 18, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);
      const descLines = doc.splitTextToSize(ep.description, contentWidth);
      checkPage(descLines.length * 4 + 4);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 4;
      doc.setTextColor(0);

      if (ep.headers.length > 0) {
        checkPage(15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Headers:", margin, y);
        y += 5;
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        for (const h of ep.headers) {
          checkPage(6);
          doc.text(`${h.name}: ${h.value}`, margin + 4, y);
          y += 4;
        }
        y += 2;
      }

      if (ep.body.length > 0) {
        checkPage(15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Parâmetros (Body):", margin, y);
        y += 6;

        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y - 4, contentWidth, 6, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Campo", margin + 2, y);
        doc.text("Tipo", margin + 50, y);
        doc.text("Obrig.", margin + 80, y);
        doc.text("Descrição", margin + 100, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        for (const field of ep.body) {
          checkPage(6);
          doc.setFont("courier", "normal");
          doc.text(field.field, margin + 2, y);
          doc.setFont("helvetica", "normal");
          doc.text(field.type, margin + 50, y);
          doc.text(field.required ? "Sim" : "Não", margin + 80, y);
          const descFieldLines = doc.splitTextToSize(field.description, contentWidth - 100);
          doc.text(descFieldLines[0], margin + 100, y);
          y += 5;
        }
        y += 3;
      }

      if (Object.keys(ep.example).length > 0) {
        checkPage(15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Exemplo de Requisição:", margin, y);
        y += 5;

        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setFillColor(245, 245, 245);
        const jsonStr = JSON.stringify(ep.example, null, 2);
        const jsonLines = jsonStr.split("\n");
        const blockHeight = jsonLines.length * 3.5 + 4;
        checkPage(blockHeight);
        doc.rect(margin, y - 3, contentWidth, blockHeight, "F");
        for (const line of jsonLines) {
          doc.text(line, margin + 3, y);
          y += 3.5;
        }
        y += 4;
      }

      checkPage(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Exemplo de Resposta:", margin, y);
      y += 5;

      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setFillColor(245, 245, 245);
      const respStr = JSON.stringify(ep.response, null, 2);
      const respLines = respStr.split("\n");
      const respBlockHeight = respLines.length * 3.5 + 4;
      checkPage(respBlockHeight);
      doc.rect(margin, y - 3, contentWidth, respBlockHeight, "F");
      for (const line of respLines) {
        doc.text(line, margin + 3, y);
        y += 3.5;
      }
      y += 8;

      drawLine();
    }
  }

  doc.save("OTD_Entregas_API_Documentacao.pdf");
}

function generateMarkdown() {
  let md = `# OTD Entregas - Documentação da API\n\n`;
  md += `**Base URL:** \`${window.location.origin}\`\n\n`;
  md += `**Gerado em:** ${new Date().toLocaleString("pt-BR")}\n\n`;
  md += `---\n\n`;

  for (const category of endpoints) {
    md += `## ${category.category}\n\n`;

    for (const ep of category.items) {
      md += `### \`${ep.method}\` ${ep.path}\n\n`;
      md += `${ep.description}\n\n`;

      if (ep.headers.length > 0) {
        md += `**Headers:**\n\n`;
        md += `| Nome | Valor | Descrição |\n`;
        md += `|------|-------|-----------|\n`;
        for (const h of ep.headers) {
          md += `| \`${h.name}\` | \`${h.value}\` | ${h.description} |\n`;
        }
        md += `\n`;
      }

      if (ep.body.length > 0) {
        md += `**Parâmetros (Body):**\n\n`;
        md += `| Campo | Tipo | Obrigatório | Descrição |\n`;
        md += `|-------|------|-------------|-----------|\n`;
        for (const field of ep.body) {
          md += `| \`${field.field}\` | \`${field.type}\` | ${field.required ? "Sim" : "Não"} | ${field.description} |\n`;
        }
        md += `\n`;
      }

      if (Object.keys(ep.example).length > 0) {
        md += `**Exemplo de Requisição:**\n\n`;
        md += `\`\`\`json\n${JSON.stringify(ep.example, null, 2)}\n\`\`\`\n\n`;
      }

      md += `**Exemplo de Resposta:**\n\n`;
      md += `\`\`\`json\n${JSON.stringify(ep.response, null, 2)}\n\`\`\`\n\n`;
      md += `---\n\n`;
    }
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "OTD_Entregas_API_Documentacao.md";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ApiDocsPage() {
  return (
    <div className="h-full overflow-auto p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Documentação da API</h1>
          <p className="text-muted-foreground mt-1">
            Endpoints disponíveis para integração com sistemas externos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateMarkdown} variant="outline" data-testid="button-generate-md">
            <FileDown className="w-4 h-4 mr-2" />
            Gerar MD
          </Button>
          <Button onClick={generatePdf} data-testid="button-generate-pdf">
            <Download className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Autenticação</h4>
                <p className="text-sm text-muted-foreground">
                  Todas as requisições devem incluir um cookie de sessão válido ou token de autenticação.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Code className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Formato</h4>
                <p className="text-sm text-muted-foreground">
                  Todas as requisições e respostas utilizam JSON (application/json).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Base URL</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {window.location.origin}
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {endpoints.map((category) => (
          <div key={category.category}>
            <h2 className="text-lg font-semibold mb-4" data-testid={`text-category-${category.category}`}>
              {category.category}
            </h2>
            {category.items.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
