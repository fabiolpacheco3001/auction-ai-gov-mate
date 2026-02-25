import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log("Prompt usado:", promptConfigurado);
    console.log("Total de registros CSV:", dadosCsv?.length);

    const userMessage = `PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO:
${promptConfigurado}

DADOS DO CSV:
${JSON.stringify(dadosCsv, null, 2)}

INSTRUÇÕES:
Analise os dados e aplique exatamente as regras definidas no prompt do usuário.

Retorne APENAS um JSON válido no seguinte formato:

{
  "lotes": [
    {
      "categoria": string,
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
          "valor": number
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
- Agrupe todos os registros por categoria
- Cada categoria deve se tornar um lote
- Cada lote deve conter todos os itens daquela categoria
- Calcule quantidadeItens e valorTotal corretamente
- Use o promptConfigurado como regra principal de classificação
- O campo "municipio" deve conter o município do item (pode vir do CSV ou ser inferido da localização)
- O campo "quantidade" deve conter a quantidade do item (padrão 1 se não informado)
- Retorne somente JSON válido
- Não retorne explicações`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                "Você é um especialista em classificação e agrupamento de bens patrimoniais.\n\nSua tarefa é:\n1. Classificar os itens conforme o prompt do usuário\n2. Agrupar os itens por categoria\n3. Criar um lote para cada categoria\n4. Retornar os dados estruturados em formato de lotes\n\nResponda APENAS com JSON válido.",
            },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
