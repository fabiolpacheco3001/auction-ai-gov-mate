import { useState, useEffect } from "react";
import { Save, RotateCcw, FileCode2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PROMPT_PADRAO = `Classifique os bens patrimoniais do CSV seguindo estas regras:

1. CATEGORIAS: Classifique cada item em uma das categorias: veículos, eletrônicos, móveis, maquinário ou outros.
2. VALIDAÇÃO DE VALORES: Verifique se os valores estimados são numéricos e positivos. Sinalize valores zerados ou negativos.
3. ESTADO DE CONSERVAÇÃO: Valide se o estado informado é um dos valores aceitos: bom, regular, ruim ou inservível.
4. TOMBAMENTO: Verifique se o número de tombamento segue o padrão esperado (ex: VEI-2010-001).
5. INCONSISTÊNCIAS: Identifique registros com campos obrigatórios vazios (descrição, categoria, localização).
6. DUPLICATAS: Sinalize possíveis itens duplicados com base no número de tombamento.
7. SUGESTÕES: Sugira correções para campos com valores inválidos ou fora do padrão.`;

const ConfiguracaoClassificacaoCsv = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("configuracao_sistema")
        .select("*")
        .eq("id", "config-1")
        .maybeSingle();
      if (data) {
        setPrompt(data.prompt_classificacao_csv);
        setLastUpdate(data.data_atualizacao);
      } else {
        setPrompt(PROMPT_PADRAO);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast({ title: "Erro", description: "O prompt não pode estar vazio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    await supabase
      .from("configuracao_sistema")
      .upsert({ id: "config-1", prompt_classificacao_csv: prompt, data_atualizacao: now, usuario_atualizacao: "admin" });
    setLastUpdate(now);
    setSaving(false);
    toast({ title: "Configuração salva", description: "O prompt de classificação foi atualizado com sucesso." });
  };

  const handleRestore = async () => {
    setPrompt(PROMPT_PADRAO);
    const now = new Date().toISOString();
    await supabase
      .from("configuracao_sistema")
      .upsert({ id: "config-1", prompt_classificacao_csv: PROMPT_PADRAO, data_atualizacao: now, usuario_atualizacao: "admin" });
    setLastUpdate(now);
    toast({ title: "Prompt restaurado", description: "O prompt padrão do sistema foi restaurado." });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Configuração de Classificação de CSV</h1>
        <p className="text-muted-foreground mt-1">
          Defina o prompt que será utilizado pela IA para validar, classificar e processar os dados importados via CSV.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileCode2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Prompt de Classificação</h2>
            <p className="text-xs text-muted-foreground">
              Última atualização: {lastUpdate ? new Date(lastUpdate).toLocaleString("pt-BR") : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promptClassificacaoCsv" className="text-sm font-medium">
            Prompt de Classificação e Validação do CSV
          </Label>
          <Textarea
            id="promptClassificacaoCsv"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva aqui as regras de validação e classificação dos dados do CSV."
            className="min-h-[500px] font-mono text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Este prompt será utilizado pelo sistema sempre que um arquivo CSV for importado.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
          <Button variant="outline" onClick={handleRestore}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-info" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Como funciona</h4>
          <p className="text-sm text-muted-foreground">
            Ao importar um arquivo CSV na tela de <strong>Novo Processo</strong>, o sistema carregará automaticamente
            o prompt salvo aqui e o utilizará como instrução principal para validar, classificar e estruturar os dados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracaoClassificacaoCsv;
