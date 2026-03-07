import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Plus, ShieldCheck } from "lucide-react";

interface Orgao {
  id: string;
  nome: string;
  sigla: string;
  uf: string;
  cidade: string;
  data_inicio: string;
  data_termino: string | null;
  pacote_processos: number | null;
  ativo: boolean;
  created_at: string;
}

const ListaOrgaos = () => {
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [orgaos, setOrgaos] = useState<Orgao[]>([]);
  const [loadingOrgaos, setLoadingOrgaos] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin || roleLoading) return;
    const fetchOrgaos = async () => {
      const { data } = await supabase.from("orgaos").select("*").order("created_at", { ascending: false });
      setOrgaos((data as any) ?? []);
      setLoadingOrgaos(false);
    };
    fetchOrgaos();
  }, [isSuperAdmin, roleLoading]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">Acesso restrito a Administradores Gerais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cadastro de Órgãos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os órgãos do sistema</p>
        </div>
        <Button onClick={() => navigate("/admin/orgaos/novo")} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar Órgão
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            Órgãos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOrgaos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orgaos.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum órgão cadastrado ainda.</p>
              <Button variant="outline" onClick={() => navigate("/admin/orgaos/novo")}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar primeiro órgão
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Processos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgaos.map(org => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.nome}</TableCell>
                      <TableCell>{org.sigla}</TableCell>
                      <TableCell>{org.uf}</TableCell>
                      <TableCell>{org.cidade}</TableCell>
                      <TableCell>{new Date(org.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{org.pacote_processos ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={org.ativo ? "default" : "secondary"}>
                          {org.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ListaOrgaos;
