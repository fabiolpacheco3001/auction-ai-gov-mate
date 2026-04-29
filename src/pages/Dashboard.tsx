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
import { useOrgFilter } from "@/hooks/useOrgFilter";

const Dashboard = () => {
  const { selectedOrgId } = useOrgFilter();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", selectedOrgId],
    queryFn: async () => {
      let query = supabase.from("processos").select("*");
      if (selectedOrgId) query = query.eq("orgao_id", selectedOrgId);
      const { data: processos } = await query;
      const rows = processos ?? [];
      const totalBens = rows.reduce((s, p) => s + (p.total_bens ?? 0), 0);
      const totalLotes = rows.reduce((s, p) => s + (p.total_lotes ?? 0), 0);
      const arrecadacaoEstimada = rows.reduce((s, p) => s + Number(p.arrecadacao_estimada ?? 0), 0);

      // Arrecadação Realizada: soma de valor_efetivado * quantidade dos bens
      // pertencentes a processos com status "finalizado", excluindo lotes "não vendidos"
      const finalizadosIds = rows.filter((p) => p.status === "finalizado").map((p) => p.id);
      let arrecadacaoRealizada = 0;
      if (finalizadosIds.length > 0) {
        const { data: lotesFin } = await supabase
          .from("lotes")
          .select("id, processo_id, nao_vendido")
          .in("processo_id", finalizadosIds);
        const validLoteIds = (lotesFin ?? []).filter((l) => !l.nao_vendido).map((l) => l.id);
        if (validLoteIds.length > 0) {
          const { data: lb } = await supabase
            .from("lotes_bens")
            .select("bem_id")
            .in("lote_id", validLoteIds);
          const bemIds = [...new Set((lb ?? []).map((x) => x.bem_id))];
          if (bemIds.length > 0) {
            const { data: bensRows } = await supabase
              .from("bens")
              .select("valor_efetivado, quantidade")
              .in("id", bemIds);
            for (const b of bensRows ?? []) {
              const v = (b as any).valor_efetivado != null ? Number((b as any).valor_efetivado) : 0;
              arrecadacaoRealizada += v * Number(b.quantidade ?? 1);
            }
          }
        }
      }
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
