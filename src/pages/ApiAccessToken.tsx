import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useOrgFilter } from "@/hooks/useOrgFilter";
import { useUserRole } from "@/hooks/useUserRole";

interface ApiToken {
  id: string;
  token: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  last_used_at: string | null;
}

const ApiAccessToken = () => {
  const { user } = useAuth();
  const { selectedOrgId } = useOrgFilter();
  const { isSuperAdmin } = useUserRole();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());

  const fetchTokens = async () => {
    if (!user) return;
    let query = supabase.from("api_tokens").select("*").order("created_at", { ascending: false });
    if (!isSuperAdmin) query = query.eq("user_id", user.id);
    if (selectedOrgId) query = query.eq("orgao_id", selectedOrgId);
    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar tokens.");
      console.error(error);
    } else {
      setTokens((data as ApiToken[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, [user, selectedOrgId]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    const insertData: any = {
      user_id: user.id,
      nome: novoNome.trim() || "Token padrão",
    };
    if (selectedOrgId) insertData.orgao_id = selectedOrgId;
    const { error } = await supabase.from("api_tokens").insert(insertData);
    if (error) {
      toast.error("Erro ao criar token.");
      console.error(error);
    } else {
      toast.success("Token criado com sucesso!");
      setNovoNome("");
      await fetchTokens();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("api_tokens").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir token.");
    } else {
      toast.success("Token excluído.");
      setTokens((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("api_tokens").update({ ativo: !ativo }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar token.");
    } else {
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ativo: !ativo } : t)));
    }
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copiado!");
  };

  const toggleVisibility = (id: string) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskToken = (token: string) => token.slice(0, 8) + "••••••••••••••••" + token.slice(-4);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">API Access Token</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os tokens de acesso para integração via API
        </p>
      </div>

      {/* Create token */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Novo Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Nome do token (ex: Sistema SIADS)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="max-w-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Gerar Token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tokens list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : tokens.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p>Nenhum token criado. Gere um token para usar a API.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((t) => (
            <Card key={t.id} className="border-border">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground text-sm">{t.nome}</span>
                      <Badge variant={t.ativo ? "default" : "secondary"} className="text-xs">
                        {t.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                        {visibleTokens.has(t.id) ? t.token : maskToken(t.token)}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(t.id)}>
                        {visibleTokens.has(t.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(t.token)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      {t.last_used_at && ` · Último uso: ${new Date(t.last_used_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(t.id, t.ativo)}
                      className="text-xs"
                    >
                      {t.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiAccessToken;
