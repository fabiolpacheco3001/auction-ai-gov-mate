import { supabase } from "@/integrations/supabase/client";

interface Bem {
  id: string;
  descricao: string;
  tombamento: string;
  quantidade: number;
  estado: string;
  localizacao: string;
  municipio: string;
  valor_estimado: number;
  categoria: string;
}

interface LoteComBens {
  id: string;
  numero: number;
  categoria: string;
  preco_sugerido: number;
  preco_aprovado: number | null;
  bens: Bem[];
}

export async function gerarDocumentoLotes(processoId: string, processoTitulo: string) {
  // Fetch lotes do processo
  const { data: lotesData } = await supabase
    .from("lotes")
    .select("*")
    .eq("processo_id", processoId)
    .order("numero");

  if (!lotesData || lotesData.length === 0) return null;

  // Fetch bens
  const loteIds = lotesData.map((l) => l.id);
  const { data: lotesBens } = await supabase
    .from("lotes_bens")
    .select("lote_id, bem_id")
    .in("lote_id", loteIds);

  const allBemIds = [...new Set((lotesBens ?? []).map((lb) => lb.bem_id))];
  let bensMap: Record<string, Bem> = {};
  if (allBemIds.length > 0) {
    const { data: bensData } = await supabase.from("bens").select("*").in("id", allBemIds);
    for (const b of bensData ?? []) {
      bensMap[b.id] = { ...b, valor_estimado: Number(b.valor_estimado), quantidade: Number(b.quantidade ?? 1) };
    }
  }

  const bemIdsByLote: Record<string, string[]> = {};
  for (const lb of lotesBens ?? []) {
    if (!bemIdsByLote[lb.lote_id]) bemIdsByLote[lb.lote_id] = [];
    bemIdsByLote[lb.lote_id].push(lb.bem_id);
  }

  const lotes: LoteComBens[] = lotesData.map((l) => ({
    id: l.id,
    numero: l.numero,
    categoria: l.categoria,
    preco_sugerido: Number(l.preco_sugerido),
    preco_aprovado: l.preco_aprovado ? Number(l.preco_aprovado) : null,
    bens: (bemIdsByLote[l.id] ?? []).map((id) => bensMap[id]).filter(Boolean),
  }));

  // Insert document record
  const { data: doc, error } = await supabase.from("documentos").insert({
    nome: `Composição de Lotes - ${processoTitulo}`,
    processo_id: processoId,
    processo_titulo: processoTitulo,
    tipo: "Composição de Lotes",
    status: "finalizado",
  }).select().single();

  if (error) throw error;

  return { doc, lotes };
}

const estadoLabels: Record<string, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  inservivel: "Inservível",
};

export function gerarConteudoDocumento(processoTitulo: string, lotes: LoteComBens[]): string {
  const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("           DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Processo: ${processoTitulo}`);
  lines.push(`Data de Geração: ${new Date().toLocaleDateString("pt-BR")}`);
  lines.push(`Total de Lotes: ${lotes.length}`);
  lines.push(`Valor Total Aprovado: ${currency(lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0))}`);
  lines.push("");

  for (const lote of lotes) {
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push(`LOTE ${String(lote.numero).padStart(3, "0")} — ${lote.categoria}`);
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push(`  Valor Aprovado: ${currency(lote.preco_aprovado ?? lote.preco_sugerido)}`);
    lines.push(`  Total de Itens: ${lote.bens.length}`);

    // Locations
    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      lines.push(`  Local(is) de Retirada:`);
      for (const loc of locations) {
        lines.push(`    • ${loc}`);
      }
    }

    lines.push("");
    lines.push("  ITENS DO LOTE:");
    lines.push("  ┌─────────────────┬────────────────────────────────────────┬─────┬────────────┬──────────────┐");
    lines.push("  │ Tombamento      │ Descrição                              │ Qtd │ Estado     │ Valor Est.   │");
    lines.push("  ├─────────────────┼────────────────────────────────────────┼─────┼────────────┼──────────────┤");

    for (const item of lote.bens) {
      const tomb = (item.tombamento || "—").padEnd(15).slice(0, 15);
      const desc = (item.descricao || "—").padEnd(38).slice(0, 38);
      const qtd = String(item.quantidade).padStart(3);
      const estado = (estadoLabels[item.estado] ?? item.estado).padEnd(10).slice(0, 10);
      const valor = currency(item.valor_estimado).padStart(12);
      lines.push(`  │ ${tomb} │ ${desc} │ ${qtd} │ ${estado} │ ${valor} │`);
    }

    lines.push("  └─────────────────┴────────────────────────────────────────┴─────┴────────────┴──────────────┘");
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    FIM DO DOCUMENTO");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

export function downloadDocumentoTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
