import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
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

const ORG_ACCESS_BLOCK_MESSAGE =
  "Login não permitido!\nO órgão que seu usuário está associado não está ativo no momento. Para reativar o acesso renove sua assinatura junto ao suporte.";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const validationRunRef = useRef(0);
  const manualSignInRef = useRef(false);

  const validateUserAccess = useCallback(async (userId: string): Promise<string | null> => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin") ?? false;

    if (isSuperAdmin) return null;

    const { data: orgUser } = await supabase
      .from("orgao_usuarios")
      .select("orgao_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();

    if (!orgUser?.orgao_id) return ORG_ACCESS_BLOCK_MESSAGE;

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

    return valid ? null : ORG_ACCESS_BLOCK_MESSAGE;
  }, []);

  const applyValidatedSession = useCallback(async (candidateSession: Session | null, finishInitialLoading = false) => {
    const runId = ++validationRunRef.current;

    if (!candidateSession) {
      setSession(null);
      setUser(null);
      if (finishInitialLoading) setLoading(false);
      return { error: null };
    }

    const accessError = await validateUserAccess(candidateSession.user.id);

    if (runId !== validationRunRef.current) {
      return { error: accessError };
    }

    if (accessError) {
      setSession(null);
      setUser(null);
      if (finishInitialLoading) setLoading(false);
      await supabase.auth.signOut();
      return { error: accessError };
    }

    setSession(candidateSession);
    setUser(candidateSession.user);
    if (finishInitialLoading) setLoading(false);
    return { error: null };
  }, [validateUserAccess]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        validationRunRef.current += 1;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && manualSignInRef.current) {
        return;
      }

      void applyValidatedSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void applyValidatedSession(session, true);
    });

    return () => subscription.unsubscribe();
  }, [applyValidatedSession]);

  const signIn = async (email: string, password: string) => {
    manualSignInRef.current = true;
    setSession(null);
    setUser(null);
    setLoading(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      manualSignInRef.current = false;
      return { error: error.message };
    }

    if (!data.session) {
      manualSignInRef.current = false;
      return { error: "Falha na autenticação." };
    }

    const result = await applyValidatedSession(data.session);
    manualSignInRef.current = false;
    return result;
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
