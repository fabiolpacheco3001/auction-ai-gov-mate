import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (!userId) return { error: "Falha na autenticação." };

    // Super admins bypass org validation
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin") ?? false;

    if (!isSuperAdmin) {
      const { data: orgUser } = await supabase
        .from("orgao_usuarios")
        .select("orgao_id")
        .eq("user_id", userId)
        .eq("ativo", true)
        .maybeSingle();

      const blockMessage =
        "Login não permitido!\nO órgão que seu usuário está associado não está ativo no momento. Para reativar o acesso renove sua assinatura junto ao suporte.";

      if (!orgUser?.orgao_id) {
        await supabase.auth.signOut();
        // Give onAuthStateChange a tick to propagate the signed-out state
        await new Promise((r) => setTimeout(r, 50));
        return { error: blockMessage };
      }

      const { data: orgao } = await supabase
        .from("orgaos")
        .select("ativo, data_inicio, data_termino")
        .eq("id", orgUser.orgao_id)
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);
      const valid =
        !!orgao &&
        orgao.ativo === true &&
        !!orgao.data_inicio &&
        today >= orgao.data_inicio &&
        (!orgao.data_termino || today <= orgao.data_termino);

      if (!valid) {
        await supabase.auth.signOut();
        await new Promise((r) => setTimeout(r, 50));
        return { error: blockMessage };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
