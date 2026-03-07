import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUserRole = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setIsOrgAdmin(false);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = data?.map((r: any) => r.role) ?? [];
      setIsSuperAdmin(roles.includes("super_admin"));
      setIsOrgAdmin(roles.includes("org_admin"));
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  return { isSuperAdmin, isOrgAdmin, loading };
};
