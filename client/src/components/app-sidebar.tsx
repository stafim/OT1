import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Truck,
  Package,
  MapPin,
  Users,
  Factory,
  Building2,
  Warehouse,
  LayoutDashboard,
  LogOut,
  UserCog,
  Code,
  Link2,
  Radio,
  DoorOpen,
  Route,
  Receipt,
  ClipboardCheck,
  FileBarChart,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

type UserRole = "admin" | "operador" | "visualizador" | "motorista" | "portaria";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const operationItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Check Points",
    url: "/timeline-checkpoints",
    icon: Route,
  },
  {
    title: "Tráfego Agora (Em dev)",
    url: "/trafego-agora",
    icon: Radio,
  },
  {
    title: "Transportes",
    url: "/transportes",
    icon: Truck,
  },
  {
    title: "Coletas",
    url: "/coletas",
    icon: Package,
  },
  {
    title: "Localizar Motorista",
    url: "/localizar-motorista",
    icon: MapPin,
  },
  {
    title: "Portaria",
    url: "/portaria",
    icon: DoorOpen,
  },
  {
    title: "Avaliação",
    url: "/avaliacao",
    icon: ClipboardCheck,
  },
  {
    title: "Controle de Multas",
    url: "/controle-multas",
    icon: AlertTriangle,
  },
  {
    title: "Rotograma (Em dev)",
    url: "/rotograma",
    icon: Route,
  },
];

const financeiroItems: MenuItem[] = [
  {
    title: "Prestação de Contas",
    url: "/prestacao-de-contas",
    icon: Receipt,
  },
  {
    title: "Relatório de Pátio",
    url: "/relatorio-patio",
    icon: FileBarChart,
  },
];

const cadastroItems: MenuItem[] = [
  {
    title: "Motoristas",
    url: "/motoristas",
    icon: Users,
  },
  {
    title: "Check Points",
    url: "/checkpoints",
    icon: MapPin,
  },
  {
    title: "Montadoras",
    url: "/montadoras",
    icon: Factory,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Building2,
  },
  {
    title: "Pátios",
    url: "/patios",
    icon: Warehouse,
  },
  {
    title: "Estoque",
    url: "/estoque",
    icon: Package,
  },
];

const configItems: MenuItem[] = [
  {
    title: "Usuários",
    url: "/usuarios",
    icon: UserCog,
  },
  {
    title: "Integrações",
    url: "/integracoes",
    icon: Link2,
  },
  {
    title: "API",
    url: "/api-docs",
    icon: Code,
  },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  operador: "Operador",
  visualizador: "Visualizador",
  motorista: "Motorista",
  portaria: "Portaria",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const userRole: UserRole = (user?.role as UserRole) || "visualizador";

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">OTD Entregas</span>
            <span className="text-xs text-muted-foreground">Gestão de Veículos</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "") || "dashboard"}`}>
                      {item.url === "/trafego-agora" ? (
                        <span className="relative">
                          <item.icon className="h-4 w-4 text-red-500" />
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                        </span>
                      ) : (
                        <item.icon className="h-4 w-4" />
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeiroItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastroItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">
              {user?.firstName || user?.email || "Usuário"}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {roleLabels[userRole] || userRole}
              </Badge>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
