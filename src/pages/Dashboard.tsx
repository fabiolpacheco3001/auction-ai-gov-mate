import {
  Package,
  Layers,
  TrendingUp,
  CheckCircle2,
  Zap,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ProcessTable from "@/components/dashboard/ProcessTable";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: processos } = await supabase.from("processos").select("*");
      const rows = processos ?? [];
      const totalBens = rows.reduce((s, p) => s + (p.total_bens ?? 0), 0);
      const totalLotes = rows.reduce((s, p) => s + (p.total_lotes ?? 0), 0);
      const arrecadacaoEstimada = rows.reduce((s, p) => s + Number(p.arrecadacao_estimada ?? 0), 0);
      const arrecadacaoRealizada = rows.reduce((s, p) => s + Number(p.arrecadacao_real ?? 0), 0);
      const processosAtivos = rows.filter((p) => !["finalizado"].includes(p.status)).length;
      return { totalBens, totalLotes, arrecadacaoEstimada, arrecadacaoRealizada, processosAtivos };
    },
  });

  const s = stats ?? { totalBens: 0, totalLotes: 0, arrecadacaoEstimada: 0, arrecadacaoRealizada: 0, processosAtivos: 0 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos processos de alienação e leilão</p>
      </div>

      <div className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">82% de redução no tempo operacional</h2>
            <p className="text-sm opacity-80 mt-0.5">
              Tempo médio de processamento: 2.5 horas · IA processando {s.processosAtivos} processos ativos
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Bens Processados" value={s.totalBens} icon={Package} trend={{ value: 12, label: "vs mês anterior" }} />
        <StatCard title="Lotes Gerados" value={s.totalLotes} icon={Layers} variant="accent" trend={{ value: 8, label: "vs mês anterior" }} />
        <StatCard
          title="Arrecadação Estimada"
          value={s.arrecadacaoEstimada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Arrecadação Realizada"
          value={s.arrecadacaoRealizada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={CheckCircle2}
          variant="warning"
          subtitle={s.arrecadacaoEstimada > 0 ? `${Math.round((s.arrecadacaoRealizada / s.arrecadacaoEstimada) * 100)}% da estimativa` : ""}
        />
      </div>

      <ProcessTable />
    </div>
  );
};

export default Dashboard;
