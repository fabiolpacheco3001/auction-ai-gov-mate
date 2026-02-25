import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

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

const APP_NAME = "Auction AI Gov Mate";
const dataGeracao = () => new Date().toLocaleDateString("pt-BR");
const footerText = () => `Documento gerado por ${APP_NAME} em ${dataGeracao()}`;

// ───── PDF Generation ─────

function addPdfHeader(doc: jsPDF) {
  // Header background
  doc.setFillColor(20, 60, 100);
  doc.rect(0, 0, 210, 28, "F");

  // App name (logo text)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(APP_NAME, 14, 12);

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", 14, 22);

  // Reset color
  doc.setTextColor(0, 0, 0);
}

function addPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    // Footer line
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 16, 196, pageHeight - 16);
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(footerText(), 14, pageHeight - 10);
    doc.text(`Página ${i} de ${pageCount}`, 196, pageHeight - 10, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

export function gerarPdf(processoTitulo: string, lotes: LoteComBens[]): jsPDF {
  const doc = new jsPDF();
  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  addPdfHeader(doc);

  // Process info below header
  doc.setFontSize(10);
  doc.text(`Processo: ${processoTitulo}`, 14, 36);
  doc.text(`Data de Geração: ${dataGeracao()}`, 14, 42);
  doc.text(`Total de Lotes: ${lotes.length}`, 14, 48);
  doc.text(`Valor Total Aprovado: ${currency(totalAprovado)}`, 14, 54);

  let startY = 62;

  for (const lote of lotes) {
    if (startY > 240) {
      doc.addPage();
      addPdfHeader(doc);
      startY = 36;
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
      margin: { left: 14, right: 14, bottom: 24 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  addPdfFooter(doc);
  return doc;
}

export function downloadPdf(processoTitulo: string, lotes: LoteComBens[]) {
  const doc = gerarPdf(processoTitulo, lotes);
  doc.save(`composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ───── XLSX Generation ─────

export async function downloadXlsx(processoTitulo: string, lotes: LoteComBens[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Composição de Lotes");
  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  // Column widths
  ws.columns = [
    { width: 22 },
    { width: 48 },
    { width: 10 },
    { width: 16 },
    { width: 18 },
  ];

  const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2980B9" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
  const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 14 };
  const loteFont: Partial<ExcelJS.Font> = { bold: true, size: 12 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // ── Header with app name
  const headerBgFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF143C64" } };
  const headerWhiteFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  const subHeaderFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, size: 10 };

  const appRow = ws.addRow([APP_NAME]);
  appRow.getCell(1).font = headerWhiteFont;
  appRow.getCell(1).fill = headerBgFill;
  ws.mergeCells(appRow.number, 1, appRow.number, 5);
  for (let c = 2; c <= 5; c++) appRow.getCell(c).fill = headerBgFill;

  const docTitleRow = ws.addRow(["DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO"]);
  docTitleRow.getCell(1).font = subHeaderFont;
  docTitleRow.getCell(1).fill = headerBgFill;
  ws.mergeCells(docTitleRow.number, 1, docTitleRow.number, 5);
  for (let c = 2; c <= 5; c++) docTitleRow.getCell(c).fill = headerBgFill;

  ws.addRow([]);

  // ── Header info
  const infoRows = [
    ["Processo:", processoTitulo],
    ["Data de Geração:", dataGeracao()],
    ["Total de Lotes:", String(lotes.length)],
    ["Valor Total Aprovado:", currency(totalAprovado)],
  ];
  for (const r of infoRows) {
    const row = ws.addRow(r);
    row.getCell(1).font = boldFont;
  }
  ws.addRow([]);

  // ── Per-lot sections
  for (const lote of lotes) {
    const loteRow = ws.addRow([`Lote ${String(lote.numero).padStart(3, "0")} — ${lote.categoria}`]);
    loteRow.getCell(1).font = loteFont;
    ws.mergeCells(loteRow.number, 1, loteRow.number, 5);
    const loteHeaderBg: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
    for (let c = 1; c <= 5; c++) loteRow.getCell(c).fill = loteHeaderBg;

    const valRow = ws.addRow(["Valor Aprovado:", currency(lote.preco_aprovado ?? lote.preco_sugerido), "", "Itens:", String(lote.bens.length)]);
    valRow.getCell(1).font = boldFont;
    valRow.getCell(4).font = boldFont;

    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      const locRow = ws.addRow(["Local(is) de Retirada:", locations.join("; ")]);
      locRow.getCell(1).font = boldFont;
    }

    const thRow = ws.addRow(["Tombamento", "Descrição", "Qtd", "Estado", "Valor Est."]);
    for (let c = 1; c <= 5; c++) {
      const cell = thRow.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }

    for (const item of lote.bens) {
      const dr = ws.addRow([
        item.tombamento || "—",
        item.descricao || "—",
        item.quantidade,
        estadoLabels[item.estado] ?? item.estado,
        currency(item.valor_estimado),
      ]);
      for (let c = 1; c <= 5; c++) {
        dr.getCell(c).border = thinBorder;
      }
      dr.getCell(3).alignment = { horizontal: "center" };
      dr.getCell(5).alignment = { horizontal: "right" };
    }

    ws.addRow([]);
  }

  // ── Footer
  ws.addRow([]);
  const ftRow = ws.addRow([footerText()]);
  ftRow.getCell(1).font = { italic: true, size: 9, color: { argb: "FF666666" } };
  ws.mergeCells(ftRow.number, 1, ftRow.number, 5);

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ───── DOCX Generation ─────

export async function downloadDocx(processoTitulo: string, lotes: LoteComBens[]) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer } = await import("docx");

  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  const children: any[] = [];

  // Process info
  const infoLines = [
    `Processo: ${processoTitulo}`,
    `Data de Geração: ${dataGeracao()}`,
    `Total de Lotes: ${lotes.length}`,
    `Valor Total Aprovado: ${currency(totalAprovado)}`,
  ];
  for (const line of infoLines) {
    const [label, ...rest] = line.split(": ");
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20 }),
        new TextRun({ text: rest.join(": "), size: 20 }),
      ],
    }));
  }

  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  const cellBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

  for (const lote of lotes) {
    children.push(new Paragraph({
      spacing: { before: 300, after: 100 },
      shading: { type: ShadingType.SOLID, color: "E8F0FE" },
      children: [new TextRun({ text: `Lote ${String(lote.numero).padStart(3, "0")} — ${lote.categoria}`, bold: true, size: 24 })],
    }));

    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: "Valor Aprovado: ", bold: true, size: 20 }),
        new TextRun({ text: currency(lote.preco_aprovado ?? lote.preco_sugerido), size: 20 }),
        new TextRun({ text: "    Itens: ", bold: true, size: 20 }),
        new TextRun({ text: String(lote.bens.length), size: 20 }),
      ],
    }));

    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Local(is) de Retirada: ", bold: true, size: 20 }),
          new TextRun({ text: locations.join("; "), size: 20 }),
        ],
      }));
    }

    const headerCells = ["Tombamento", "Descrição", "Qtd", "Estado", "Valor Est."].map(
      (h) => new TableCell({
        shading: { type: ShadingType.SOLID, color: "2980B9" },
        borders: cellBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })] })],
      })
    );

    const dataRows = lote.bens.map((item) => {
      const vals = [
        item.tombamento || "—",
        item.descricao || "—",
        String(item.quantidade),
        estadoLabels[item.estado] ?? item.estado,
        currency(item.valor_estimado),
      ];
      return new TableRow({
        children: vals.map((v, i) => new TableCell({
          borders: cellBorders,
          children: [new Paragraph({
            alignment: i === 2 ? AlignmentType.CENTER : i === 4 ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: v, size: 18 })],
          })],
        })),
      });
    });

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    }));

    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              shading: { type: ShadingType.SOLID, color: "143C64" },
              spacing: { after: 40 },
              children: [new TextRun({ text: APP_NAME, bold: true, color: "FFFFFF", size: 28 })],
            }),
            new Paragraph({
              shading: { type: ShadingType.SOLID, color: "143C64" },
              children: [new TextRun({ text: "DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", color: "FFFFFF", size: 20 })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: footerText(), italics: true, size: 16, color: "666666" })],
            }),
          ],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  a.download = `composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
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
