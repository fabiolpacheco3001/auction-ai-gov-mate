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
  selectedOrgId: string | null; // null = "Todos os Órgãos"
  selectedOrgName: string;
  orgaos: Orgao[];
  loading: boolean;
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

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("orgaos")
        .select("id, nome, sigla, ativo")
        .order("nome");
      setOrgaos(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const setSelectedOrg = (orgId: string | null) => {
    setSelectedOrgId(orgId);
    localStorage.setItem(STORAGE_KEY, orgId ?? "null");
  };

  const selectedOrgName = selectedOrgId
    ? orgaos.find((o) => o.id === selectedOrgId)?.nome ?? "Órgão selecionado"
    : "Todos os Órgãos";

  return (
    <OrgContext.Provider value={{ selectedOrgId, selectedOrgName, orgaos, loading, setSelectedOrg }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) throw new Error("useOrg must be used within OrgProvider");
  return context;
};
