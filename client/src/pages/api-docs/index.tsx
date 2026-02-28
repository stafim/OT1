import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Server, Key, FileText } from "lucide-react";

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
        description: "Cria um novo motorista no sistema",
        headers: [
          { name: "Content-Type", value: "application/json", description: "Tipo do conteúdo" },
        ],
        body: [
          { field: "name", type: "string", required: true, description: "Nome completo do motorista" },
          { field: "cpf", type: "string", required: true, description: "CPF do motorista (somente números)" },
          { field: "phone", type: "string", required: true, description: "Telefone com DDD" },
          { field: "birthDate", type: "string", required: true, description: "Data de nascimento (YYYY-MM-DD)" },
          { field: "cnhNumber", type: "string", required: true, description: "Número da CNH" },
          { field: "cnhCategory", type: "string", required: true, description: "Categoria da CNH (A, B, C, D, E)" },
          { field: "cnhExpiry", type: "string", required: true, description: "Validade da CNH (YYYY-MM-DD)" },
          { field: "cnhFrontUrl", type: "string", required: false, description: "URL da foto da frente da CNH" },
          { field: "cnhBackUrl", type: "string", required: false, description: "URL da foto do verso da CNH" },
          { field: "cep", type: "string", required: true, description: "CEP do endereço" },
          { field: "street", type: "string", required: true, description: "Rua/Logradouro" },
          { field: "number", type: "string", required: true, description: "Número" },
          { field: "complement", type: "string", required: false, description: "Complemento" },
          { field: "neighborhood", type: "string", required: true, description: "Bairro" },
          { field: "city", type: "string", required: true, description: "Cidade" },
          { field: "state", type: "string", required: true, description: "Estado (UF)" },
          { field: "modality", type: "string", required: true, description: "Modalidade: pj, clt ou agregado" },
          { field: "isFitForService", type: "boolean", required: false, description: "Apto para serviço (padrão: true)" },
        ],
        example: {
          name: "João Silva",
          cpf: "12345678900",
          phone: "11999998888",
          birthDate: "1985-03-15",
          cnhNumber: "12345678901",
          cnhCategory: "D",
          cnhExpiry: "2027-03-15",
          cep: "01310100",
          street: "Avenida Paulista",
          number: "1000",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          modality: "pj",
          isFitForService: true
        },
        response: {
          id: 1,
          name: "João Silva",
          cpf: "12345678900",
          modality: "pj",
          isFitForService: true
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
            lastName: "Sistema"
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
            lastName: "Sistema"
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

export default function ApiDocsPage() {
  return (
    <div className="h-full overflow-auto p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Documentação da API</h1>
        <p className="text-muted-foreground mt-1">
          Endpoints disponíveis para integração com sistemas externos
        </p>
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
