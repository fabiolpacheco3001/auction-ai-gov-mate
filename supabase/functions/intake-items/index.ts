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
      };
    });

    if (erros.length > 0) {
      return new Response(
        JSON.stringify({ error: "Erros de validação nos itens.", detalhes: erros }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalBens = itensValidados.reduce((s: number, i: any) => s + i.quantidade, 0);
    const arrecadacaoEstimada = itensValidados.reduce((s: number, i: any) => s + i.valor_estimado * i.quantidade, 0);

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
    const bensToInsert = itensValidados.map((item: any) => ({
      ...item,
      processo_id: processo.id,
    }));

    const { data: bensInserted, error: bensErr } = await supabaseAdmin
      .from("bens")
      .insert(bensToInsert)
      .select("id");

    if (bensErr) throw bensErr;

    // Classify into lots by category
    const categorias: Record<string, typeof bensInserted> = {};
    itensValidados.forEach((item: any, idx: number) => {
      const cat = item.categoria;
      if (!categorias[cat]) categorias[cat] = [];
      categorias[cat].push(bensInserted![idx]);
    });

    let loteNumero = 1;
    for (const [categoria, bens] of Object.entries(categorias)) {
      const precoSugerido = itensValidados
        .filter((i: any) => i.categoria === categoria)
        .reduce((s: number, i: any) => s + i.valor_estimado * i.quantidade, 0);

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
