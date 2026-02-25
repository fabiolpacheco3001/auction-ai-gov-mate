import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Globe, Loader2 } from "lucide-react";

const ConfiguracaoPrecificacao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites-precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites_precificacao")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSite = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("sites_precificacao").insert({
        url,
        descricao,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites-precificacao"] });
      setUrl("");
      setDescricao("");
      toast({ title: "Site adicionado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar site", variant: "destructive" });
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sites_precificacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites-precificacao"] });
      toast({ title: "Site removido" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    addSite.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Configuração de Precificação
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os sites de referência utilizados para precificação dos bens.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Adicionar Site
          </CardTitle>
          <CardDescription>
            Informe a URL e uma descrição para o site de referência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="https://exemplo.com.br"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              type="url"
              required
            />
            <Input
              placeholder="Descrição do site"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={addSite.isPending || !url.trim()}>
              {addSite.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sites Cadastrados</CardTitle>
          <CardDescription>
            {sites.length} site{sites.length !== 1 ? "s" : ""} cadastrado{sites.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sites.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum site cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        {site.url}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.descricao || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSite.mutate(site.id)}
                        disabled={deleteSite.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracaoPrecificacao;
