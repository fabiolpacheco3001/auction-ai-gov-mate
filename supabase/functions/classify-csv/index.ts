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
    const { promptConfigurado, dadosCsv } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch pricing sites from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sitesPrecificacao } = await supabase.from("sites_precificacao").select("url, descricao");

    const sitesInfo = (sitesPrecificacao ?? [])
      .map((s: any) => `- ${s.url}${s.descricao ? ` (${s.descricao})` : ""}`)
      .join("\n");

    console.log("Total de registros CSV:", dadosCsv?.length);
    console.log("Sites de precificação encontrados:", sitesPrecificacao?.length ?? 0);

    const userMessage = `PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO também conhecido como promptConfigurado (REGRA DE PRIORIDADE MÁXIMA):
${promptConfigurado}

IMPORTANTE — REGRA DE PRIORIDADE ABSOLUTA:

O promptConfigurado é a fonte principal e soberana para definir:

- como os itens devem ser classificados
- como os itens devem ser agrupados em lotes
- quais campos devem ser considerados no agrupamento
- quais campos devem ser ignorados

Se houver qualquer conflito entre:

- o promptConfigurado
- as instruções abaixo
- ou qualquer padrão implícito

Você DEVE sempre obedecer exclusivamente o promptConfigurado.

Nunca substitua, ignore ou complemente as regras do promptConfigurado por conta própria.

Nunca aplique regras padrão de agrupamento se o promptConfigurado definir regras específicas.

Somente utilize regras padrão se o promptConfigurado NÃO definir nenhuma regra de agrupamento.

---

SITES DE PRECIFICAÇÃO PARA CONSULTA DE VALORES:
${sitesInfo || "Nenhum site configurado."}

---

DADOS DO CSV:
${JSON.stringify(dadosCsv, null, 2)}

---

INSTRUÇÕES GERAIS:

1. Classifique e agrupe os itens seguindo estritamente o promptConfigurado
2. O agrupamento em lotes deve ser determinado EXCLUSIVAMENTE pelo promptConfigurado
3. Não crie regras próprias de agrupamento
4. Não use suposições
5. Não use agrupamento implícito
6. Apenas siga o que está definido no promptConfigurado

---

PESQUISA DE VALOR MÉDIO DE LEILÃO:

Para cada item, você deve:

- Usar a descrição, categoria, estado e demais dados disponíveis do item
- Considerar os sites de precificação fornecidos como referência de mercado
- Estimar o valor médio de venda em leilões de itens equivalentes ou similares
- Considerar valores realistas de mercado
- Ignorar valores irreais ou fora do padrão
- Usar similaridade quando necessário
- Retornar no campo "valorMedioLeilao"
- Retornar null se não houver confiança suficiente

---

REGRAS DE AGRUPAMENTO DE LOTES:

ATENÇÃO — REGRA CRÍTICA:

O agrupamento deve seguir EXCLUSIVAMENTE o promptConfigurado.

Isso significa:

- O promptConfigurado define completamente como os lotes são formados
- Não utilize nenhuma lógica padrão que não esteja definida no promptConfigurado
- Não agrupe por categoria, município ou localização, a menos que o promptConfigurado determine isso explicitamente

---

FORMATO DE RESPOSTA OBRIGATÓRIO:

Retorne APENAS um JSON válido no seguinte formato:

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
          "valorMedioLeilao": number | null
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

---

INSTRUÇÕES OBRIGATÓRIAS FINAIS:

- O agrupamento deve seguir exclusivamente o promptConfigurado
- Nunca invente regras de agrupamento
- Nunca use padrões implícitos
- Cada lote deve conter apenas os itens definidos pelas regras do promptConfigurado
- Calcule quantidadeItens corretamente
- Calcule valorTotal corretamente
- Retorne somente JSON válido
- Não retorne explicações
- Não retorne texto fora do JSON`;

    console.log("Prompt usadox:", userMessage);

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
              "Você é um especialista em classificação e agrupamento de bens patrimoniais, avaliação de leilões públicos, classificação patrimonial e precificação de bens usados.\n\nSua tarefa é:\n1. Classificar os itens conforme o prompt do usuário\n2. Agrupar os itens por categoria + municipio + localizacao (cada combinação única = um lote)\n3. Para cada item, estimar o valor médio de leilão consultando os sites de precificação fornecidos\n4. Usar aproximação inteligente baseada em similaridade quando não houver correspondência exata\n5. Retornar os dados estruturados em formato de lotes com o campo valorMedioLeilao\n\nResponda APENAS com JSON válido.",
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
