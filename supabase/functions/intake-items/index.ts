import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de acesso não fornecido. Use o header Authorization: Bearer <token>." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API token
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, ativo, orgao_id")
      .eq("token", token)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou não encontrado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokenRow.ativo) {
      return new Response(
        JSON.stringify({ error: "Token desativado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at
    await supabaseAdmin
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // Parse body
    const body = await req.json();
    const { titulo, itens } = body;

    if (!titulo || typeof titulo !== "string") {
      return new Response(
        JSON.stringify({ error: "Campo 'titulo' é obrigatório (string)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campo 'itens' é obrigatório (array não vazio)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate items
    const erros: string[] = [];
    const itensValidados = itens.map((item: any, idx: number) => {
      if (!item.descricao) erros.push(`Item ${idx + 1}: campo 'descricao' é obrigatório.`);
      return {
        tombamento: item.tombamento ?? "",
        descricao: item.descricao ?? "",
        categoria: item.categoria ?? "outros",
        estado: item.estado ?? "regular",
        localizacao: item.localizacao ?? "",
        municipio: item.municipio ?? "",
        quantidade: Number(item.quantidade) || 1,
        valor_estimado: Number(item.valor_estimado) || 0,
        valor_medio_site1: item.valor_medio_site1 != null ? Number(item.valor_medio_site1) : null,
        valor_medio_site2: item.valor_medio_site2 != null ? Number(item.valor_medio_site2) : null,
        valor_medio_site3: item.valor_medio_site3 != null ? Number(item.valor_medio_site3) : null,
      };
    });

    if (erros.length > 0) {
      return new Response(
        JSON.stringify({ error: "Erros de validação nos itens.", detalhes: erros }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch prompt configuration (same as CSV flow)
    const { data: configData } = await supabaseAdmin
      .from("configuracao_sistema")
      .select("prompt_classificacao_csv")
      .eq("id", "config-1")
      .maybeSingle();

    const promptConfigurado = configData?.prompt_classificacao_csv ?? "";

    // Fetch pricing sites
    const { data: sitesPrecificacao } = await supabaseAdmin
      .from("sites_precificacao")
      .select("url, descricao");

    const sitesInfo = (sitesPrecificacao ?? [])
      .map((s: any) => `- ${s.url}${s.descricao ? ` (${s.descricao})` : ""}`)
      .join("\n");

    // Prepare CSV-like data for the AI (same format as classify-csv)
    const dadosCsv = itensValidados.map((item: any, idx: number) => ({
      linha: idx + 1,
      tombamento: item.tombamento,
      descricao: item.descricao,
      categoria: item.categoria,
      estado: item.estado,
      localizacao: item.localizacao,
      municipio: item.municipio,
      quantidade: item.quantidade,
      valor: item.valor_estimado,
    }));

    // Use the EXACT SAME prompt as classify-csv
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

Para cada item, você deve estimar o valor médio de venda em leilões públicos.

Use:

* descrição
* categoria
* estado
* localização
* e demais dados disponíveis

Considere os sites de precificação fornecidos como referência de mercado.

Regras:

* estimar valor realista de mercado
* ignorar valores irreais
* usar similaridade com itens equivalentes
* usar aproximação inteligente quando necessário

Retorne:

"valorMedioLeilao": number | null

Retorne null se não houver confiança suficiente.

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

    console.log("intake-items: Calling AI with same prompt as classify-csv");

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

    console.log("intake-items AI result (raw):", content);

    let resultado: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      resultado = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("A IA retornou uma resposta em formato inválido.");
    }

    const lotes = resultado.lotes ?? [];

    // Create processo
    const totalBens = itensValidados.reduce((s: number, i: any) => s + i.quantidade, 0);
    const arrecadacaoEstimada = itensValidados.reduce((s: number, i: any) => s + i.valor_estimado * i.quantidade, 0);

    const { data: processo, error: procErr } = await supabaseAdmin
      .from("processos")
      .insert({
        titulo,
        user_id: tokenRow.user_id,
        orgao_id: tokenRow.orgao_id,
        total_bens: totalBens,
        total_lotes: lotes.length,
        arrecadacao_estimada: arrecadacaoEstimada,
        status: "revisao",
      })
      .select("id")
      .single();

    if (procErr) throw procErr;

    // Insert bens with AI pricing (same logic as CSV flow in RevisaoLotes)
    const bensToInsert = itensValidados.map((item: any, idx: number) => {
      // Find this item in AI results to get valorMedioLeilao and precificacao
      let valorMedioLeilao: number | null = null;
      let site1: number | null = null;
      let site2: number | null = null;
      let site3: number | null = null;

      for (const lote of lotes) {
        const aiItem = lote.itens?.find((i: any) => i.linha === idx + 1);
        if (aiItem) {
          valorMedioLeilao = aiItem.valorMedioLeilao ?? null;
          // Update categoria from AI classification
          item.categoria = aiItem.categoria ?? item.categoria;

          // Extract per-site values from precificacao (same as CSV flow)
          const sites = aiItem.precificacao?.valorMedioPorSite ?? [];
          site1 = sites[0]?.valorMedio ?? null;
          site2 = sites[1]?.valorMedio ?? null;
          site3 = sites[2]?.valorMedio ?? null;

          // If no per-site data but valorMedioLeilao exists, use it as site1
          if (site1 === null && site2 === null && site3 === null && valorMedioLeilao != null) {
            site1 = valorMedioLeilao;
          }
          break;
        }
      }

      // Use input values as fallback if AI didn't provide site values
      site1 = site1 ?? item.valor_medio_site1;
      site2 = site2 ?? item.valor_medio_site2;
      site3 = site3 ?? item.valor_medio_site3;

      // Calculate valor_sugerido same way as CSV flow (average of all available values)
      const valoresDisponiveis = [item.valor_estimado, site1, site2, site3]
        .filter((v: any) => v !== null && v !== undefined && v > 0);
      const valorSugerido = valoresDisponiveis.length > 0
        ? valoresDisponiveis.reduce((a: number, b: number) => a + b, 0) / valoresDisponiveis.length
        : null;

      return {
        processo_id: processo.id,
        tombamento: item.tombamento,
        descricao: item.descricao,
        categoria: item.categoria,
        estado: item.estado,
        localizacao: item.localizacao,
        municipio: item.municipio,
        quantidade: item.quantidade,
        valor_estimado: item.valor_estimado,
        valor_medio_site1: site1,
        valor_medio_site2: site2,
        valor_medio_site3: site3,
        valor_sugerido: valorSugerido,
      };
    });

    const { data: bensInserted, error: bensErr } = await supabaseAdmin
      .from("bens")
      .insert(bensToInsert)
      .select("id");

    if (bensErr) throw bensErr;

    // Create lotes from AI classification (same as CSV flow)
    let loteNumero = 1;
    for (const aiLote of lotes) {
      const loteItens = aiLote.itens ?? [];
      // Calculate lote price same way as CSV flow
      const precoSugerido = loteItens.reduce((s: number, aiItem: any) => {
        const idx = (aiItem.linha ?? 0) - 1;
        if (idx >= 0 && idx < bensToInsert.length) {
          const bem = bensToInsert[idx];
          const vs = bem.valor_sugerido ?? bem.valor_estimado ?? 0;
          return s + (bem.quantidade ?? 1) * vs;
        }
        const vm = aiItem.valorMedioLeilao ?? aiItem.valor ?? 0;
        return s + vm * (aiItem.quantidade ?? 1);
      }, 0);

      const { data: lote, error: loteErr } = await supabaseAdmin
        .from("lotes")
        .insert({
          processo_id: processo.id,
          numero: loteNumero++,
          categoria: aiLote.categoria ?? "outros",
          preco_sugerido: precoSugerido,
          status: "pendente",
        })
        .select("id")
        .single();

      if (loteErr) throw loteErr;

      // Link bens to lote
      const links = loteItens
        .map((aiItem: any) => {
          const idx = (aiItem.linha ?? 0) - 1;
          if (idx >= 0 && idx < bensInserted!.length) {
            return { lote_id: lote.id, bem_id: bensInserted![idx].id };
          }
          return null;
        })
        .filter(Boolean);

      if (links.length > 0) {
        const { error: linkErr } = await supabaseAdmin.from("lotes_bens").insert(links);
        if (linkErr) throw linkErr;
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        processo_id: processo.id,
        total_bens: bensInserted!.length,
        total_lotes: lotes.length,
        mensagem: "Processo criado com sucesso. Os lotes estão pendentes de aprovação.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("intake-items error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
