import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Edit3,
  Car,
  Monitor,
  Armchair,
  Snowflake,
  Package,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_leilao: "Em Leilão",
  arrematado: "Arrematado",
};

const estadoLabels: Record<string, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  inservivel: "Inservível",
};

const categoryIcons: Record<string, React.ElementType> = {
  "Veículos Leves": Car,
  "Equipamentos de Informática": Monitor,
  "Mobiliário de Escritório": Armchair,
  "Climatização": Snowflake,
};

interface Bem {
  id: string;
  descricao: string;
  categoria: string;
  estado: string;
  localizacao: string;
  municipio: string;
  quantidade: number;
  tombamento: string;
  valor_estimado: number;
}

interface Lote {
  id: string;
  numero: number;
  categoria: string;
  preco_sugerido: number;
  preco_aprovado: number | null;
  status: string;
  bens: Bem[];
}

const LotesGerados = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: lotes = [] } = useQuery<Lote[]>({
    queryKey: ["lotes-with-bens"],
    queryFn: async () => {
      const { data: lotesData } = await supabase.from("lotes").select("*").order("numero");
      if (!lotesData) return [];

      const result: Lote[] = [];
      for (const lote of lotesData) {
        const { data: lotesBens } = await supabase
          .from("lotes_bens")
          .select("bem_id")
          .eq("lote_id", lote.id);
        const bemIds = (lotesBens ?? []).map((lb) => lb.bem_id);
        let bens: Bem[] = [];
        if (bemIds.length > 0) {
          const { data: bensData } = await supabase.from("bens").select("*").in("id", bemIds);
          bens = (bensData ?? []).map((b) => ({
            ...b,
            valor_estimado: Number(b.valor_estimado),
            quantidade: Number((b as any).quantidade ?? 1),
            municipio: (b as any).municipio ?? "",
          }));
        }
        result.push({
          id: lote.id,
          numero: lote.numero,
          categoria: lote.categoria,
          preco_sugerido: Number(lote.preco_sugerido),
          preco_aprovado: lote.preco_aprovado ? Number(lote.preco_aprovado) : null,
          status: lote.status,
          bens,
        });
      }
      return result;
    },
  });

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const aprovarLote = async (id: string) => {
    const lote = lotes.find((l) => l.id === id);
    if (!lote) return;
    await supabase.from("lotes").update({ status: "aprovado", preco_aprovado: lote.preco_sugerido }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["lotes-with-bens"] });
    toast.success("Lote aprovado com sucesso!");
  };

  const startEditPrice = (lote: Lote) => {
    setEditingPrice(lote.id);
    setEditValue(lote.preco_sugerido.toString());
  };

  const savePrice = async (id: string) => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue > 0) {
      await supabase.from("lotes").update({ preco_sugerido: numValue }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["lotes-with-bens"] });
      toast.success("Preço atualizado!");
    }
    setEditingPrice(null);
  };

  const aprovarTodos = async () => {
    for (const l of lotes) {
      if (l.status !== "aprovado") {
        await supabase.from("lotes").update({ status: "aprovado", preco_aprovado: l.preco_sugerido }).eq("id", l.id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["lotes-with-bens"] });
    toast.success("Todos os lotes aprovados!");
  };

  const totalEstimado = lotes.reduce((sum, l) => sum + l.preco_sugerido, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Lotes Gerados</h1>
          <p className="text-muted-foreground mt-1">Revise os lotes formados pela IA e aprove os preços sugeridos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><FileDown className="w-4 h-4" /> Exportar</Button>
          <Button onClick={aprovarTodos} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <CheckCircle2 className="w-4 h-4" /> Aprovar Todos
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Lotes</p>
          <p className="text-xl font-display font-bold text-foreground">{lotes.length}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Itens</p>
          <p className="text-xl font-display font-bold text-foreground">{lotes.reduce((s, l) => s + l.bens.length, 0)}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrecadação Estimada</p>
          <p className="text-xl font-display font-bold text-success">
            {totalEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Aprovados</p>
          <p className="text-xl font-display font-bold text-accent">
            {lotes.filter((l) => l.status === "aprovado").length} / {lotes.length}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {lotes.map((lote) => {
          const isExpanded = expanded === lote.id;
          const Icon = categoryIcons[lote.categoria] || Package;
          const isApproved = lote.status === "aprovado";

          return (
            <div key={lote.id} className={cn("bg-card rounded-xl border shadow-card transition-all duration-200", isApproved ? "border-success/30" : "border-border")}>
              <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => toggleExpand(lote.id)}>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", isApproved ? "bg-success/10" : "bg-accent/10")}>
                  <Icon className={cn("w-5 h-5", isApproved ? "text-success" : "text-accent")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-display font-semibold text-foreground">Lote {lote.numero} — {lote.categoria}</h3>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", isApproved ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                      {statusLabels[lote.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{lote.bens.length} {lote.bens.length === 1 ? "item" : "itens"}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-xs text-muted-foreground">Preço sugerido (IA)</p>
                  {editingPrice === lote.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm text-muted-foreground">R$</span>
                      <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && savePrice(lote.id)}
                        onBlur={() => savePrice(lote.id)}
                        className="w-28 px-2 py-1 text-lg font-bold text-foreground border border-border rounded-lg bg-background text-right focus:ring-2 focus:ring-accent/30 outline-none"
                        autoFocus />
                    </div>
                  ) : (
                    <p className="text-lg font-display font-bold text-foreground">
                      {lote.preco_sugerido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!isApproved && (
                    <>
                      <button onClick={() => startEditPrice(lote)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar preço">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => aprovarLote(lote.id)} className="p-2 rounded-lg hover:bg-success/10 text-success transition-colors" title="Aprovar lote">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border">
                  <table className="w-full">
                    <thead>
                       <tr className="bg-muted/30">
                         <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Tombamento</th>
                         <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Descrição</th>
                         <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Qtd</th>
                         <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Estado</th>
                         <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Localização</th>
                         <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Município</th>
                         <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2.5">Valor Est.</th>
                       </tr>
                    </thead>
                    <tbody>
                      {lote.bens.map((item) => (
                        <tr key={item.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-2.5 text-sm font-mono text-muted-foreground">{item.tombamento}</td>
                          <td className="px-5 py-2.5 text-sm text-foreground">{item.descricao}</td>
                          <td className="px-5 py-2.5 text-sm text-center text-foreground">{item.quantidade}</td>
                          <td className="px-5 py-2.5 text-center">
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                              item.estado === "bom" ? "bg-success/10 text-success" :
                              item.estado === "regular" ? "bg-info/10 text-info" :
                              item.estado === "ruim" ? "bg-warning/10 text-warning" :
                              "bg-destructive/10 text-destructive"
                            )}>
                              {estadoLabels[item.estado] ?? item.estado}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-sm text-muted-foreground">{item.localizacao}</td>
                          <td className="px-5 py-2.5 text-sm text-muted-foreground">{item.municipio}</td>
                          <td className="px-5 py-2.5 text-sm text-right font-medium text-foreground">
                            {item.valor_estimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LotesGerados;
