import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BemComImagem {
  id: string;
  tombamento: string;
  descricao: string;
  imagem_url: string;
  lote_numero: number;
  lote_categoria: string;
}

const ProcessoImagens = () => {
  const { processoId } = useParams<{ processoId: string }>();

  const { data: processo } = useQuery({
    queryKey: ["processo-info", processoId],
    queryFn: async () => {
      if (!processoId) return null;
      const { data } = await supabase.from("processos").select("titulo").eq("id", processoId).single();
      return data;
    },
    enabled: !!processoId,
  });

  const { data: bens = [], isLoading } = useQuery<BemComImagem[]>({
    queryKey: ["processo-imagens", processoId],
    queryFn: async () => {
      if (!processoId) return [];

      const { data: lotes } = await supabase
        .from("lotes")
        .select("id, numero, categoria")
        .eq("processo_id", processoId);
      if (!lotes || lotes.length === 0) return [];

      const loteIds = lotes.map((l) => l.id);
      const lotesMap: Record<string, { numero: number; categoria: string }> = {};
      for (const l of lotes) lotesMap[l.id] = { numero: l.numero, categoria: l.categoria };

      const { data: lotesBens } = await supabase
        .from("lotes_bens")
        .select("lote_id, bem_id")
        .in("lote_id", loteIds);
      if (!lotesBens || lotesBens.length === 0) return [];

      const bemLoteMap: Record<string, string> = {};
      for (const lb of lotesBens) bemLoteMap[lb.bem_id] = lb.lote_id;

      const bemIds = [...new Set(lotesBens.map((lb) => lb.bem_id))];
      const { data: bensData } = await supabase
        .from("bens")
        .select("id, tombamento, descricao, imagem_url")
        .in("id", bemIds)
        .not("imagem_url", "is", null);

      return (bensData ?? [])
        .filter((b) => b.imagem_url)
        .map((b) => {
          const loteId = bemLoteMap[b.id];
          const lote = lotesMap[loteId];
          return {
            ...b,
            imagem_url: b.imagem_url!,
            lote_numero: lote?.numero ?? 0,
            lote_categoria: lote?.categoria ?? "",
          };
        })
        .sort((a, b) => a.lote_numero - b.lote_numero);
    },
    enabled: !!processoId,
  });

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/lotes">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Imagens — {processo?.titulo ?? "Processo"}
          </h1>
          <p className="text-sm text-muted-foreground">{bens.length} imagem(ns) encontrada(s)</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : bens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ImageOff className="w-12 h-12" />
          <p>Nenhuma imagem encontrada para este processo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bens.map((bem) => (
            <a
              key={bem.id}
              href={bem.imagem_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-border overflow-hidden bg-card hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-muted">
                <img
                  src={bem.imagem_url}
                  alt={bem.descricao}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-accent font-medium">Lote {bem.lote_numero} — {bem.lote_categoria}</p>
                <p className="text-xs font-mono text-muted-foreground">{bem.tombamento}</p>
                <p className="text-sm text-foreground truncate">{bem.descricao}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessoImagens;
