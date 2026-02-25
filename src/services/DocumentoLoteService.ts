import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface Bem {
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

export interface LoteComBens {
  id: string;
  numero: number;
  categoria: string;
  preco_sugerido: number;
  preco_aprovado: number | null;
  bens: Bem[];
}

export async function fetchLotesComBens(processoId: string) {
  const { data: lotesData } = await supabase
    .from("lotes")
    .select("*")
    .eq("processo_id", processoId)
    .order("numero");

  if (!lotesData || lotesData.length === 0) return null;

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

  return lotes;
}

export async function gerarDocumentoLotes(processoId: string, processoTitulo: string) {
  const lotes = await fetchLotesComBens(processoId);
  if (!lotes) return null;

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

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ───── PDF Generation ─────

export function gerarPdf(processoTitulo: string, lotes: LoteComBens[]): jsPDF {
  const doc = new jsPDF();
  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  // Header
  doc.setFontSize(16);
  doc.text("DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Processo: ${processoTitulo}`, 14, 32);
  doc.text(`Data de Geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 38);
  doc.text(`Total de Lotes: ${lotes.length}`, 14, 44);
  doc.text(`Valor Total Aprovado: ${currency(totalAprovado)}`, 14, 50);

  let startY = 58;

  for (const lote of lotes) {
    // Check if we need a new page
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Lote ${String(lote.numero).padStart(3, "0")} — ${lote.categoria}`, 14, startY);
    startY += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Valor Aprovado: ${currency(lote.preco_aprovado ?? lote.preco_sugerido)}  |  Itens: ${lote.bens.length}`, 14, startY);
    startY += 4;

    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      doc.text(`Local(is) de Retirada: ${locations.join("; ")}`, 14, startY);
      startY += 5;
    }

    autoTable(doc, {
      startY,
      head: [["Tombamento", "Descrição", "Qtd", "Estado", "Valor Est."]],
      body: lote.bens.map((item) => [
        item.tombamento || "—",
        item.descricao || "—",
        String(item.quantidade),
        estadoLabels[item.estado] ?? item.estado,
        currency(item.valor_estimado),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  return doc;
}

export function downloadPdf(processoTitulo: string, lotes: LoteComBens[]) {
  const doc = gerarPdf(processoTitulo, lotes);
  doc.save(`composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ───── XLSX Generation ─────

export function downloadXlsx(processoTitulo: string, lotes: LoteComBens[]) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = lotes.map((l) => ({
    "Lote": l.numero,
    "Categoria": l.categoria,
    "Qtd Itens": l.bens.length,
    "Preço Sugerido": l.preco_sugerido,
    "Preço Aprovado": l.preco_aprovado ?? l.preco_sugerido,
    "Locais de Retirada": [...new Set(l.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))].join("; "),
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

  // Detail sheet with all items
  const detailData = lotes.flatMap((l) =>
    l.bens.map((item) => ({
      "Lote": l.numero,
      "Categoria": l.categoria,
      "Tombamento": item.tombamento || "—",
      "Descrição": item.descricao,
      "Quantidade": item.quantidade,
      "Estado": estadoLabels[item.estado] ?? item.estado,
      "Localização": item.localizacao,
      "Município": item.municipio,
      "Valor Estimado": item.valor_estimado,
    }))
  );
  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, "Itens");

  XLSX.writeFile(wb, `composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}

// ───── Legacy TXT (kept for backwards compat) ─────

export function gerarConteudoDocumento(processoTitulo: string, lotes: LoteComBens[]): string {
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

    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      lines.push(`  Local(is) de Retirada:`);
      for (const loc of locations) lines.push(`    • ${loc}`);
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
