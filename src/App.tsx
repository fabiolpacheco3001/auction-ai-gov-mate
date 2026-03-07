import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider } from "@/contexts/OrgContext";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NovoProcesso from "@/pages/NovoProcesso";
import LotesGerados from "@/pages/LotesGerados";
import RevisaoLotes from "@/pages/RevisaoLotes";
import Documentos from "@/pages/Documentos";
import Relatorios from "@/pages/Relatorios";

import ConfiguracaoPrecificacao from "@/pages/ConfiguracaoPrecificacao";
import ApiAccessToken from "@/pages/ApiAccessToken";
import CadastroOrgaos from "@/pages/CadastroOrgaos";
import ListaOrgaos from "@/pages/ListaOrgaos";
import SelecaoOrgao from "@/pages/SelecaoOrgao";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

const queryClient = new QueryClient();

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error("Acesso negado. Apenas Super Admins podem acessar esta página.");
    }
  }, [loading, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin, isOrgAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isSuperAdmin && !isOrgAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
    }
  }, [loading, isSuperAdmin, isOrgAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin && !isOrgAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <OrgProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/novo-processo" element={<NovoProcesso />} />
          <Route path="/lotes" element={<LotesGerados />} />
          <Route path="/revisao-lotes" element={<RevisaoLotes />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          
          <Route path="/configuracoes/precificacao" element={<AdminRoute><ConfiguracaoPrecificacao /></AdminRoute>} />
          <Route path="/configuracoes/api-token" element={<AdminRoute><ApiAccessToken /></AdminRoute>} />
          <Route path="/admin/orgaos" element={<SuperAdminRoute><ListaOrgaos /></SuperAdminRoute>} />
          <Route path="/admin/orgaos/novo" element={<SuperAdminRoute><CadastroOrgaos /></SuperAdminRoute>} />
          <Route path="/admin/orgaos/:id/editar" element={<SuperAdminRoute><CadastroOrgaos /></SuperAdminRoute>} />
          <Route path="/admin/selecao-orgao" element={<SuperAdminRoute><SelecaoOrgao /></SuperAdminRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </OrgProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
