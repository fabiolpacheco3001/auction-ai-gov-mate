import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Gavel, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const { signIn } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resolveEmail = async (input: string): Promise<string> => {
    // If user typed an email, use it directly
    if (input.includes("@")) return input;

    // Try to find email by login in orgao_usuarios via edge function or direct lookup
    // For the admin user, use the hardcoded domain
    const loginEmail = `${input}@alienagov.gov.br`;

    // First try direct email login
    return loginEmail;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginEmail = login.includes("@") ? login : `${login}@alienagov.gov.br`;

      // Try login with constructed email first
      const { error: firstError } = await signIn(loginEmail, password);

      if (firstError) {
        // If that fails and input wasn't an email, try looking up by login field
        if (!login.includes("@")) {
          // Use a public RPC or direct query to find the user's email by login
          const { data: userData } = await supabase.functions.invoke("resolve-login", {
            body: { login: login.trim() },
          });

          if (userData?.email) {
            const { error: secondError } = await signIn(userData.email, password);
            if (secondError) {
              setError("Credenciais inválidas. Verifique seu login e senha.");
            }
          } else {
            setError("Credenciais inválidas. Verifique seu login e senha.");
          }
        } else {
          setError("Credenciais inválidas. Verifique seu login e senha.");
        }
      }
    } catch {
      setError("Erro ao realizar login. Tente novamente.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-hero mb-4">
            <Gavel className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">AlienaGov</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Alienação Patrimonial</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Login ou E-mail</Label>
            <Input
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="admin ou email@orgao.gov.br"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
