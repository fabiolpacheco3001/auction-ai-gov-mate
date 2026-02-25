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
      .select("id, user_id, ativo")
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
    const { titulo, orgao, itens } = body;

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

    // Fetch sites de precificação do usuário
    const { data: sitesPrecificacao } = await supabaseAdmin
      .from("sites_precificacao")
      .select("url, descricao")
      .eq("user_id", tokenRow.user_id)
      .order("created_at", { ascending: true });

    const sites = sitesPrecificacao ?? [];

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
        // Accept optional pricing fields from API input
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

    // If sites are configured and no pricing provided, call classify-csv for AI pricing
    const needsAiPricing = sites.length > 0 && itensValidados.every(
      (i: any) => i.valor_medio_site1 === null && i.valor_medio_site2 === null && i.valor_medio_site3 === null
    );

    let aiPricingResults: any[] | null = null;

    if (needsAiPricing) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          // Fetch prompt configuration
          const { data: configData } = await supabaseAdmin
            .from("configuracao_sistema")
            .select("prompt_classificacao_csv")
            .eq("id", "config-1")
            .maybeSingle();

          const prompt = configData?.prompt_classificacao_csv ?? "";

          const sitesInfo = sites.map((s: any) => `- ${s.url}${s.descricao ? ` (${s.descricao})` : ""}`).join("\n");
          const sitesJson = JSON.stringify(sites, null, 2);

          const csvData = itensValidados.map((item: any, idx: number) => ({
            linha: idx + 1,
            tombamento: item.tombamento,
            descricao: item.descricao,
            categoria: item.categoria,
            estado: item.estado,
            localizacao: item.localizacao,
            municipio: item.municipio,
            quantidade: item.quantidade,
            valor_estimado: item.valor_estimado,
          }));

          const userMessage = `PROMPT DE CLASSIFICAÇÃO DEFINIDO PELO USUÁRIO:
${prompt}

SITES DE PRECIFICAÇÃO PARA CONSULTA DE VALORES:
${sitesInfo || "Nenhum site configurado."}

LISTA ESTRUTURADA DOS SITES:
${sitesJson}

DADOS DOS ITENS:
${JSON.stringify(csvData, null, 2)}

INSTRUÇÕES:
Retorne APENAS a precificação para cada item. Para cada item, estime o valor médio de leilão para cada site.

Retorne APENAS um JSON válido no formato:
{
  "itens": [
    {
      "linha": number,
      "precificacao": {
        "valorMedioGeral": number | null,
        "valorMedioPorSite": [
          { "url": string, "valorMedio": number | null, "confianca": number }
        ],
        "quantidadeSites": number
      }
    }
  ]
}`;

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
                  content: "Você é um especialista em precificação de bens patrimoniais e leilões públicos. Retorne APENAS JSON válido.",
                },
                { role: "user", content: userMessage },
              ],
            }),
          });

          if (response.ok) {
            const aiResponse = await response.json();
            const content = aiResponse.choices?.[0]?.message?.content;
            try {
              const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
              const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
              const parsed = JSON.parse(jsonStr);
              aiPricingResults = parsed.itens ?? null;
            } catch {
              console.error("Failed to parse AI pricing response");
            }
          }
        }
      } catch (e) {
        console.error("AI pricing error (non-fatal):", e);
      }
    }

    // Apply AI pricing results to items
    if (aiPricingResults) {
      for (const aiItem of aiPricingResults) {
        const idx = (aiItem.linha ?? 0) - 1;
        if (idx >= 0 && idx < itensValidados.length && aiItem.precificacao) {
          const siteValues = aiItem.precificacao.valorMedioPorSite ?? [];
          itensValidados[idx].valor_medio_site1 = siteValues[0]?.valorMedio ?? null;
          itensValidados[idx].valor_medio_site2 = siteValues[1]?.valorMedio ?? null;
          itensValidados[idx].valor_medio_site3 = siteValues[2]?.valorMedio ?? null;
        }
      }
    }

    // Calculate valor_sugerido for each item
    const itensComSugerido = itensValidados.map((item: any) => {
      const valores = [item.valor_estimado, item.valor_medio_site1, item.valor_medio_site2, item.valor_medio_site3]
        .filter((v: any) => v !== null && v !== undefined && v > 0);
      const valorSugerido = valores.length > 0 ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length : null;
      return { ...item, valor_sugerido: valorSugerido };
    });

    const totalBens = itensComSugerido.reduce((s: number, i: any) => s + i.quantidade, 0);
    const arrecadacaoEstimada = itensComSugerido.reduce((s: number, i: any) => s + i.valor_estimado * i.quantidade, 0);

    // Create processo
    const { data: processo, error: procErr } = await supabaseAdmin
      .from("processos")
      .insert({
        titulo,
        orgao: orgao || "Não informado",
        user_id: tokenRow.user_id,
        total_bens: totalBens,
        total_lotes: 0,
        arrecadacao_estimada: arrecadacaoEstimada,
        status: "processando",
      })
      .select("id")
      .single();

    if (procErr) throw procErr;

    // Insert bens
    const bensToInsert = itensComSugerido.map((item: any) => ({
      processo_id: processo.id,
      tombamento: item.tombamento,
      descricao: item.descricao,
      categoria: item.categoria,
      estado: item.estado,
      localizacao: item.localizacao,
      municipio: item.municipio,
      quantidade: item.quantidade,
      valor_estimado: item.valor_estimado,
      valor_medio_site1: item.valor_medio_site1,
      valor_medio_site2: item.valor_medio_site2,
      valor_medio_site3: item.valor_medio_site3,
      valor_sugerido: item.valor_sugerido,
    }));

    const { data: bensInserted, error: bensErr } = await supabaseAdmin
      .from("bens")
      .insert(bensToInsert)
      .select("id");

    if (bensErr) throw bensErr;

    // Classify into lots by category
    const categorias: Record<string, typeof bensInserted> = {};
    itensComSugerido.forEach((item: any, idx: number) => {
      const cat = item.categoria;
      if (!categorias[cat]) categorias[cat] = [];
      categorias[cat].push(bensInserted![idx]);
    });

    let loteNumero = 1;
    for (const [categoria, bens] of Object.entries(categorias)) {
      const precoSugerido = itensComSugerido
        .filter((i: any) => i.categoria === categoria)
        .reduce((s: number, i: any) => {
          const vs = i.valor_sugerido ?? i.valor_estimado;
          return s + vs * i.quantidade;
        }, 0);

      const { data: lote, error: loteErr } = await supabaseAdmin
        .from("lotes")
        .insert({
          processo_id: processo.id,
          numero: loteNumero++,
          categoria,
          preco_sugerido: precoSugerido,
          status: "pendente",
        })
        .select("id")
        .single();

      if (loteErr) throw loteErr;

      const links = (bens as any[]).map((b: any) => ({
        lote_id: lote.id,
        bem_id: b.id,
      }));

      const { error: linkErr } = await supabaseAdmin.from("lotes_bens").insert(links);
      if (linkErr) throw linkErr;
    }

    // Update processo with lot count
    await supabaseAdmin
      .from("processos")
      .update({ total_lotes: Object.keys(categorias).length, status: "revisao" })
      .eq("id", processo.id);

    return new Response(
      JSON.stringify({
        sucesso: true,
        processo_id: processo.id,
        total_bens: bensInserted!.length,
        total_lotes: Object.keys(categorias).length,
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
