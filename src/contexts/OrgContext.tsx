import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Orgao {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
}

interface OrgContextType {
  selectedOrgId: string | null;
  selectedOrgName: string;
  orgaos: Orgao[];
  loading: boolean;
  isSuperAdmin: boolean;
  setSelectedOrg: (orgId: string | null) => void;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

const STORAGE_KEY = "alienagov_selected_org";

export const OrgProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "null" ? null : stored;
  });
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: orgData }, { data: roles }, { data: orgUser }] = await Promise.all([
        supabase.from("orgaos").select("id, nome, sigla, ativo").order("nome"),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("orgao_usuarios").select("orgao_id").eq("user_id", user.id).eq("ativo", true).maybeSingle(),
      ]);

      setOrgaos(orgData ?? []);

      const superAdmin = roles?.some((r: any) => r.role === "super_admin") ?? false;
      setIsSuperAdmin(superAdmin);

      if (!superAdmin && orgUser?.orgao_id) {
        setSelectedOrgId(orgUser.orgao_id);
        localStorage.setItem(STORAGE_KEY, orgUser.orgao_id);
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const setSelectedOrg = (orgId: string | null) => {
    if (!isSuperAdmin) return; // non-super_admin cannot change org
    setSelectedOrgId(orgId);
    localStorage.setItem(STORAGE_KEY, orgId ?? "null");
  };

  const selectedOrgName = selectedOrgId
    ? orgaos.find((o) => o.id === selectedOrgId)?.nome ?? "Órgão selecionado"
    : "Todos os Órgãos";

  return (
    <OrgContext.Provider value={{ selectedOrgId, selectedOrgName, orgaos, loading, isSuperAdmin, setSelectedOrg }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) throw new Error("useOrg must be used within OrgProvider");
  return context;
};
