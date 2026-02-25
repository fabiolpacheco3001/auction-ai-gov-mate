import { cn } from "@/lib/utils";
import { Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  processando: "Processando",
  revisao: "Em Revisão",
  aprovado: "Aprovado",
  em_leilao: "Em Leilão",
  finalizado: "Finalizado",
};

const statusColors: Record<string, string> = {
  processando: "bg-info/10 text-info",
  revisao: "bg-warning/10 text-warning",
  aprovado: "bg-success/10 text-success",
  em_leilao: "bg-accent/10 text-accent",
  finalizado: "bg-muted text-muted-foreground",
};

const ProcessTable = () => {
  const navigate = useNavigate();

  const { data: processos } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("processos")
        .select("*")
        .order("data_upload", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-display font-semibold text-foreground">Processos Recentes</h3>
        <button className="text-sm text-accent hover:text-accent/80 font-medium flex items-center gap-1 transition-colors">
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Processo</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Órgão</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Bens</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Lotes</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estimativa</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(processos ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.data_upload).toLocaleDateString("pt-BR")}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.orgao}</td>
                <td className="px-5 py-3.5 text-sm text-center text-foreground">{p.total_bens}</td>
                <td className="px-5 py-3.5 text-sm text-center text-foreground">{p.total_lotes}</td>
                <td className="px-5 py-3.5 text-sm text-right font-medium text-foreground">
                  {Number(p.arrecadacao_estimada).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusColors[p.status] ?? "")}>
                    {statusLabels[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => p.status === "revisao" ? navigate("/lotes") : null}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProcessTable;
