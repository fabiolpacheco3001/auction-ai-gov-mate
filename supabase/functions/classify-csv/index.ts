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

    const userMessage = `PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO:
${promptConfigurado}

SITES DE PRECIFICAÇÃO PARA CONSULTA DE VALORES:
${sitesInfo || "Nenhum site configurado."}

DADOS DO CSV:
${JSON.stringify(dadosCsv, null, 2)}

INSTRUÇÕES:
Analise os dados e aplique exatamente as regras definidas no prompt do usuário.

PESQUISA DE VALOR MÉDIO DE LEILÃO:
Para cada item, você deve:
- Usar a descrição, categoria, estado e demais dados disponíveis do item
- Com base no seu conhecimento dos sites de precificação listados acima, estimar o valor médio de venda em leilões de itens equivalentes ou similares
- Considerar valores realistas de mercado para bens usados em leilões públicos
- Ignorar valores irreais ou fora do padrão
- Usar aproximação inteligente baseada em similaridade quando não houver correspondência exata
- Retornar o valor no campo "valorMedioLeilao" (numérico float)
- Se não for possível estimar um valor confiável, retornar null

REGRAS DE AGRUPAMENTO DE LOTES:
- Deve considerar as regras definidas pelo usuário

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

INSTRUÇÕES OBRIGATÓRIAS:
- Agrupe os registros por categoria + municipio + localizacao
- Cada combinação única deve se tornar um lote
- Cada lote deve conter todos os itens daquela combinação
- Calcule quantidadeItens e valorTotal corretamente
- Use o promptConfigurado como regra principal de classificação
- O campo "municipio" deve conter o município do item
- O campo "quantidade" deve conter a quantidade do item (padrão 1 se não informado)
- O campo "valorMedioLeilao" deve conter o valor médio estimado de leilão baseado nos sites de precificação
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
