import { supabase } from "@/integrations/supabase/client";

export const QUOTA_EXCEEDED_MESSAGE =
  "A quantidade de processo atingiu o limite previsto no pacote deste Órgão. Para retomar a geração solicite renovação/aumento do seu pacote de uso junto ao suporte.";

export interface QuotaResult {
  allowed: boolean;
  message?: string;
}

/**
 * Checks if an org can create a new processo based on its pacote_processos.
 * Counts only processos created within the org's vigência window
 * (data_inicio .. COALESCE(data_termino, now())).
 * Super admin / no org context → allowed (orgaoId null).
 */
export async function checkOrgQuota(orgaoId: string | null): Promise<QuotaResult> {
  if (!orgaoId) return { allowed: true };

  const { data: orgao, error } = await supabase
    .from("orgaos")
    .select("pacote_processos, data_inicio, data_termino")
    .eq("id", orgaoId)
    .maybeSingle();

  if (error || !orgao) return { allowed: true };

  const limite = orgao.pacote_processos ?? 0;
  if (!limite || limite <= 0) return { allowed: true };

  const inicio = orgao.data_inicio;
  const fim = orgao.data_termino ?? new Date().toISOString().slice(0, 10);
  if (!inicio) return { allowed: true };

  // created_at is timestamptz; compare against day boundaries
  const inicioIso = `${inicio}T00:00:00.000Z`;
  const fimIso = `${fim}T23:59:59.999Z`;

  const { count } = await supabase
    .from("processos")
    .select("id", { count: "exact", head: true })
    .eq("orgao_id", orgaoId)
    .gte("created_at", inicioIso)
    .lte("created_at", fimIso);

  if ((count ?? 0) >= limite) {
    return { allowed: false, message: QUOTA_EXCEEDED_MESSAGE };
  }
  return { allowed: true };
}