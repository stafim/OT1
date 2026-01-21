import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

import DriversPage from "@/pages/drivers/index";
import DriverFormPage from "@/pages/drivers/form";

import ManufacturersPage from "@/pages/manufacturers/index";
import ManufacturerFormPage from "@/pages/manufacturers/form";

import YardsPage from "@/pages/yards/index";
import YardFormPage from "@/pages/yards/form";

import ClientsPage from "@/pages/clients/index";
import ClientFormPage from "@/pages/clients/form";

import VehiclesPage from "@/pages/vehicles/index";
import VehicleFormPage from "@/pages/vehicles/form";

import TransportsPage from "@/pages/transports/index";
import TransportFormPage from "@/pages/transports/form";

import CollectsPage from "@/pages/collects/index";
import CollectFormPage from "@/pages/collects/form";

import DriverLocationPage from "@/pages/driver-location/index";
import TrafficPage from "@/pages/traffic/index";
import UsersPage from "@/pages/users/index";
import UserFormPage from "@/pages/users/form";
import IntegrationsPage from "@/pages/integrations/index";
import ApiDocsPage from "@/pages/api-docs/index";
import PortariaPage from "@/pages/portaria/index";
import RoutingPage from "@/pages/routing/index";
import PrestacaoDeContasPage from "@/pages/prestacao-de-contas/index";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/motoristas" component={DriversPage} />
      <Route path="/motoristas/:id" component={DriverFormPage} />
      <Route path="/montadoras" component={ManufacturersPage} />
      <Route path="/montadoras/:id" component={ManufacturerFormPage} />
      <Route path="/patios" component={YardsPage} />
      <Route path="/patios/:id" component={YardFormPage} />
      <Route path="/clientes" component={ClientsPage} />
      <Route path="/clientes/:id" component={ClientFormPage} />
      <Route path="/estoque" component={VehiclesPage} />
      <Route path="/estoque/:chassi" component={VehicleFormPage} />
      <Route path="/transportes" component={TransportsPage} />
      <Route path="/transportes/:id" component={TransportFormPage} />
      <Route path="/coletas" component={CollectsPage} />
      <Route path="/coletas/novo" component={CollectFormPage} />
      <Route path="/localizar-motorista" component={DriverLocationPage} />
      <Route path="/trafego-agora" component={TrafficPage} />
      <Route path="/portaria" component={PortariaPage} />
      <Route path="/roteirizacao" component={RoutingPage} />
      <Route path="/prestacao-de-contas" component={PrestacaoDeContasPage} />
      <Route path="/usuarios" component={UsersPage} />
      <Route path="/usuarios/:id" component={UserFormPage} />
      <Route path="/integracoes" component={IntegrationsPage} />
      <Route path="/api-docs" component={ApiDocsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <AuthenticatedRouter />
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
