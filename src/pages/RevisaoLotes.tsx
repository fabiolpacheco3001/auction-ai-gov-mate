import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  MoveRight,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassificationResult, LoteClassificado } from "@/services/CsvClassificationService";

interface BemRevisao {
  id: string;
  linha: number;
  tombamento: string;
  descricao: string;
  categoria: string;
  estado: string;
  localizacao: string;
  municipio: string;
  quantidade: number;
  valor: number;
}

interface LoteRevisao {
  id: string;
  numero: number;
  categoria: string;
  itens: BemRevisao[];
}

function buildLotesFromResult(lotes: LoteClassificado[]): LoteRevisao[] {
  return lotes.map((lote, i) => ({
    id: `lote-${i}-${Date.now()}`,
    numero: i + 1,
    categoria: lote.categoria,
    itens: lote.itens.map((item, j) => ({
      id: `bem-${i}-${j}-${Date.now()}`,
      linha: item.linha,
      tombamento: item.tombamento,
      descricao: item.descricao,
      categoria: item.categoria,
      estado: item.estado,
      localizacao: item.localizacao,
      municipio: item.municipio ?? "",
      quantidade: item.quantidade ?? 1,
      valor: item.valor,
    })),
  }));
}

const RevisaoLotes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const classificationResult: ClassificationResult | undefined = location.state?.classificationResult;
  const fileName = location.state?.fileName ?? "arquivo.csv";

  const [lotes, setLotes] = useState<LoteRevisao[]>(() =>
    classificationResult ? buildLotesFromResult(classificationResult.lotes) : []
  );
  const [saving, setSaving] = useState(false);
  const [movingItem, setMovingItem] = useState<{ bemId: string; fromLoteId: string } | null>(null);
  const [novaCategoria, setNovaCategoria] = useState("");

  if (!classificationResult || classificationResult.lotes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <Package className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-display font-semibold text-foreground">
          Nenhum dado para revisão
        </h2>
        <p className="text-muted-foreground text-sm">
          Faça o upload de um arquivo CSV em "Novo Processo" para gerar lotes.
        </p>
        <Button variant="outline" onClick={() => navigate("/novo-processo")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Ir para Novo Processo
        </Button>
      </div>
    );
  }

  const totalBens = lotes.reduce((s, l) => s + l.itens.length, 0);
  const totalValor = lotes.reduce(
    (s, l) => s + l.itens.reduce((v, b) => v + b.valor, 0),
    0
  );

  const handleMoveItem = (bemId: string, fromLoteId: string, toLoteId: string) => {
    if (fromLoteId === toLoteId) {
      setMovingItem(null);
      return;
    }
    setLotes((prev) => {
      const item = prev.find((l) => l.id === fromLoteId)?.itens.find((b) => b.id === bemId);
      if (!item) return prev;
      return prev.map((l) => {
        if (l.id === fromLoteId) return { ...l, itens: l.itens.filter((b) => b.id !== bemId) };
        if (l.id === toLoteId) return { ...l, itens: [...l.itens, item] };
        return l;
      });
    });
    setMovingItem(null);
  };

  const handleRemoveLote = (loteId: string) => {
    const lote = lotes.find((l) => l.id === loteId);
    if (!lote || lote.itens.length > 0) {
      toast.error("Remova todos os itens do lote antes de excluí-lo.");
      return;
    }
    setLotes((prev) => prev.filter((l) => l.id !== loteId));
  };

  const handleAddLote = () => {
    if (!novaCategoria.trim()) {
      toast.error("Informe um nome para a categoria do novo lote.");
      return;
    }
    const maxNum = lotes.reduce((m, l) => Math.max(m, l.numero), 0);
    setLotes((prev) => [
      ...prev,
      {
        id: `lote-new-${Date.now()}`,
        numero: maxNum + 1,
        categoria: novaCategoria.trim(),
        itens: [],
      },
    ]);
    setNovaCategoria("");
    toast.success("Novo lote adicionado.");
  };

  const handleAprovar = async () => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const lotesComItens = lotes.filter((l) => l.itens.length > 0);
    if (lotesComItens.length === 0) {
      toast.error("Nenhum lote com itens para aprovar.");
      return;
    }

    setSaving(true);
    try {
      const { data: processo, error: procErr } = await supabase
        .from("processos")
        .insert({
          titulo: `Processo - ${fileName}`,
          orgao: "Não informado",
          user_id: user.id,
          total_bens: totalBens,
          total_lotes: lotesComItens.length,
          arrecadacao_estimada: totalValor,
          status: "revisao",
        })
        .select("id")
        .single();

      if (procErr) throw procErr;

      const bensToInsert = lotesComItens.flatMap((l) =>
        l.itens.map((b) => ({
          processo_id: processo.id,
          tombamento: b.tombamento,
          descricao: b.descricao,
          categoria: b.categoria,
          estado: b.estado,
          localizacao: b.localizacao,
          municipio: b.municipio,
          quantidade: b.quantidade,
          valor_estimado: b.valor,
        }))
      );

      const { data: bensInserted, error: bensErr } = await supabase
        .from("bens")
        .insert(bensToInsert)
        .select("id");

      if (bensErr) throw bensErr;

      let bemIdx = 0;
      for (const lote of lotesComItens) {
        const precoSugerido = lote.itens.reduce((s, b) => s + b.valor, 0);
        const { data: loteInserted, error: loteErr } = await supabase
          .from("lotes")
          .insert({
            processo_id: processo.id,
            numero: lote.numero,
            categoria: lote.categoria,
            preco_sugerido: precoSugerido,
            preco_aprovado: precoSugerido,
            status: "pendente",
          })
          .select("id")
          .single();

        if (loteErr) throw loteErr;

        const links = lote.itens.map((_, i) => ({
          lote_id: loteInserted.id,
          bem_id: bensInserted![bemIdx + i].id,
        }));
        bemIdx += lote.itens.length;

        const { error: linkErr } = await supabase.from("lotes_bens").insert(links);
        if (linkErr) throw linkErr;
      }

      toast.success("Lotes salvos com sucesso! Aprove-os na tela de Lotes Gerados.");
      navigate("/lotes");
    } catch (err: any) {
      console.error("Erro ao salvar lotes:", err);
      toast.error("Erro ao salvar: " + (err.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/novo-processo")} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground">Revisão de Lotes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalBens} bens · {lotes.length} lotes · Valor total:{" "}
            <strong className="text-success">
              R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </strong>
          </p>
        </div>
        <Button
          onClick={handleAprovar}
          disabled={saving}
          className="bg-success text-success-foreground hover:bg-success/90"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Salvar Lotes
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Nome da categoria do novo lote..."
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleAddLote()}
        />
        <Button variant="outline" size="sm" onClick={handleAddLote}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Lote
        </Button>
      </div>

      {/* Errors/Warnings from classification */}
      {(classificationResult.errosEncontrados.length > 0 || classificationResult.avisos.length > 0) && (
        <Card className="border-warning/30">
          <CardContent className="pt-4 space-y-2">
            {classificationResult.errosEncontrados.map((e, i) => (
              <p key={i} className="text-xs text-destructive">⚠ {e}</p>
            ))}
            {classificationResult.avisos.map((a, i) => (
              <p key={i} className="text-xs text-warning">ℹ {a}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {lotes.map((lote) => {
          const precoLote = lote.itens.reduce((s, b) => s + b.valor, 0);
          return (
            <Card key={lote.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Lote {lote.numero}
                    </Badge>
                    {lote.categoria}
                    <span className="text-muted-foreground font-normal text-sm">
                      ({lote.itens.length} {lote.itens.length === 1 ? "item" : "itens"})
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-success">
                      R$ {precoLote.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    {lote.itens.length === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveLote(lote.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {lote.itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Nenhum item neste lote. Mova itens de outros lotes ou exclua-o.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {lote.itens.map((bem) => (
                      <div
                        key={bem.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-transparent",
                          movingItem?.bemId === bem.id && "border-accent bg-accent/5"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{bem.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {bem.tombamento} · {bem.localizacao} · {bem.municipio && `${bem.municipio} · `}{bem.estado} · Qtd: {bem.quantidade}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-foreground shrink-0">
                          R$ {bem.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {movingItem?.bemId === bem.id ? (
                          <Select
                            onValueChange={(toLoteId) =>
                              handleMoveItem(bem.id, movingItem.fromLoteId, toLoteId)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue placeholder="Mover para..." />
                            </SelectTrigger>
                            <SelectContent>
                              {lotes
                                .filter((l) => l.id !== lote.id)
                                .map((l) => (
                                  <SelectItem key={l.id} value={l.id}>
                                    Lote {l.numero} - {l.categoria}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-7 w-7"
                            title="Mover para outro lote"
                            onClick={() => setMovingItem({ bemId: bem.id, fromLoteId: lote.id })}
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RevisaoLotes;
