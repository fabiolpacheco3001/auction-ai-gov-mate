import {
  Package,
  Layers,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ProcessTable from "@/components/dashboard/ProcessTable";
import { dashboardStats } from "@/data/mockData";

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Painel de Controle
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral dos processos de alienação e leilão
        </p>
      </div>

      {/* Highlight banner */}
      <div className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">
              {dashboardStats.reducaoTempo}% de redução no tempo operacional
            </h2>
            <p className="text-sm opacity-80 mt-0.5">
              Tempo médio de processamento: {dashboardStats.tempoMedioProcessamento} · IA processando {dashboardStats.processosAtivos} processos ativos
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bens Processados"
          value={dashboardStats.totalBensProcessados}
          icon={Package}
          trend={{ value: 12, label: "vs mês anterior" }}
        />
        <StatCard
          title="Lotes Gerados"
          value={dashboardStats.lotesGerados}
          icon={Layers}
          variant="accent"
          trend={{ value: 8, label: "vs mês anterior" }}
        />
        <StatCard
          title="Arrecadação Estimada"
          value={dashboardStats.arrecadacaoEstimada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Arrecadação Realizada"
          value={dashboardStats.arrecadacaoRealizada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={CheckCircle2}
          variant="warning"
          subtitle="64% da estimativa"
        />
      </div>

      {/* Process table */}
      <ProcessTable />
    </div>
  );
};

export default Dashboard;
