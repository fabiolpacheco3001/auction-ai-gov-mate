export interface ClassificationResult {
  dadosClassificados: Record<string, unknown>[];
  errosEncontrados: string[];
  avisos: string[];
  sugestoes: string[];
  totalRegistros: number;
  totalErros: number;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.replace(/^"|"$/g, "").trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

const CATEGORIAS_VALIDAS = ["veiculos", "eletronicos", "moveis", "maquinario", "outros"];
const ESTADOS_VALIDOS = ["bom", "regular", "ruim", "inservivel"];

export const CsvClassificationService = {
  async classificarCsv(file: File, promptConfigurado: string): Promise<ClassificationResult> {
    const text = await file.text();
    const rows = parseCsv(text);

    const errosEncontrados: string[] = [];
    const avisos: string[] = [];
    const sugestoes: string[] = [];
    const tombamentos = new Set<string>();

    const dadosClassificados = rows.map((row, idx) => {
      const lineNum = idx + 2;
      const tombamento = Object.values(row)[0] || "";
      const descricao = Object.values(row)[1] || "";
      const categoria = (Object.values(row)[2] || "").toLowerCase();
      const estado = (Object.values(row)[3] || "").toLowerCase();
      const localizacao = Object.values(row)[4] || "";
      const valorStr = Object.values(row)[5] || "";

      // Validate required fields
      if (!descricao) errosEncontrados.push(`Linha ${lineNum}: Descrição do bem está vazia.`);
      if (!localizacao) avisos.push(`Linha ${lineNum}: Localização não informada.`);

      // Validate category
      const catValida = CATEGORIAS_VALIDAS.includes(categoria);
      if (!catValida) {
        errosEncontrados.push(`Linha ${lineNum}: Categoria "${categoria}" inválida.`);
        sugestoes.push(`Linha ${lineNum}: Use uma das categorias: ${CATEGORIAS_VALIDAS.join(", ")}.`);
      }

      // Validate state
      if (!ESTADOS_VALIDOS.includes(estado)) {
        errosEncontrados.push(`Linha ${lineNum}: Estado "${estado}" inválido.`);
      }

      // Validate value
      const valor = parseFloat(valorStr.replace(".", "").replace(",", "."));
      if (isNaN(valor) || valor <= 0) {
        avisos.push(`Linha ${lineNum}: Valor estimado inválido ou zerado.`);
      }

      // Check duplicates
      if (tombamento) {
        if (tombamentos.has(tombamento)) {
          avisos.push(`Linha ${lineNum}: Tombamento "${tombamento}" possivelmente duplicado.`);
        }
        tombamentos.add(tombamento);
      }

      return {
        ...row,
        _categoriaValida: catValida,
        _estadoValido: ESTADOS_VALIDOS.includes(estado),
        _valorNumerico: isNaN(valor) ? 0 : valor,
        _linha: lineNum,
      };
    });

    // Simulate prompt-based processing delay
    await new Promise((r) => setTimeout(r, 1500));

    if (promptConfigurado.toLowerCase().includes("duplicata")) {
      // Prompt mentions duplicates — already handled above
    }

    return {
      dadosClassificados,
      errosEncontrados,
      avisos,
      sugestoes,
      totalRegistros: rows.length,
      totalErros: errosEncontrados.length,
    };
  },
};
