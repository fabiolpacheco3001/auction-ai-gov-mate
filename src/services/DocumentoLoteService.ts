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
  imagem_url: string | null;
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
      bensMap[b.id] = { ...b, valor_estimado: Number(b.valor_estimado), quantidade: Number(b.quantidade ?? 1), imagem_url: b.imagem_url ?? null };
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

/** Build the display label for a processo, e.g. "001/2026 - SIGLA - Título" */
export async function fetchProcessoLabel(processoId: string): Promise<string> {
  const { data } = await supabase
    .from("processos")
    .select("titulo, numero, created_at, orgaos:orgao_id(sigla)")
    .eq("id", processoId)
    .single();
  if (!data) return "";
  const p = data as any;
  const sigla = p.orgaos?.sigla ?? "";
  if (p.numero && p.created_at) {
    const year = new Date(p.created_at).getFullYear();
    const num = String(p.numero).padStart(3, "0");
    return `${num}/${year}${sigla ? ` - ${sigla}` : ""} - ${p.titulo}`;
  }
  return `${sigla ? `${sigla} - ` : ""}${p.titulo}`;
}

export async function gerarDocumentoLotes(processoId: string, processoTitulo: string) {
  const lotes = await fetchLotesComBens(processoId);
  if (!lotes) return null;

  const label = await fetchProcessoLabel(processoId);

  const { data: doc, error } = await supabase.from("documentos").insert({
    nome: `Composição de Lotes - ${label || processoTitulo}`,
    processo_id: processoId,
    processo_titulo: label || processoTitulo,
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

const APP_NAME = "AlienaGov";
const APP_FOOTER_NAME = "AlienaGov";
const dataGeracao = () => new Date().toLocaleDateString("pt-BR");
const footerText = () => `Documento gerado por ${APP_FOOTER_NAME} em ${dataGeracao()}`;

// ── Fetch logo URL from configuracao_sistema
async function fetchLogoUrl(): Promise<string | null> {
  const { data } = await supabase
    .from("configuracao_sistema")
    .select("logo_url")
    .eq("id", "config-1")
    .maybeSingle();
  return (data as any)?.logo_url ?? null;
}

// ── Load image as base64 data URL for embedding (converts SVG to PNG via canvas)
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const isSvg = blob.type === "image/svg+xml" || url.toLowerCase().endsWith(".svg");

    if (isSvg) {
      const svgText = await blob.text();
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = 2;
          canvas.width = img.width * scale || 400;
          canvas.height = img.height * scale || 100;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, img.width || 200, img.height || 50);
          }
          URL.revokeObjectURL(svgUrl);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        };
        img.src = svgUrl;
      });
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Get image dimensions
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 100, height: 100 });
    img.src = dataUrl;
  });
}

// ── Fit dimensions inside a max bounding box, preserving aspect ratio. Never upscale.
function fitDimensions(
  origW: number, origH: number, maxW: number, maxH: number
): { width: number; height: number } {
  if (origW <= maxW && origH <= maxH) return { width: origW, height: origH };
  const scale = Math.min(maxW / origW, maxH / origH);
  return { width: Math.round(origW * scale), height: Math.round(origH * scale) };
}

