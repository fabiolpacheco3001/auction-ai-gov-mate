import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NovoProcesso from "@/pages/NovoProcesso";
import LotesGerados from "@/pages/LotesGerados";
import RevisaoLotes from "@/pages/RevisaoLotes";
import Documentos from "@/pages/Documentos";
import Relatorios from "@/pages/Relatorios";
import ConfiguracaoClassificacaoCsv from "@/pages/ConfiguracaoClassificacaoCsv";
import ConfiguracaoPrecificacao from "@/pages/ConfiguracaoPrecificacao";
import ApiAccessToken from "@/pages/ApiAccessToken";
import CadastroOrgaos from "@/pages/CadastroOrgaos";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

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
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/novo-processo" element={<NovoProcesso />} />
        <Route path="/lotes" element={<LotesGerados />} />
        <Route path="/revisao-lotes" element={<RevisaoLotes />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes/classificacao-csv" element={<ConfiguracaoClassificacaoCsv />} />
        <Route path="/configuracoes/precificacao" element={<ConfiguracaoPrecificacao />} />
        <Route path="/configuracoes/api-token" element={<ApiAccessToken />} />
        <Route path="/admin/orgaos" element={<CadastroOrgaos />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
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
