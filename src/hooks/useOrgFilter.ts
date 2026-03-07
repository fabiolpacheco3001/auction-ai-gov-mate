import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a function that applies the org filter to a Supabase query builder.
 * If selectedOrgId is null (Todos os Órgãos), no filter is applied.
 */
export const useOrgFilter = () => {
  const { selectedOrgId } = useOrg();

  const applyOrgFilter = <T extends { eq: (column: string, value: string) => T }>(
    query: T,
    column = "orgao_id"
  ): T => {
    if (selectedOrgId) {
      return query.eq(column, selectedOrgId);
    }
    return query;
  };

  return { selectedOrgId, applyOrgFilter };
};
