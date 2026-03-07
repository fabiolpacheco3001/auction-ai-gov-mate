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
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgFilter } from "@/hooks/useOrgFilter";
import { gerarDocumentoLotes, downloadPdf } from "@/services/DocumentoLoteService";
import LoteItemsTable from "@/components/lotes/LoteItemsTable";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_leilao: "Em Leilão",
  arrematado: "Arrematado",
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
  valor_medio_site1: number | null;
  valor_medio_site2: number | null;
  valor_medio_site3: number | null;
  valor_sugerido: number | null;
}

interface Lote {
  id: string;
  numero: number;
  categoria: string;
  preco_sugerido: number;
  preco_aprovado: number | null;
  status: string;
  processo_id: string | null;
  bens: Bem[];
}

interface Processo {
  id: string;
  titulo: string;
  orgao: string;
  created_at?: string;
}

interface ProcessoGroup {
  processo: Processo;
  lotes: Lote[];
}

const LotesGerados = () => {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrgFilter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [openProcessos, setOpenProcessos] = useState<Set<string>>(new Set());
  const [selectedProcessos, setSelectedProcessos] = useState<Set<string>>(new Set());

  const { data: groups = [] } = useQuery<ProcessoGroup[]>({
    queryKey: ["lotes-by-processo", selectedOrgId],
    queryFn: async () => {
      let lotesQuery = supabase.from("lotes").select("*").order("numero");
      // Filter lotes by processo orgao_id - need to get processos first if filtering
      let processoIds: string[] = [];
      if (selectedOrgId) {
        const { data: processosData } = await supabase.from("processos").select("id").eq("orgao_id", selectedOrgId);
        processoIds = (processosData ?? []).map((p) => p.id);
        if (processoIds.length === 0) return [];
        lotesQuery = lotesQuery.in("processo_id", processoIds);
      }
      const { data: lotesData } = await lotesQuery;
      if (!lotesData || lotesData.length === 0) return [];

      // Get unique processo_ids
      const fetchedProcessoIds = [...new Set(lotesData.map((l) => l.processo_id).filter(Boolean))] as string[];
      
      // Fetch processos
      let processosMap: Record<string, Processo> = {};
      if (fetchedProcessoIds.length > 0) {
        const { data: processosData } = await supabase.from("processos").select("id, titulo, orgao, created_at").in("id", fetchedProcessoIds);
        for (const p of processosData ?? []) {
          processosMap[p.id] = p;
        }
      }

      // Fetch all bens for all lotes
      const loteIds = lotesData.map((l) => l.id);
      const { data: lotesBens } = await supabase.from("lotes_bens").select("lote_id, bem_id").in("lote_id", loteIds);
      const bemIdsByLote: Record<string, string[]> = {};
      for (const lb of lotesBens ?? []) {
        if (!bemIdsByLote[lb.lote_id]) bemIdsByLote[lb.lote_id] = [];
        bemIdsByLote[lb.lote_id].push(lb.bem_id);
      }

      const allBemIds = [...new Set((lotesBens ?? []).map((lb) => lb.bem_id))];
      let bensMap: Record<string, Bem> = {};
      if (allBemIds.length > 0) {
        const { data: bensData } = await supabase.from("bens").select("*").in("id", allBemIds);
        for (const b of bensData ?? []) {
          bensMap[b.id] = {
            ...b,
            valor_estimado: Number(b.valor_estimado),
            quantidade: Number(b.quantidade ?? 1),
            municipio: b.municipio ?? "",
            valor_medio_site1: b.valor_medio_site1 ? Number(b.valor_medio_site1) : null,
            valor_medio_site2: b.valor_medio_site2 ? Number(b.valor_medio_site2) : null,
            valor_medio_site3: b.valor_medio_site3 ? Number(b.valor_medio_site3) : null,
            valor_sugerido: b.valor_sugerido ? Number(b.valor_sugerido) : null,
          };
        }
      }

      // Build lotes with bens
      const lotes: Lote[] = lotesData.map((lote) => ({
        id: lote.id,
        numero: lote.numero,
        categoria: lote.categoria,
        preco_sugerido: Number(lote.preco_sugerido),
        preco_aprovado: lote.preco_aprovado ? Number(lote.preco_aprovado) : null,
        status: lote.status,
        processo_id: lote.processo_id,
        bens: (bemIdsByLote[lote.id] ?? []).map((id) => bensMap[id]).filter(Boolean),
      }));

      // Group by processo
      const grouped: Record<string, Lote[]> = {};
      const noProcesso: Lote[] = [];
      for (const lote of lotes) {
        if (lote.processo_id) {
          if (!grouped[lote.processo_id]) grouped[lote.processo_id] = [];
          grouped[lote.processo_id].push(lote);
        } else {
          noProcesso.push(lote);
        }
      }

      const sortedPids = fetchedProcessoIds
        .filter((pid) => grouped[pid] && processosMap[pid])
        .sort((a, b) => {
          const da = processosMap[a]?.created_at ?? "";
          const db = processosMap[b]?.created_at ?? "";
          return db.localeCompare(da);
        });

      const result: ProcessoGroup[] = [];
      for (const pid of sortedPids) {
        result.push({ processo: processosMap[pid], lotes: grouped[pid] });
      }
      if (noProcesso.length > 0) {
        result.push({ processo: { id: "__sem_processo__", titulo: "Sem Processo", orgao: "" }, lotes: noProcesso });
      }

      return result;
    },
  });

  const allLotes = groups.flatMap((g) => g.lotes);

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const toggleProcesso = (id: string) => {
    setOpenProcessos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkAndGenerateDocument = async (processoId: string | null) => {
    if (!processoId) return;
    // Refetch lotes for this process to check if all approved
    const { data: lotesProcesso } = await supabase
      .from("lotes")
      .select("status")
      .eq("processo_id", processoId);
    
    const allApproved = lotesProcesso && lotesProcesso.length > 0 && lotesProcesso.every((l) => l.status === "aprovado");
    if (!allApproved) return;

    const group = groups.find((g) => g.processo.id === processoId);
    if (!group) return;

    try {
      const result = await gerarDocumentoLotes(processoId, group.processo.titulo);
      if (result) {
        await downloadPdf(group.processo.titulo, result.lotes);
        queryClient.invalidateQueries({ queryKey: ["documentos"] });
        toast.success("Documento PDF de composição de lotes gerado com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao gerar documento:", err);
      toast.error("Erro ao gerar documento de lotes.");
    }
  };

  const aprovarLote = async (id: string) => {
    const lote = allLotes.find((l) => l.id === id);
    if (!lote) return;
    await supabase.from("lotes").update({ status: "aprovado", preco_aprovado: lote.preco_sugerido }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["lotes-by-processo"] });
    toast.success("Lote aprovado com sucesso!");
    await checkAndGenerateDocument(lote.processo_id);
  };

  const startEditPrice = (lote: Lote) => {
    setEditingPrice(lote.id);
    setEditValue(lote.preco_sugerido.toString());
  };

  const savePrice = async (id: string) => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue > 0) {
      await supabase.from("lotes").update({ preco_sugerido: numValue }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["lotes-by-processo"] });
      toast.success("Preço atualizado!");
    }
    setEditingPrice(null);
  };

  const aprovarTodosProcesso = async (group: ProcessoGroup) => {
    for (const l of group.lotes) {
      if (l.status !== "aprovado") {
        await supabase.from("lotes").update({ status: "aprovado", preco_aprovado: l.preco_sugerido }).eq("id", l.id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["lotes-by-processo"] });
    toast.success(`Todos os lotes de "${group.processo.titulo}" aprovados!`);
    await checkAndGenerateDocument(group.processo.id);
  };

  const aprovarTodos = async () => {
    const selectedGroups = groups.filter((g) => selectedProcessos.has(g.processo.id));
    for (const group of selectedGroups) {
      for (const l of group.lotes) {
        if (l.status !== "aprovado") {
          await supabase.from("lotes").update({ status: "aprovado", preco_aprovado: l.preco_sugerido }).eq("id", l.id);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["lotes-by-processo"] });
    toast.success("Lotes dos processos selecionados aprovados!");
    for (const group of selectedGroups) {
      await checkAndGenerateDocument(group.processo.id);
    }
    setSelectedProcessos(new Set());
  };

  const totalEstimado = allLotes.reduce((sum, l) => sum + l.preco_sugerido, 0);
  const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Lotes Gerados</h1>
          <p className="text-muted-foreground mt-1">Revise os lotes formados pela IA e aprove os preços sugeridos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><FileDown className="w-4 h-4" /> Exportar</Button>
          <Button onClick={aprovarTodos} disabled={selectedProcessos.size === 0} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <CheckCircle2 className="w-4 h-4" /> Aprovar Selecionados
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Lotes</p>
          <p className="text-xl font-display font-bold text-foreground">{allLotes.length}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Itens</p>
          <p className="text-xl font-display font-bold text-foreground">{allLotes.reduce((s, l) => s + l.bens.length, 0)}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrecadação Estimada</p>
          <p className="text-xl font-display font-bold text-success">{currency(totalEstimado)}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Aprovados</p>
          <p className="text-xl font-display font-bold text-accent">
            {allLotes.filter((l) => l.status === "aprovado").length} / {allLotes.length}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => {
          const isOpen = openProcessos.has(group.processo.id);
          const groupTotal = group.lotes.reduce((s, l) => s + l.preco_sugerido, 0);
          const groupApproved = group.lotes.filter((l) => l.status === "aprovado").length;
          const allLotesApproved = groupApproved === group.lotes.length;

          return (
            <Collapsible key={group.processo.id} open={isOpen} onOpenChange={() => toggleProcesso(group.processo.id)}>
              <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-card cursor-pointer hover:bg-muted/30 transition-colors">
                  <Checkbox
                    checked={selectedProcessos.has(group.processo.id)}
                    disabled={allLotesApproved}
                    onCheckedChange={(checked) => {
                      setSelectedProcessos((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(group.processo.id);
                        else next.delete(group.processo.id);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <FolderOpen className="w-5 h-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display font-semibold text-foreground truncate">{group.processo.titulo}</h2>
                      {group.processo.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(group.processo.created_at).toLocaleDateString("pt-BR")} {new Date(group.processo.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    {group.processo.orgao && (
                      <p className="text-xs text-muted-foreground">{group.processo.orgao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{group.lotes.length} {group.lotes.length === 1 ? "lote" : "lotes"}</span>
                    <span className="font-medium text-foreground">{currency(groupTotal)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", groupApproved === group.lotes.length ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                      {groupApproved}/{group.lotes.length} aprovados
                    </span>
                    {groupApproved < group.lotes.length && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); aprovarTodosProcesso(group); }}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Aprovar Todos
                      </Button>
                    )}
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 mt-3 ml-4">
                  {group.lotes.map((lote) => {
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
                              <p className="text-lg font-display font-bold text-foreground">{currency(lote.preco_sugerido)}</p>
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
                          <LoteItemsTable bens={lote.bens} loteId={lote.id} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default LotesGerados;
