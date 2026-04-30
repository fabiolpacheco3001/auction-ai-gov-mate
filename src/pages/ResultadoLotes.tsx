import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Car,
  Monitor,
  Armchair,
  Snowflake,
  Package,
  FolderOpen,
  Loader2,
  Flag,
  Upload,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgFilter } from "@/hooks/useOrgFilter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { calcValorSugerido, type Bem as BemBase } from "@/components/lotes/LoteItemsTable";

const categoryIcons: Record<string, React.ElementType> = {
  "Veículos Leves": Car,
  "Equipamentos de Informática": Monitor,
  "Mobiliário de Escritório": Armchair,
  "Climatização": Snowflake,
};

interface Bem extends BemBase {
  valor_efetivado: number | null;
}

interface Lote {
  id: string;
  numero: number;
  categoria: string;
  preco_sugerido: number;
  preco_aprovado: number | null;
  status: string;
  nao_vendido: boolean;
  processo_id: string | null;
  bens: Bem[];
}

interface Processo {
  id: string;
  titulo: string;
  numero?: number;
  sigla_orgao?: string;
  created_at?: string;
  status: string;
  documento_comprobatorio_url?: string | null;
  documento_comprobatorio_nome?: string | null;
  finalizado_em?: string | null;
}

interface ProcessoGroup {
  processo: Processo;
  lotes: Lote[];
}

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ResultadoLotes = () => {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrgFilter();
  const [openProcessos, setOpenProcessos] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [finalizingProcesso, setFinalizingProcesso] = useState<Processo | null>(null);
  const [comprobatorioFile, setComprobatorioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: groups = [], isLoading } = useQuery<ProcessoGroup[]>({
    queryKey: ["resultado-lotes", selectedOrgId],
    queryFn: async () => {
      let processosQuery = supabase
        .from("processos")
        .select("id, titulo, numero, status, created_at, documento_comprobatorio_url, documento_comprobatorio_nome, finalizado_em, orgaos:orgao_id(sigla)")
        .in("status", ["aprovado", "finalizado"]);
      if (selectedOrgId) processosQuery = processosQuery.eq("orgao_id", selectedOrgId);
      const { data: processosData } = await processosQuery;
      if (!processosData || processosData.length === 0) return [];

      const processoIds = processosData.map((p) => p.id);
      const processosMap: Record<string, Processo> = {};
      for (const p of processosData) {
        processosMap[p.id] = {
          id: p.id,
          titulo: p.titulo,
          numero: (p as any).numero ?? undefined,
          created_at: p.created_at,
          sigla_orgao: (p as any).orgaos?.sigla ?? "",
          status: p.status,
          documento_comprobatorio_url: (p as any).documento_comprobatorio_url ?? null,
          documento_comprobatorio_nome: (p as any).documento_comprobatorio_nome ?? null,
          finalizado_em: (p as any).finalizado_em ?? null,
        };
      }

      const { data: lotesData } = await supabase
        .from("lotes")
        .select("*")
        .in("processo_id", processoIds)
        .order("numero");
      if (!lotesData) return [];

      const loteIds = lotesData.map((l) => l.id);
      const { data: lotesBens } = await supabase
        .from("lotes_bens")
        .select("lote_id, bem_id")
        .in("lote_id", loteIds);
      const bemIdsByLote: Record<string, string[]> = {};
      for (const lb of lotesBens ?? []) {
        if (!bemIdsByLote[lb.lote_id]) bemIdsByLote[lb.lote_id] = [];
        bemIdsByLote[lb.lote_id].push(lb.bem_id);
      }

      const allBemIds = [...new Set((lotesBens ?? []).map((lb) => lb.bem_id))];
      const bensMap: Record<string, Bem> = {};
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
            valor_efetivado: (b as any).valor_efetivado != null ? Number((b as any).valor_efetivado) : null,
            imagem_url: b.imagem_url ?? null,
          };
        }
      }

      const lotes: Lote[] = lotesData.map((lote) => ({
        id: lote.id,
        numero: lote.numero,
        categoria: lote.categoria,
        preco_sugerido: Number(lote.preco_sugerido),
        preco_aprovado: lote.preco_aprovado ? Number(lote.preco_aprovado) : null,
        status: lote.status,
        nao_vendido: (lote as any).nao_vendido ?? false,
        processo_id: lote.processo_id,
        bens: (bemIdsByLote[lote.id] ?? []).map((id) => bensMap[id]).filter(Boolean),
      }));

      const grouped: Record<string, Lote[]> = {};
      for (const lote of lotes) {
        if (!lote.processo_id) continue;
        if (!grouped[lote.processo_id]) grouped[lote.processo_id] = [];
        grouped[lote.processo_id].push(lote);
      }

      const sortedPids = processoIds
        .filter((pid) => grouped[pid])
        .sort((a, b) => (processosMap[b]?.created_at ?? "").localeCompare(processosMap[a]?.created_at ?? ""));

      return sortedPids.map((pid) => ({ processo: processosMap[pid], lotes: grouped[pid] }));
    },
  });

  const toggleProcesso = (id: string) => {
    setOpenProcessos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const updateValorEfetivado = async (bemId: string, valor: number) => {
    await supabase.from("bens").update({ valor_efetivado: valor }).eq("id", bemId);
    queryClient.invalidateQueries({ queryKey: ["resultado-lotes"] });
  };

  const toggleNaoVendido = async (loteId: string, value: boolean) => {
    await supabase.from("lotes").update({ nao_vendido: value }).eq("id", loteId);
    queryClient.invalidateQueries({ queryKey: ["resultado-lotes"] });
  };

  const openFinalizar = (processo: Processo) => {
    setComprobatorioFile(null);
    setFinalizingProcesso(processo);
  };

  const handleFinalizar = async () => {
    if (!finalizingProcesso) return;
    if (!comprobatorioFile) {
      toast.error("Anexe o documento comprobatório para finalizar.");
      return;
    }
    const validExt = /\.(pdf|docx?)$/i.test(comprobatorioFile.name);
    if (!validExt) {
      toast.error("Formato inválido. Use .pdf, .doc ou .docx.");
      return;
    }

    setSubmitting(true);
    try {
      // Persist valores efetivados padrão (preencher os ainda não preenchidos com valor sugerido)
      const group = groups.find((g) => g.processo.id === finalizingProcesso.id);
      if (group) {
        for (const lote of group.lotes) {
          for (const bem of lote.bens) {
            if (lote.nao_vendido) {
              if (bem.valor_efetivado !== 0) {
                await supabase.from("bens").update({ valor_efetivado: 0 }).eq("id", bem.id);
              }
            } else if (bem.valor_efetivado == null) {
              const sugerido = bem.valor_sugerido ?? calcValorSugerido(bem);
              await supabase.from("bens").update({ valor_efetivado: sugerido }).eq("id", bem.id);
            }
          }
        }
      }

      // Upload do arquivo
      const ext = comprobatorioFile.name.split(".").pop();
      const path = `${finalizingProcesso.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documentos-comprobatorios")
        .upload(path, comprobatorioFile, { upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("documentos-comprobatorios")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      // Atualiza arrecadação real e status
      let arrecadacaoReal = 0;
      if (group) {
        for (const lote of group.lotes) {
          if (lote.nao_vendido) continue;
          for (const bem of lote.bens) {
            const ef = bem.valor_efetivado ?? bem.valor_sugerido ?? calcValorSugerido(bem);
            arrecadacaoReal += Number(ef) * Number(bem.quantidade ?? 1);
          }
        }
      }

      await supabase
        .from("processos")
        .update({
          status: "finalizado",
          documento_comprobatorio_url: signed?.signedUrl ?? path,
          documento_comprobatorio_nome: comprobatorioFile.name,
          finalizado_em: new Date().toISOString(),
          arrecadacao_real: arrecadacaoReal,
        })
        .eq("id", finalizingProcesso.id);

      toast.success("Processo finalizado com sucesso!");
      setFinalizingProcesso(null);
      setComprobatorioFile(null);
      queryClient.invalidateQueries({ queryKey: ["resultado-lotes"] });
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Erro ao finalizar processo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Resultado dos Lotes</h1>
        <p className="text-muted-foreground mt-1">
          Informe os valores efetivados de cada item e finalize os processos aprovados
        </p>
      </div>

      {groups.length === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center">
          <p className="text-muted-foreground">Nenhum processo aprovado disponível.</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => {
          const isOpen = openProcessos.has(group.processo.id);
          const isFinalized = group.processo.status === "finalizado";
          const groupTotal = group.lotes.reduce((s, l) => {
            if (l.nao_vendido) return s;
            return (
              s +
              l.bens.reduce((bs, b) => {
                const ef = b.valor_efetivado ?? b.valor_sugerido ?? calcValorSugerido(b);
                return bs + Number(ef) * Number(b.quantidade ?? 1);
              }, 0)
            );
          }, 0);

          return (
            <Collapsible
              key={group.processo.id}
              open={isOpen}
              onOpenChange={() => toggleProcesso(group.processo.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-card cursor-pointer hover:bg-muted/30 transition-colors">
                  <FolderOpen className="w-5 h-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display font-semibold text-foreground truncate">
                        {group.processo.numero && group.processo.created_at
                          ? `${String(group.processo.numero).padStart(3, "0")}/${new Date(group.processo.created_at).getFullYear()} - ${group.processo.titulo}`
                          : group.processo.titulo}
                      </h2>
                    </div>
                    {group.processo.sigla_orgao && (
                      <p className="text-xs text-muted-foreground">{group.processo.sigla_orgao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {group.lotes.length} {group.lotes.length === 1 ? "lote" : "lotes"}
                    </span>
                    <span className="font-medium text-foreground">{currency(groupTotal)}</span>
                    {isFinalized ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                        Finalizado
                      </span>
                    ) : null}
                    {isFinalized && group.processo.documento_comprobatorio_url ? (
                      <a
                        href={group.processo.documento_comprobatorio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={group.processo.documento_comprobatorio_nome ?? "Documento comprobatório"}
                      >
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                          <Download className="w-3 h-3" /> Comprobatório
                        </Button>
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={isFinalized}
                      className="gap-1 text-xs h-7 bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFinalized) openFinalizar(group.processo);
                      }}
                    >
                      <Flag className="w-3 h-3" /> Finalizar Processo
                    </Button>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 mt-3 ml-4">
                  {group.lotes.map((lote) => {
                    const isExpanded = expanded === lote.id;
                    const Icon = categoryIcons[lote.categoria] || Package;
                    return (
                      <div
                        key={lote.id}
                        className={cn(
                          "bg-card rounded-xl border shadow-card transition-all duration-200",
                          lote.nao_vendido ? "border-warning/40 opacity-80" : "border-border",
                        )}
                      >
                        <div
                          className="flex items-center gap-4 p-5 cursor-pointer"
                          onClick={() => toggleExpand(lote.id)}
                        >
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-accent/10">
                            <Icon className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-foreground">
                              Lote {lote.numero} — {lote.categoria}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {lote.bens.length} {lote.bens.length === 1 ? "item" : "itens"}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label
                              htmlFor={`nv-${lote.id}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              Não Vendido/Alienado
                            </Label>
                            <Switch
                              id={`nv-${lote.id}`}
                              checked={lote.nao_vendido}
                              disabled={isFinalized}
                              onCheckedChange={(v) => toggleNaoVendido(lote.id, v)}
                            />
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        {isExpanded && (
                          <ResultadoItemsTable
                            bens={lote.bens}
                            disabled={lote.nao_vendido || isFinalized}
                            onUpdate={updateValorEfetivado}
                          />
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

      <Dialog
        open={!!finalizingProcesso}
        onOpenChange={(open) => !open && !submitting && setFinalizingProcesso(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Processo</DialogTitle>
            <DialogDescription>
              Atenção, esta ação não poderá ser desfeita. Deseja finalizar o Processo confirmando os
              valores efetivados?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="comprobatorio">Documento Comprobatório (.pdf, .doc, .docx)</Label>
            <Input
              id="comprobatorio"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setComprobatorioFile(e.target.files?.[0] ?? null)}
            />
            {comprobatorioFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="w-3 h-3" /> {comprobatorioFile.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinalizingProcesso(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={submitting || !comprobatorioFile}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ResultadoItemsTableProps {
  bens: Bem[];
  disabled: boolean;
  onUpdate: (bemId: string, valor: number) => void;
}

const ResultadoItemsTable = ({ bens, disabled, onUpdate }: ResultadoItemsTableProps) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const getDefault = (b: Bem) =>
    b.valor_efetivado ?? b.valor_sugerido ?? calcValorSugerido(b);

  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/30">
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-12">Foto</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Código do Bem</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Descrição</th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Qtd</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Localização</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Município</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Valor Sugerido</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Valor Efetivado</th>
          </tr>
        </thead>
        <tbody>
          {bens.map((b) => {
            const sugerido = b.valor_sugerido ?? calcValorSugerido(b);
            const defaultValue = getDefault(b);
            const value = localValues[b.id] ?? defaultValue.toFixed(2);
            return (
              <tr key={b.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-center">
                  {b.imagem_url ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <a href={b.imagem_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={b.imagem_url}
                            alt={b.descricao}
                            className="w-8 h-8 rounded object-cover inline-block hover:opacity-80 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 p-1" side="right">
                        <img src={b.imagem_url} alt={b.descricao} className="w-full h-auto rounded object-contain" />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-muted-foreground">{b.tombamento}</td>
                <td className="px-4 py-2.5 text-sm text-foreground max-w-[240px] truncate">{b.descricao}</td>
                <td className="px-4 py-2.5 text-sm text-center text-foreground">{b.quantidade}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{b.localizacao}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{b.municipio}</td>
                <td className="px-4 py-2.5 text-sm text-right font-medium text-foreground">{currency(sugerido)}</td>
                <td className="px-4 py-2.5 text-sm text-right">
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={value}
                    onChange={(e) =>
                      setLocalValues((prev) => ({ ...prev, [b.id]: e.target.value }))
                    }
                    onBlur={() => {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) onUpdate(b.id, num);
                    }}
                    className="w-28 px-2 py-1 text-sm font-semibold text-foreground border border-border rounded bg-background text-right focus:ring-2 focus:ring-accent/30 outline-none disabled:opacity-50"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultadoLotes;