import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, Save } from "lucide-react";

interface SiteRow {
  id: string | null;
  url: string;
  descricao: string;
}

const FIXED_COUNT = 3;

const ConfiguracaoPrecificacao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dbSites = [], isLoading } = useQuery({
    queryKey: ["sites-precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites_precificacao")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [rows, setRows] = useState<SiteRow[]>(
    Array.from({ length: FIXED_COUNT }, () => ({ id: null, url: "", descricao: "" }))
  );

  // Sync DB data into local rows
  useEffect(() => {
    const merged: SiteRow[] = Array.from({ length: FIXED_COUNT }, (_, i) => {
      const db = dbSites[i];
      return db
        ? { id: db.id, url: db.url, descricao: db.descricao ?? "" }
        : { id: null, url: "", descricao: "" };
    });
    setRows(merged);
  }, [dbSites]);

  const updateRow = (index: number, field: "url" | "descricao", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Delete all existing then insert non-empty rows
      await supabase.from("sites_precificacao").delete().eq("user_id", user.id);

      const toInsert = rows
        .filter((r) => r.url.trim())
        .map((r) => ({ url: r.url.trim(), descricao: r.descricao.trim(), user_id: user.id }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("sites_precificacao").insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites-precificacao"] });
      toast({ title: "Sites salvos com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar sites", variant: "destructive" });
    },
  });

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
            Sites de Referência
          </CardTitle>
          <CardDescription>
            Informe até {FIXED_COUNT} sites de referência para consulta de valores em leilões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-center font-semibold text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="https://exemplo.com.br"
                          value={row.url}
                          onChange={(e) => updateRow(i, "url", e.target.value)}
                          type="url"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Descrição do site"
                          value={row.descricao}
                          onChange={(e) => updateRow(i, "descricao", e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracaoPrecificacao;
