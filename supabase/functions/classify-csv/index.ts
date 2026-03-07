import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promptConfigurado, dadosCsv, orgaoId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch pricing sites from database filtered by org
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let sitesQuery = supabase.from("sites_precificacao").select("url, descricao");
    if (orgaoId) {
      sitesQuery = sitesQuery.eq("orgao_id", orgaoId);
    }
    const { data: sitesPrecificacao } = await sitesQuery;

    const sitesInfo = (sitesPrecificacao ?? [])
      .map((s: any) => `- ${s.url}${s.descricao ? ` (${s.descricao})` : ""}`)
      .join("\n");

    console.log("Total de registros CSV:", dadosCsv?.length);
    console.log("Sites de precificação encontrados:", sitesPrecificacao?.length ?? 0);
    console.log("Órgão ID:", orgaoId ?? "nenhum");

    const userMessage = `PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO:
${promptConfigurado}

====================================================================
REGRA DE PRIORIDADE ABSOLUTA
============================

O PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO é a autoridade máxima e soberana para definir:

* como os itens devem ser classificados
* como os itens devem ser agrupados em lotes
* quais campos devem ser considerados no agrupamento
* quais campos devem ser ignorados

REGRA CRÍTICA:

Se houver qualquer conflito entre:

* o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO
* ou qualquer outra instrução abaixo
* ou qualquer padrão implícito

Você deve SEMPRE obedecer exclusivamente o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO.

Nunca substitua essas regras.
Nunca complemente essas regras.
Nunca crie regras próprias de agrupamento.

Se o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO definir regras de agrupamento, utilize exclusivamente essas regras.

Somente utilize agrupamento padrão se o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO não definir nenhuma regra de agrupamento.

====================================================================
SITES DE PRECIFICAÇÃO PARA CONSULTA DE VALORES
==============================================

${sitesInfo || "Nenhum site configurado."}

Cada site listado acima deve ser considerado uma fonte independente de referência de valor de mercado.

====================================================================
DADOS DO CSV
============

${JSON.stringify(dadosCsv, null, 2)}

====================================================================
INSTRUÇÕES DE CLASSIFICAÇÃO E AGRUPAMENTO
=========================================

Você deve:

1. Analisar todos os registros do CSV
2. Classificar os itens conforme o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO
3. Agrupar os itens em lotes EXCLUSIVAMENTE conforme o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO
4. Não criar regras próprias
5. Não assumir regras implícitas
6. Não agrupar por categoria, município ou localização, exceto se isso estiver explicitamente definido no PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO

Cada lote deve conter apenas os itens que pertencem ao mesmo grupo conforme definido pelo PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO.

====================================================================
INSTRUÇÕES DE PRECIFICAÇÃO
==========================

Para cada item, você deve obter o valor médio de venda em cada site:
- Analisar a descrição, categoria, estado, localização e demais dados disponíveis
- Considerar cada URL da lista de sites_precificacao como uma fonte independente
- Obter um valor médio de leilão separado para cada site
- Calcular também o valor médio geral baseado nos valores estimados de todos os sites
- Ignorar valores irreais ou fora do padrão de mercado
- Usar aproximação inteligente baseada em similaridade com itens equivalentes
- Se não houver confiança suficiente (inferior a 0.75), retornar null para o valorMedio daquele site
- O campo "confianca" deve ser um número entre 0 e 1 indicando o grau de confiança da estimativa
- Não considere itens cuja confiança seja inferior a 0.75
- Para cada site, retorne a quantidade de itens/correspondências considerados na estimativa
- Para cada site, retorne uma lista com a url e o valor de cada correspondência utilizada na obtenção do valor médio
- Nunca omitir nenhum site da lista
- Nunca inventar URLs — usar exatamente as URLs fornecidas

====================================================================
FORMATO DE RESPOSTA OBRIGATÓRIO
===============================

Retorne APENAS um JSON válido no formato:

{
"lotes": [
{
"categoria": string,
"municipio": string,
"localizacao": string,
"quantidadeItens": number,
"valorTotal": number,
"itens": [
{
"linha": number,
"tombamento": string,
"descricao": string,
"categoria": string,
"estado": string,
"localizacao": string,
"municipio": string,
"quantidade": number,
"valor": number,
"precificacao": {
            "valorMedioGeral": number | null,
            "valorMedioPorSite": [
              {
                "url": string,
                "valorMedio": number | null,
                "confianca": number,
                "itensConsiderados": number,
                "correspondencias": [
                  {
                    "url": string,
                    "valor": number
                  }
                ]
              }
            ],
            "quantidadeSites": number
          }
}
]
}
],
"errosEncontrados": [],
"avisos": [],
"sugestoes": [],
"totalRegistros": number,
"totalErros": number,
"totalLotes": number
}

- O campo "precificacao.valorMedioPorSite" deve conter um objeto para CADA URL fornecida em sites_precificacao
- O campo "url" dentro de valorMedioPorSite deve ser EXATAMENTE igual ao fornecido na lista
- "valorMedio" deve ser um número float ou null
- "confianca" deve ser um número entre 0 e 1. Não considere itens com confiança inferior a 0.75
- "itensConsiderados" deve ser o número de correspondências usadas para calcular o valorMedio
- "correspondencias" deve ser uma lista com { "url": string, "valor": number } de cada item usado no cálculo
- "valorMedioGeral" deve ser a média dos valorMedio válidos (não nulos e com confiança >= 0.75)
- "quantidadeSites" deve ser o total de sites considerados

====================================================================
REGRAS OBRIGATÓRIAS FINAIS
==========================

* O agrupamento deve seguir EXCLUSIVAMENTE o PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO
* Nunca invente regras de agrupamento
* Nunca use padrões implícitos
* Cada lote deve conter apenas os itens definidos pelas regras do PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO
* Calcule quantidadeItens corretamente
* Calcule valorTotal corretamente
* Retorne somente JSON válido
* Não retorne explicações
* Não retorne texto fora do JSON
`;

    console.log("Prompt usado:", userMessage);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em classificação e agrupamento de bens patrimoniais, avaliação de leilões públicos, classificação patrimonial e precificação de bens usados.\n\nSua tarefa é:\n1. Classificar os itens conforme o prompt do usuário\n2. Agrupar os itens em lotes conforme as regras do prompt do usuário\n3. Para cada item, estimar o valor médio em cada site de precificação fornecido, retornando o objeto 'precificacao' com valorMedioPorSite e valorMedioGeral\n4. Usar aproximação inteligente baseada em similaridade quando não houver correspondência exata\n5. Retornar os dados estruturados em formato de lotes\n\nResponda APENAS com JSON válido.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("Resultado IA (raw):", content);

    let resultado;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      resultado = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("A IA retornou uma resposta em formato inválido.");
    }

    console.log("Resultado IA (parsed):", resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-csv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
