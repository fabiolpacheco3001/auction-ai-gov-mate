import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { login } = await req.json();

    if (!login) {
      return new Response(JSON.stringify({ error: "Login é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find user_id by login in orgao_usuarios
    const { data: orgUser, error: orgError } = await adminClient
      .from("orgao_usuarios")
      .select("user_id")
      .eq("login", login)
      .eq("ativo", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ email: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email from auth.users
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(orgUser.user_id);

    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ email: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email: authUser.user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
