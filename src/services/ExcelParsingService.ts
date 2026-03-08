import ExcelJS from "exceljs";

export interface ParsedRow {
  [key: string]: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  "Número de Tombamento": ["numero de tombamento", "tombamento", "nº tombamento", "n tombamento", "num tombamento"],
  "Descrição do Bem": ["descricao do bem", "descrição", "descricao", "bem"],
  "Categoria (veiculos/eletronicos/moveis/maquinario/outros)": ["categoria"],
  "Estado de Conservação (bom/regular/ruim/inservivel)": ["estado de conservacao", "estado de conservação", "estado", "conservacao", "conservação"],
  "Localização": ["localizacao", "localização", "local"],
  "Município": ["municipio", "município", "cidade"],
  "Quantidade": ["quantidade", "qtd", "qtde"],
  "Valor Estimado (R$)": ["valor estimado", "valor", "valor estimado (r$)", "valor (r$)"],
};

function normalizeHeader(raw: string): string {
  const cleaned = raw.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    const normalizedCanonical = canonical.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (cleaned === normalizedCanonical) return canonical;
    for (const alias of aliases) {
      const normalizedAlias = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cleaned === normalizedAlias || cleaned.includes(normalizedAlias)) return canonical;
    }
  }
  return raw.trim();
}

async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const rows: ParsedRow[] = [];

  workbook.eachSheet((worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(String(cell.value ?? ""));
    });

    if (headers.length === 0) return;

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const record: ParsedRow = {};
      let hasData = false;

      headers.forEach((header, idx) => {
        if (!header) return;
        const cell = row.getCell(idx + 1);
        const value = cell.value != null ? String(cell.value).trim() : "";
        record[header] = value;
        if (value) hasData = true;
      });

      if (hasData) rows.push(record);
    }
  });

  return rows;
}

export const ExcelParsingService = {
  async parseMultipleFiles(files: File[]): Promise<ParsedRow[]> {
    const allRows: ParsedRow[] = [];

    for (const file of files) {
      const rows = await parseExcelFile(file);
      allRows.push(...rows);
    }

    // Deduplicate by tombamento
    const tombamentoKey = "Número de Tombamento";
    const seen = new Set<string>();
    const deduplicated: ParsedRow[] = [];

    for (const row of allRows) {
      const tomb = row[tombamentoKey]?.trim().toLowerCase();
      if (tomb && seen.has(tomb)) continue;
      if (tomb) seen.add(tomb);
      deduplicated.push(row);
    }

    return deduplicated;
  },

  matchImages(
    rows: ParsedRow[],
    imageFiles: File[]
  ): Map<string, File> {
    const imageMap = new Map<string, File>();
    const tombamentoKey = "Número de Tombamento";

    const tombamentos = new Set(
      rows.map((r) => r[tombamentoKey]?.trim().toLowerCase()).filter(Boolean)
    );

    for (const img of imageFiles) {
      const nameWithoutExt = img.name.replace(/\.[^/.]+$/, "").trim().toLowerCase();
      if (tombamentos.has(nameWithoutExt)) {
        imageMap.set(nameWithoutExt, img);
      }
    }

    return imageMap;
  },
};
