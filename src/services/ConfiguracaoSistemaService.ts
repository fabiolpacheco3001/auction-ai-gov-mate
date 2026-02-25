export interface ConfiguracaoSistema {
  id: string;
  promptClassificacaoCsv: string;
  dataAtualizacao: string;
  usuarioAtualizacao: string;
}

const STORAGE_KEY = "configuracao_sistema";

const PROMPT_PADRAO = `Classifique os bens patrimoniais do CSV seguindo estas regras:

1. CATEGORIAS: Classifique cada item em uma das categorias: veículos, eletrônicos, móveis, maquinário ou outros.
2. VALIDAÇÃO DE VALORES: Verifique se os valores estimados são numéricos e positivos. Sinalize valores zerados ou negativos.
3. ESTADO DE CONSERVAÇÃO: Valide se o estado informado é um dos valores aceitos: bom, regular, ruim ou inservível.
4. TOMBAMENTO: Verifique se o número de tombamento segue o padrão esperado (ex: VEI-2010-001).
5. INCONSISTÊNCIAS: Identifique registros com campos obrigatórios vazios (descrição, categoria, localização).
6. DUPLICATAS: Sinalize possíveis itens duplicados com base no número de tombamento.
7. SUGESTÕES: Sugira correções para campos com valores inválidos ou fora do padrão.`;

export const ConfiguracaoSistemaService = {
  getPromptPadrao: () => PROMPT_PADRAO,

  salvar(prompt: string): ConfiguracaoSistema {
    const config: ConfiguracaoSistema = {
      id: "config-1",
      promptClassificacaoCsv: prompt,
      dataAtualizacao: new Date().toISOString(),
      usuarioAtualizacao: "admin",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  },

  carregar(): ConfiguracaoSistema {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fall through
      }
    }
    return {
      id: "config-1",
      promptClassificacaoCsv: PROMPT_PADRAO,
      dataAtualizacao: new Date().toISOString(),
      usuarioAtualizacao: "sistema",
    };
  },

  restaurarPadrao(): ConfiguracaoSistema {
    return this.salvar(PROMPT_PADRAO);
  },
};
