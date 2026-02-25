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

Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto adicional fora do JSON:

{
  "dadosClassificados": [],
  "errosEncontrados": [],
  "avisos": [],
  "sugestoes": [],
  "totalRegistros": number,
  "totalErros": number
}

Onde:
- dadosClassificados: array com cada registro do CSV enriquecido com campos de classificação adicionados pela IA
- errosEncontrados: array de strings descrevendo erros encontrados (ex: "Linha 2: Categoria inválida")
- avisos: array de strings com avisos relevantes
- sugestoes: array de strings com sugestões de correção
- totalRegistros: número total de registros processados
- totalErros: número total de erros encontrados

Não retorne texto fora do JSON.`;

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
                "Você é um especialista em validação e classificação de dados de bens patrimoniais a partir de arquivos CSV. Sempre responda APENAS com JSON válido, sem markdown, sem blocos de código, sem texto adicional.",
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

    // Parse the JSON from the AI response
    let resultado;
    try {
      // Try to extract JSON from potential markdown code blocks
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
