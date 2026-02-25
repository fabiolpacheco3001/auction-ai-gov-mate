import { supabase } from "@/integrations/supabase/client";

export interface ConfiguracaoSistema {
  id: string;
  promptClassificacaoCsv: string;
  dataAtualizacao: string;
  usuarioAtualizacao: string;
}

const PROMPT_PADRAO = `Classifique os bens patrimoniais do CSV seguindo estas regras:

1. CATEGORIAS: Classifique cada item em uma das categorias: veículos, eletrônicos, móveis, maquinário ou outros.
2. VALIDAÇÃO DE VALORES: Verifique se os valores estimados são numéricos e positivos. Sinalize valores zerados ou negativos.
3. ESTADO DE CONSERVAÇÃO: Valide se o estado informado é um dos valores aceitos: bom, regular, ruim ou inservível.
4. TOMBAMENTO: Verifique se o número de tombamento segue o padrão esperado (ex: VEI-2010-001).
5. INCONSISTÊNCIAS: Identifique registros com campos obrigatórios vazios (descrição, categoria, localização).
6. DUPLICATAS: Sinalize possíveis itens duplicados com base no número de tombamento.
7. Gere os lotes agrupados por Municipio e Categoria.`;

export const ConfiguracaoSistemaService = {
  getPromptPadrao: () => PROMPT_PADRAO,

  async salvar(prompt: string): Promise<ConfiguracaoSistema> {
    const now = new Date().toISOString();
    await supabase
      .from("configuracao_sistema")
      .upsert({
        id: "config-1",
        prompt_classificacao_csv: prompt,
        data_atualizacao: now,
        usuario_atualizacao: "admin",
      });
    return { id: "config-1", promptClassificacaoCsv: prompt, dataAtualizacao: now, usuarioAtualizacao: "admin" };
  },

  async carregar(): Promise<ConfiguracaoSistema> {
    const { data } = await supabase.from("configuracao_sistema").select("*").eq("id", "config-1").maybeSingle();
    if (data) {
      return {
        id: data.id,
        promptClassificacaoCsv: data.prompt_classificacao_csv,
        dataAtualizacao: data.data_atualizacao,
        usuarioAtualizacao: data.usuario_atualizacao,
      };
    }
    return {
      id: "config-1",
      promptClassificacaoCsv: PROMPT_PADRAO,
      dataAtualizacao: new Date().toISOString(),
      usuarioAtualizacao: "sistema",
    };
  },

  async restaurarPadrao(): Promise<ConfiguracaoSistema> {
    return this.salvar(PROMPT_PADRAO);
  },
};
