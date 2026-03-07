import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, Save, Upload, Trash2, Settings, FileCode2, RotateCcw, Info } from "lucide-react";
import { useOrgFilter } from "@/hooks/useOrgFilter";

const PROMPT_PADRAO = `Classifique os bens patrimoniais do CSV seguindo estas regras:

1. CATEGORIAS: Classifique cada item em uma das categorias: veículos, eletrônicos, móveis, maquinário ou outros.
2. VALIDAÇÃO DE VALORES: Verifique se os valores estimados são numéricos e positivos. Sinalize valores zerados ou negativos.
3. ESTADO DE CONSERVAÇÃO: Valide se o estado informado é um dos valores aceitos: bom, regular, ruim ou inservível.
4. TOMBAMENTO: Verifique se o número de tombamento segue o padrão esperado (ex: VEI-2010-001).
5. INCONSISTÊNCIAS: Identifique registros com campos obrigatórios vazios (descrição, categoria, localização).
6. DUPLICATAS: Sinalize possíveis itens duplicados com base no número de tombamento.
7. Gere os lotes agrupados por Municipio e Categoria.`;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedOrgId } = useOrgFilter();

  // ── Sites de precificação
  const { data: dbSites = [], isLoading } = useQuery({
    queryKey: ["sites-precificacao", selectedOrgId],
    queryFn: async () => {
      let query = supabase.from("sites_precificacao").select("*").order("created_at", { ascending: true });
      if (selectedOrgId) query = query.eq("orgao_id", selectedOrgId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const [rows, setRows] = useState<SiteRow[]>(
    Array.from({ length: FIXED_COUNT }, () => ({ id: null, url: "", descricao: "" })),
  );

  useEffect(() => {
    const merged: SiteRow[] = Array.from({ length: FIXED_COUNT }, (_, i) => {
      const db = dbSites[i];
      return db ? { id: db.id, url: db.url, descricao: db.descricao ?? "" } : { id: null, url: "", descricao: "" };
    });
    setRows(merged);
  }, [dbSites]);

  const updateRow = (index: number, field: "url" | "descricao", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Delete existing sites for this org context
      let deleteQuery = supabase.from("sites_precificacao").delete().eq("user_id", user.id);
      if (selectedOrgId) {
        deleteQuery = deleteQuery.eq("orgao_id", selectedOrgId);
      } else {
        deleteQuery = deleteQuery.is("orgao_id", null);
      }
      await deleteQuery;

      const toInsert = rows
        .filter((r) => r.url.trim())
        .map((r) => ({
          url: r.url.trim(),
          descricao: r.descricao.trim(),
          user_id: user.id,
          orgao_id: selectedOrgId || null,
        }));
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

  // ── Logo do órgão
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["configuracao-sistema-logo", selectedOrgId],
    queryFn: async () => {
      let query = supabase.from("configuracao_sistema").select("logo_url, prompt_classificacao_csv, id");
      if (selectedOrgId) {
        query = query.eq("orgao_id", selectedOrgId);
      } else {
        query = query.is("orgao_id", null);
      }
      const { data } = await query.maybeSingle();
      return data;
    },
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Prompt de Classificação CSV
  const [prompt, setPrompt] = useState("");
  const [promptLastUpdate, setPromptLastUpdate] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    if (configData?.logo_url) {
      setLogoUrl(configData.logo_url);
    }
    if (configData?.prompt_classificacao_csv) {
      setPrompt(configData.prompt_classificacao_csv);
    } else {
      setPrompt(PROMPT_PADRAO);
    }
  }, [configData]);

  const handleSavePrompt = async () => {
    if (!prompt.trim()) {
      toast({ title: "Erro", description: "O prompt não pode estar vazio.", variant: "destructive" });
      return;
    }
    setSavingPrompt(true);
    const now = new Date().toISOString();
    if (configData?.id) {
      await supabase.from("configuracao_sistema").update({
        prompt_classificacao_csv: prompt,
        data_atualizacao: now,
        usuario_atualizacao: "admin",
      }).eq("id", configData.id);
    } else {
      await supabase.from("configuracao_sistema").insert({
        id: crypto.randomUUID(),
        prompt_classificacao_csv: prompt,
        orgao_id: selectedOrgId || null,
        data_atualizacao: now,
        usuario_atualizacao: "admin",
      });
    }
    setPromptLastUpdate(now);
    setSavingPrompt(false);
    queryClient.invalidateQueries({ queryKey: ["configuracao-sistema-logo"] });
    toast({ title: "Configuração salva", description: "O prompt de classificação foi atualizado com sucesso." });
  };

  const handleRestorePrompt = async () => {
    setPrompt(PROMPT_PADRAO);
    const now = new Date().toISOString();
    if (configData?.id) {
      await supabase.from("configuracao_sistema").update({
        prompt_classificacao_csv: PROMPT_PADRAO,
        data_atualizacao: now,
        usuario_atualizacao: "admin",
      }).eq("id", configData.id);
    } else {
      await supabase.from("configuracao_sistema").insert({
        id: crypto.randomUUID(),
        prompt_classificacao_csv: PROMPT_PADRAO,
        orgao_id: selectedOrgId || null,
        data_atualizacao: now,
        usuario_atualizacao: "admin",
      });
    }
    setPromptLastUpdate(now);
    queryClient.invalidateQueries({ queryKey: ["configuracao-sistema-logo"] });
    toast({ title: "Prompt restaurado", description: "O prompt padrão do sistema foi restaurado." });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione um arquivo de imagem", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `orgao-logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("logos").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Upsert into configuracao_sistema
      if (configData?.id) {
        await supabase.from("configuracao_sistema").update({
          logo_url: publicUrl,
          data_atualizacao: new Date().toISOString(),
          usuario_atualizacao: "admin",
        }).eq("id", configData.id);
      } else {
        await supabase.from("configuracao_sistema").insert({
          logo_url: publicUrl,
          orgao_id: selectedOrgId || null,
          prompt_classificacao_csv: "",
          data_atualizacao: new Date().toISOString(),
          usuario_atualizacao: "admin",
        });
      }

      setLogoUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ["configuracao-sistema-logo"] });
      toast({ title: "Logo salva com sucesso" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao fazer upload da logo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      if (configData?.id) {
        await supabase.from("configuracao_sistema").update({ logo_url: null }).eq("id", configData.id);
      }
      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ["configuracao-sistema-logo"] });
      toast({ title: "Logo removida" });
    } catch {
      toast({ title: "Erro ao remover logo", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Configurações da Aplicação</h1>
        <p className="text-muted-foreground mt-1">Gerencie os sites de referência e configurações gerais.</p>
      </div>

      {/* ── Configurações Gerais ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Faça upload da logo do órgão para ser utilizada nos cabeçalhos dos documentos gerados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo do Órgão</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={logoUrl}
                    alt="Logo do órgão"
                    className="h-16 max-w-[200px] object-contain border rounded-md p-1 bg-background"
                  />
                  <Button variant="destructive" size="sm" onClick={handleRemoveLogo}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma logo configurada.</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                {logoUrl ? "Alterar Logo" : "Fazer Upload"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Classificação CSV ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5" />
            Prompt de Classificação CSV
          </CardTitle>
          <CardDescription>
            Defina o prompt utilizado pela IA para validar, classificar e processar os dados importados via CSV.
            {promptLastUpdate && (
              <span className="block mt-1">Última atualização: {new Date(promptLastUpdate).toLocaleString("pt-BR")}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promptClassificacaoCsv">Prompt de Classificação e Validação</Label>
            <Textarea
              id="promptClassificacaoCsv"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva aqui as regras de validação e classificação dos dados do CSV."
              className="min-h-[300px] font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Este prompt será utilizado pelo sistema sempre que um arquivo CSV for importado na tela de Novo Processo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSavePrompt} disabled={savingPrompt} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="w-4 h-4 mr-2" />
              {savingPrompt ? "Salvando..." : "Salvar Prompt"}
            </Button>
            <Button variant="outline" onClick={handleRestorePrompt}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sites de Referência ── */}
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
                      <TableCell className="text-center font-semibold text-muted-foreground">{i + 1}</TableCell>
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
