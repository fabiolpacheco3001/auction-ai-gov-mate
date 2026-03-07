import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const SelecaoOrgao = () => {
  const { selectedOrgId, selectedOrgName, orgaos, loading: orgLoading, setSelectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(selectedOrgId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate a small delay for UX
    await new Promise((r) => setTimeout(r, 400));
    setSelectedOrg(selected);
    setSaving(false);
    toast.success("Vínculo atualizado com sucesso. O sistema agora exibirá os dados do órgão selecionado.");
    // Invalidate all queries to refetch with new org filter
    queryClient.invalidateQueries();
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Seleção de Órgão</h1>
        <p className="text-muted-foreground mt-1">
          Selecione o órgão cujos dados serão exibidos em todo o sistema
        </p>
      </div>

      {/* Current selection */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Órgão Vinculado Atualmente</p>
              <p className="text-sm font-display font-semibold text-foreground">{selectedOrgName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecione o Órgão</CardTitle>
          <CardDescription>Escolha um órgão para filtrar os dados ou selecione "Todos os Órgãos" para visão global.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* All orgs option */}
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all text-left",
              selected === null
                ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                : "border-border hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">Todos os Órgãos</span>
            </div>
            {selected === null && <Check className="w-4 h-4 text-accent shrink-0" />}
          </button>

          {/* Individual orgs */}
          {orgaos.map((orgao) => (
            <button
              key={orgao.id}
              onClick={() => setSelected(orgao.id)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all text-left",
                selected === orgao.id
                  ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                  : "border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-sm font-medium text-foreground">{orgao.nome}</span>
                  <span className="text-xs text-muted-foreground ml-2">({orgao.sigla})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={orgao.ativo ? "default" : "secondary"} className="text-xs">
                  {orgao.ativo ? "Ativo" : "Inativo"}
                </Badge>
                {selected === orgao.id && <Check className="w-4 h-4 text-accent shrink-0" />}
              </div>
            </button>
          ))}

          {orgaos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum órgão cadastrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || selected === selectedOrgId}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Vincular Órgão
        </Button>
      </div>
    </div>
  );
};

export default SelecaoOrgao;
