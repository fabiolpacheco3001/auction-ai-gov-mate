import { supabase } from "@/integrations/supabase/client";

export interface Precificacao {
  valorMedioGeral: number | null;
  valorMedioPorSite: {
    url: string;
    valorMedio: number | null;
    confianca: number;
    itensConsiderados: number;
    correspondencias: { url: string; valor: number; observacao: string }[];
  }[];
  quantidadeSites: number;
}

export interface LoteItem {
  linha: number;
  tombamento: string;
  descricao: string;
  categoria: string;
  estado: string;
  localizacao: string;
  municipio: string;
  quantidade: number;
  valor: number;
  precificacao?: Precificacao;
  imagemVinculada?: string;
}

export interface LoteClassificado {
  categoria: string;
  municipio: string;
  localizacao: string;
  quantidadeItens: number;
  valorTotal: number;
  itens: LoteItem[];
}

export interface ClassificationResult {
  lotes: LoteClassificado[];
  errosEncontrados: string[];
  avisos: string[];
  sugestoes: string[];
  totalRegistros: number;
  totalErros: number;
  totalLotes: number;
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

export const CsvClassificationService = {
  async classificarCsv(file: File, promptConfigurado: string, orgaoId?: string | null): Promise<ClassificationResult> {
    const text = await file.text();
    const rows = parseCsv(text);

    console.log("Prompt usuario", promptConfigurado);
    console.log("Órgão ID:", orgaoId ?? "nenhum");

    return this.classificarDados(rows, promptConfigurado, orgaoId);
  },

  async classificarDados(rows: Record<string, string>[], promptConfigurado: string, orgaoId?: string | null): Promise<ClassificationResult> {
    console.log("Classificando dados:", rows.length, "linhas");
    console.log("Órgão ID:", orgaoId ?? "nenhum");

    if (rows.length === 0) {
      return {
        lotes: [],
        errosEncontrados: ["Arquivo vazio ou sem dados válidos."],
        avisos: [],
        sugestoes: [],
        totalRegistros: 0,
        totalErros: 1,
        totalLotes: 0,
      };
    }

    const { data, error } = await supabase.functions.invoke("classify-csv", {
      body: { promptConfigurado, dadosCsv: rows, orgaoId: orgaoId || null },
    });

    if (error) {
      console.error("Erro ao chamar IA:", error);
      throw new Error(error.message || "Erro ao classificar dados com IA.");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    console.log("Resultado IA:", data);

    return {
      lotes: data.lotes ?? [],
      errosEncontrados: data.errosEncontrados ?? [],
      avisos: data.avisos ?? [],
      sugestoes: data.sugestoes ?? [],
      totalRegistros: data.totalRegistros ?? rows.length,
      totalErros: data.totalErros ?? 0,
      totalLotes: data.totalLotes ?? data.lotes?.length ?? 0,
    };
  },
};