// ── Pre-load item images as base64 (only for items that have imagem_url)
async function preloadItemImages(lotes: LoteComBens[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const promises: Promise<void>[] = [];
  for (const lote of lotes) {
    for (const bem of lote.bens) {
      if (bem.imagem_url) {
        promises.push(
          loadImageAsBase64(bem.imagem_url).then((b64) => {
            if (b64) map[bem.id] = b64;
          })
        );
      }
    }
  }
  await Promise.all(promises);
  return map;
}

// ───── PDF Generation ─────

function addPdfHeader(doc: jsPDF, logoDataUrl?: string | null, logoDims?: { width: number; height: number } | null) {
  const pageWidth = 210;
  doc.setFillColor(20, 60, 100);
  doc.rect(0, 0, pageWidth, 32, "F");

  if (logoDataUrl && logoDims) {
    // Fit logo inside max box (40mm x 16mm), preserving aspect ratio, no upscale
    const fitted = fitDimensions(logoDims.width, logoDims.height, 40, 16);
    // Convert pixel dims to mm (approximate: assume 96dpi → 1px ≈ 0.264mm)
    // But logoDims here are already in a reasonable mm-like scale from the caller
    const logoX = (pageWidth - fitted.width) / 2;
    const logoY = 3 + (16 - fitted.height) / 2; // center vertically in the 16mm space
    try {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, fitted.width, fitted.height, undefined, "FAST");
    } catch { /* fallback to text */ }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", pageWidth / 2, 26, { align: "center" });
  } else {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("\u2696 " + APP_NAME, pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", pageWidth / 2, 22, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
}

function addPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 16, 196, pageHeight - 16);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(footerText(), 14, pageHeight - 10);
    doc.text(`Página ${i} de ${pageCount}`, 196, pageHeight - 10, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

export async function gerarPdf(processoTitulo: string, lotes: LoteComBens[]): Promise<jsPDF> {
  const doc = new jsPDF();
  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  const logoUrl = await fetchLogoUrl();
  const logoDataUrl = logoUrl ? await loadImageAsBase64(logoUrl) : null;

  // Calculate logo dimensions in mm for PDF, preserving aspect ratio
  let logoDimsMm: { width: number; height: number } | null = null;
  if (logoDataUrl) {
    const dims = await getImageDimensions(logoDataUrl);
    // Convert pixels to mm (96dpi → 1px ≈ 0.264mm)
    const pxToMm = 0.264;
    const origWMm = dims.width * pxToMm;
    const origHMm = dims.height * pxToMm;
    logoDimsMm = fitDimensions(origWMm, origHMm, 40, 16);
  }

  // Preload item images
  const itemImages = await preloadItemImages(lotes);

  addPdfHeader(doc, logoDataUrl, logoDimsMm);

  doc.setFontSize(10);
  doc.text(`Processo: ${processoTitulo}`, 14, 40);
  doc.text(`Data de Geração: ${dataGeracao()}`, 14, 46);
  doc.text(`Total de Lotes: ${lotes.length}`, 14, 52);
  doc.text(`Valor Total Aprovado: ${currency(totalAprovado)}`, 14, 58);

  let startY = 66;

  for (const lote of lotes) {
    if (startY > 240) {
      doc.addPage();
      addPdfHeader(doc, logoDataUrl, logoDimsMm);
      startY = 40;
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

    // Check if any item has image
    const hasImages = lote.bens.some((b) => itemImages[b.id]);

    if (hasImages) {
      autoTable(doc, {
        startY,
        head: [["Imagem", "Tombamento", "Descrição", "Qtd", "Estado"]],
        body: lote.bens.map((item) => [
          "", // placeholder for image
          item.tombamento || "—",
          item.descricao || "—",
          String(item.quantidade),
          estadoLabels[item.estado] ?? item.estado,
        ]),
        columnStyles: {
          0: { cellWidth: 22, minCellHeight: 18 },
        },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14, bottom: 24 },
        didDrawCell: (data: any) => {
          if (data.section === "body" && data.column.index === 0) {
            const bem = lote.bens[data.row.index];
            const imgData = bem ? itemImages[bem.id] : null;
            if (imgData) {
              try {
                doc.addImage(imgData, "JPEG", data.cell.x + 1, data.cell.y + 1, 16, 16, undefined, "FAST");
              } catch { /* ignore */ }
            }
          }
        },
      });
    } else {
      autoTable(doc, {
        startY,
        head: [["Tombamento", "Descrição", "Qtd", "Estado"]],
        body: lote.bens.map((item) => [
          item.tombamento || "—",
          item.descricao || "—",
          String(item.quantidade),
          estadoLabels[item.estado] ?? item.estado,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14, bottom: 24 },
      });
    }

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  addPdfFooter(doc);
  return doc;
}

export async function downloadPdf(processoTitulo: string, lotes: LoteComBens[]) {
  const doc = await gerarPdf(processoTitulo, lotes);
  doc.save(`composicao-lotes-${processoTitulo.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ───── XLSX Generation ─────

export async function downloadXlsx(processoTitulo: string, lotes: LoteComBens[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Composição de Lotes");
  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  // Preload item images
  const itemImages = await preloadItemImages(lotes);

  const hasAnyImage = Object.keys(itemImages).length > 0;
  const colCount = hasAnyImage ? 5 : 4;

  if (hasAnyImage) {
    ws.columns = [
      { width: 12 }, // Imagem
      { width: 22 },
      { width: 52 },
      { width: 10 },
      { width: 18 },
    ];
  } else {
    ws.columns = [
      { width: 22 },
      { width: 52 },
      { width: 10 },
      { width: 18 },
    ];
  }

  const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2980B9" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
  const loteFont: Partial<ExcelJS.Font> = { bold: true, size: 12 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  const headerBgFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF143C64" } };
  const headerWhiteFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  const subHeaderFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, size: 10 };

  // Try to add logo image
  const logoUrl = await fetchLogoUrl();
  let logoImageId: number | null = null;
  let logoNaturalDims = { width: 160, height: 45 };

  if (logoUrl) {
    try {
      const logoDataUrl = await loadImageAsBase64(logoUrl);
      if (logoDataUrl) {
        const dims = await getImageDimensions(logoDataUrl);
        // Fit within max 160x45 without upscaling
        logoNaturalDims = fitDimensions(dims.width, dims.height, 160, 45);
        const base64Data = logoDataUrl.split(",")[1];
        const ext = logoDataUrl.includes("image/png") ? "png" as const : "jpeg" as const;
        logoImageId = wb.addImage({ base64: base64Data, extension: ext });
      }
    } catch { /* ignore */ }
  }

  if (logoImageId !== null) {
    const logoRow = ws.addRow([""]);
    logoRow.height = 50;
    for (let c = 1; c <= colCount; c++) logoRow.getCell(c).fill = headerBgFill;
    ws.mergeCells(logoRow.number, 1, logoRow.number, colCount);

    ws.addImage(logoImageId, {
      tl: { col: 1, row: logoRow.number - 1 + 0.1 },
      ext: { width: logoNaturalDims.width, height: logoNaturalDims.height },
    });
  } else {
    const appRow = ws.addRow(["\u2696 " + APP_NAME]);
    appRow.getCell(1).font = headerWhiteFont;
    appRow.getCell(1).fill = headerBgFill;
    appRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(appRow.number, 1, appRow.number, colCount);
    for (let c = 2; c <= colCount; c++) appRow.getCell(c).fill = headerBgFill;
  }

  const docTitleRow = ws.addRow(["DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO"]);
  docTitleRow.getCell(1).font = subHeaderFont;
  docTitleRow.getCell(1).fill = headerBgFill;
  docTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(docTitleRow.number, 1, docTitleRow.number, colCount);
  for (let c = 2; c <= colCount; c++) docTitleRow.getCell(c).fill = headerBgFill;

  ws.addRow([]);

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

  for (const lote of lotes) {
    const loteRow = ws.addRow([`Lote ${String(lote.numero).padStart(3, "0")} — ${lote.categoria}`]);
    loteRow.getCell(1).font = loteFont;
    ws.mergeCells(loteRow.number, 1, loteRow.number, colCount);
    const loteHeaderBg: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
    for (let c = 1; c <= colCount; c++) loteRow.getCell(c).fill = loteHeaderBg;

    const valRow = ws.addRow(["Valor Aprovado:", currency(lote.preco_aprovado ?? lote.preco_sugerido), "Itens:", String(lote.bens.length)]);
    valRow.getCell(1).font = boldFont;
    valRow.getCell(3).font = boldFont;

    const locations = [...new Set(lote.bens.map((b) => `${b.localizacao}${b.municipio ? ` - ${b.municipio}` : ""}`).filter(Boolean))];
    if (locations.length > 0) {
      const locRow = ws.addRow(["Local(is) de Retirada:", locations.join("; ")]);
      locRow.getCell(1).font = boldFont;
    }

    const headers = hasAnyImage ? ["Imagem", "Tombamento", "Descrição", "Qtd", "Estado"] : ["Tombamento", "Descrição", "Qtd", "Estado"];
    const thRow = ws.addRow(headers);
    for (let c = 1; c <= colCount; c++) {
      const cell = thRow.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }

    for (const item of lote.bens) {
      const rowData = hasAnyImage
        ? ["", item.tombamento || "—", item.descricao || "—", item.quantidade, estadoLabels[item.estado] ?? item.estado]
        : [item.tombamento || "—", item.descricao || "—", item.quantidade, estadoLabels[item.estado] ?? item.estado];
      const dr = ws.addRow(rowData);
      for (let c = 1; c <= colCount; c++) {
        dr.getCell(c).border = thinBorder;
      }
      const qtyCol = hasAnyImage ? 4 : 3;
      dr.getCell(qtyCol).alignment = { horizontal: "center" };

      // Add image if available
      if (hasAnyImage && itemImages[item.id]) {
        try {
          const imgB64 = itemImages[item.id].split(",")[1];
          const imgExt = itemImages[item.id].includes("image/png") ? "png" as const : "jpeg" as const;
          const imgId = wb.addImage({ base64: imgB64, extension: imgExt });
          dr.height = 50;
          ws.addImage(imgId, {
            tl: { col: 0, row: dr.number - 1 + 0.1 },
            ext: { width: 60, height: 45 },
          });
        } catch { /* ignore */ }
      }
    }

    ws.addRow([]);
  }

  ws.addRow([]);
  const ftRow = ws.addRow([footerText()]);
  ftRow.getCell(1).font = { italic: true, size: 9, color: { argb: "FF666666" } };
  ws.mergeCells(ftRow.number, 1, ftRow.number, colCount);

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
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, ImageRun } = await import("docx");

  const totalAprovado = lotes.reduce((s, l) => s + (l.preco_aprovado ?? l.preco_sugerido), 0);

  // Load logo for DOCX
  const logoUrl = await fetchLogoUrl();
  let logoBuffer: ArrayBuffer | null = null;
  let logoDims = { width: 150, height: 50 };

  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      logoBuffer = await response.arrayBuffer();
      const dataUrl = await loadImageAsBase64(logoUrl);
      if (dataUrl) {
        const dims = await getImageDimensions(dataUrl);
        // Fit within max 150x50, preserving aspect ratio, no upscale
        logoDims = fitDimensions(dims.width, dims.height, 150, 50);
      }
    } catch { logoBuffer = null; }
  }

  // Preload item images for DOCX
  const itemImageBuffers: Record<string, { buffer: ArrayBuffer; dims: { width: number; height: number } }> = {};
  for (const lote of lotes) {
    for (const bem of lote.bens) {
      if (bem.imagem_url) {
        try {
          const resp = await fetch(bem.imagem_url);
          const buf = await resp.arrayBuffer();
          const dataUrl = await loadImageAsBase64(bem.imagem_url);
          if (dataUrl) {
            const dims = await getImageDimensions(dataUrl);
            const fitted = fitDimensions(dims.width, dims.height, 60, 60);
            itemImageBuffers[bem.id] = { buffer: buf, dims: fitted };
          }
        } catch { /* ignore */ }
      }
    }
  }

  const children: any[] = [];

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

    const hasImages = lote.bens.some((b) => itemImageBuffers[b.id]);

    const headerTexts = hasImages ? ["Imagem", "Tombamento", "Descrição", "Qtd", "Estado"] : ["Tombamento", "Descrição", "Qtd", "Estado"];
    const headerCells = headerTexts.map(
      (h) => new TableCell({
        shading: { type: ShadingType.SOLID, color: "2980B9" },
        borders: cellBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })] })],
      })
    );

    const dataRows = lote.bens.map((item) => {
      const cells: any[] = [];

      if (hasImages) {
        const imgData = itemImageBuffers[item.id];
        if (imgData) {
          cells.push(new TableCell({
            borders: cellBorders,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({
                data: imgData.buffer,
                transformation: { width: imgData.dims.width, height: imgData.dims.height },
                type: "png",
              })],
            })],
          }));
        } else {
          cells.push(new TableCell({
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "—", size: 18 })] })],
          }));
        }
      }

      const vals = [
        item.tombamento || "—",
        item.descricao || "—",
        String(item.quantidade),
        estadoLabels[item.estado] ?? item.estado,
      ];
      for (let i = 0; i < vals.length; i++) {
        cells.push(new TableCell({
          borders: cellBorders,
          children: [new Paragraph({
            alignment: i === 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: vals[i], size: 18 })],
          })],
        }));
      }

      return new TableRow({ children: cells });
    });

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    }));

    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // Build header children
  const headerChildren: any[] = [];

  if (logoBuffer) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: "143C64" },
      spacing: { after: 40 },
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: logoDims.width, height: logoDims.height },
          type: "png",
        }),
      ],
    }));
  } else {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: "143C64" },
      spacing: { after: 40 },
      children: [new TextRun({ text: "\u2696 " + APP_NAME, bold: true, color: "FFFFFF", size: 28 })],
    }));
  }

  headerChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, color: "143C64" },
    children: [new TextRun({ text: "DOCUMENTO DE COMPOSIÇÃO DE LOTES PARA LEILÃO", color: "FFFFFF", size: 20 })],
  }));

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({ children: headerChildren }),
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
    lines.push("  ┌─────────────────┬────────────────────────────────────────┬─────┬────────────┐");
    lines.push("  │ Tombamento      │ Descrição                              │ Qtd │ Estado     │");
    lines.push("  ├─────────────────┼────────────────────────────────────────┼─────┼────────────┤");

    for (const item of lote.bens) {
      const tomb = (item.tombamento || "—").padEnd(15).slice(0, 15);
      const desc = (item.descricao || "—").padEnd(38).slice(0, 38);
      const qtd = String(item.quantidade).padStart(3);
      const estado = (estadoLabels[item.estado] ?? item.estado).padEnd(10).slice(0, 10);
      lines.push(`  │ ${tomb} │ ${desc} │ ${qtd} │ ${estado} │`);
    }

    lines.push("  └─────────────────┴────────────────────────────────────────┴─────┴────────────┘");
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
