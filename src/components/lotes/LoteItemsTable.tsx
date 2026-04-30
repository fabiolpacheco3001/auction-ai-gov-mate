import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoveRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const estadoLabels: Record<string, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  inservivel: "Inservível",
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
  imagem_url: string | null;
}

interface OtherLote {
  id: string;
  numero: number;
  categoria: string;
}

interface LoteItemsTableProps {
  bens: Bem[];
  loteId: string;
  isApproved?: boolean;
  otherLotes?: OtherLote[];
  onMoveItem?: (bemId: string, targetLoteId: string) => void;
}

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const calcValorSugerido = (bem: Bem): number => {
  const values = [
    bem.valor_estimado,
    bem.valor_medio_site1,
    bem.valor_medio_site2,
    bem.valor_medio_site3,
  ].filter((v): v is number => v != null && v > 0);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const LoteItemsTable = ({ bens, loteId, isApproved, otherLotes, onMoveItem }: LoteItemsTableProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const showMoveColumn = !isApproved && otherLotes && otherLotes.length > 0 && onMoveItem;

  const startEdit = (bem: Bem) => {
    setEditingId(bem.id);
    const val = bem.valor_sugerido ?? calcValorSugerido(bem);
    setEditValue(val.toFixed(2));
  };

  const saveEdit = async (bemId: string, bens: Bem[]) => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      await supabase.from("bens").update({ valor_sugerido: numValue }).eq("id", bemId);

      // Recalculate lote price
      const updatedBens = bens.map((b) =>
        b.id === bemId ? { ...b, valor_sugerido: numValue } : b
      );
      const newPrice = updatedBens.reduce((sum, b) => {
        const vs = b.valor_sugerido ?? calcValorSugerido(b);
        return sum + b.quantidade * vs;
      }, 0);

      await supabase.from("lotes").update({ preco_sugerido: newPrice }).eq("id", loteId);
      queryClient.invalidateQueries({ queryKey: ["lotes-by-processo"] });
      toast.success("Valor sugerido atualizado e preço do lote recalculado!");
    }
    setEditingId(null);
  };

  const formatVal = (v: number | null) =>
    v != null ? currency(v) : <span className="text-muted-foreground">—</span>;

  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/30">
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-12">Foto</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Código do Bem</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Descrição</th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Qtd</th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Estado</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Localização</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Município</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Valor Est.</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">V. Médio Site 1</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">V. Médio Site 2</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">V. Médio Site 3</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Valor Sugerido</th>
            {showMoveColumn && (
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Ações</th>
            )}
          </tr>
        </thead>
        <tbody>
          {bens.map((item) => {
            const computedSugerido = item.valor_sugerido ?? calcValorSugerido(item);
            const isEditing = editingId === item.id;

            return (
              <tr key={item.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-center">
                  {item.imagem_url ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <a href={item.imagem_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <img src={item.imagem_url} alt={item.descricao} className="w-8 h-8 rounded object-cover inline-block hover:opacity-80 transition-opacity" loading="lazy" />
                        </a>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 p-1" side="right">
                        <img src={item.imagem_url} alt={item.descricao} className="w-full h-auto rounded object-contain" />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-muted-foreground">{item.tombamento}</td>
                <td className="px-4 py-2.5 text-sm text-foreground max-w-[200px] truncate">{item.descricao}</td>
                <td className="px-4 py-2.5 text-sm text-center text-foreground">{item.quantidade}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                    item.estado === "bom" ? "bg-success/10 text-success" :
                    item.estado === "regular" ? "bg-info/10 text-info" :
                    item.estado === "ruim" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {estadoLabels[item.estado] ?? item.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{item.localizacao}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{item.municipio}</td>
                <td className="px-4 py-2.5 text-sm text-right font-medium text-foreground">{currency(item.valor_estimado)}</td>
                <td className="px-4 py-2.5 text-sm text-right text-foreground">{formatVal(item.valor_medio_site1)}</td>
                <td className="px-4 py-2.5 text-sm text-right text-foreground">{formatVal(item.valor_medio_site2)}</td>
                <td className="px-4 py-2.5 text-sm text-right text-foreground">{formatVal(item.valor_medio_site3)}</td>
                <td className="px-4 py-2.5 text-sm text-right font-semibold text-accent">
                  {isEditing && !isApproved ? (
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">R$</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id, bens)}
                        onBlur={() => saveEdit(item.id, bens)}
                        className="w-24 px-2 py-1 text-sm font-semibold text-foreground border border-border rounded bg-background text-right focus:ring-2 focus:ring-accent/30 outline-none"
                        autoFocus
                      />
                    </div>
                  ) : isApproved ? (
                    <span>{currency(computedSugerido)}</span>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                      title="Clique para editar"
                    >
                      {currency(computedSugerido)}
                    </span>
                  )}
                </td>
                {showMoveColumn && (
                  <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <Select onValueChange={(targetLoteId) => onMoveItem!(item.id, targetLoteId)}>
                      <SelectTrigger className="w-[120px] h-7 text-xs mx-auto">
                        <MoveRight className="w-3 h-3 mr-1 shrink-0" />
                        <SelectValue placeholder="Mover para" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherLotes!.map((ol) => (
                          <SelectItem key={ol.id} value={ol.id}>
                            Lote {ol.numero} — {ol.categoria}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export { calcValorSugerido };
export type { Bem };
export default LoteItemsTable;
