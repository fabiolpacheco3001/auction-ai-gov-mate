import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Building2, Loader2, Trash2, ShieldCheck, Eye, EyeOff, ArrowLeft, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface UF { id: number; sigla: string; nome: string; }
interface Cidade { id: number; nome: string; }

interface UserForm {
  nome: string;
  email: string;
  login: string;
  senha: string;
  isAdmin: boolean;
  showPassword: boolean;
}

interface ExistingUser {
  id: string;
  nome: string;
  login: string;
  is_admin: boolean;
  ativo: boolean;
}

const emptyUser = (): UserForm => ({
  nome: "", email: "", login: "", senha: "", isAdmin: true, showPassword: false,
});

const CadastroOrgaos = () => {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataTermino, setDataTermino] = useState<Date>();
  const [pacoteProcessos, setPacoteProcessos] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [ufs, setUfs] = useState<UF[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loadingUfs, setLoadingUfs] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [loadingOrgao, setLoadingOrgao] = useState(false);
  const [initialCidadeValue, setInitialCidadeValue] = useState("");

  const [usuarios, setUsuarios] = useState<UserForm[]>([emptyUser()]);
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUfs = async () => {
      setLoadingUfs(true);
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        setUfs(await res.json());
      } catch { toast({ title: "Erro ao carregar UFs", variant: "destructive" }); }
      setLoadingUfs(false);
    };
    fetchUfs();
  }, []);

  useEffect(() => {
    if (!id || !isSuperAdmin || roleLoading) return;
    const loadOrgao = async () => {
      setLoadingOrgao(true);
      const { data, error } = await supabase.from("orgaos").select("*").eq("id", id).single();
      if (error || !data) {
        toast({ title: "Órgão não encontrado", variant: "destructive" });
        navigate("/admin/orgaos");
        return;
      }
      const orgao = data as any;
      setNome(orgao.nome);
      setSigla(orgao.sigla);
      setUf(orgao.uf);
      setInitialCidadeValue(orgao.cidade);
      setDataInicio(parseISO(orgao.data_inicio));
      setDataTermino(orgao.data_termino ? parseISO(orgao.data_termino) : undefined);
      setPacoteProcessos(orgao.pacote_processos?.toString() ?? "");
      setAtivo(orgao.ativo);

      // Load existing users
      const { data: users } = await supabase
        .from("orgao_usuarios")
        .select("id, nome, login, is_admin, ativo")
        .eq("orgao_id", id)
        .order("created_at", { ascending: true });
      setExistingUsers((users as any) ?? []);
      setUsuarios([]);
      setLoadingOrgao(false);
    };
    loadOrgao();
  }, [id, isSuperAdmin, roleLoading]);

  useEffect(() => {
    if (!uf) { setCidades([]); setCidade(""); return; }
    const fetchCidades = async () => {
      setLoadingCidades(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        setCidades(await res.json());
        if (initialCidadeValue) { setCidade(initialCidadeValue); setInitialCidadeValue(""); }
        else if (!isEditing) { setCidade(""); }
      } catch { toast({ title: "Erro ao carregar cidades", variant: "destructive" }); }
      setLoadingCidades(false);
    };
    fetchCidades();
  }, [uf]);

  const updateUser = (index: number, field: keyof UserForm, value: any) => {
    setUsuarios(prev => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  };
  const addUser = () => {
    if (isEditing && !showNewUserForm) { setShowNewUserForm(true); }
    setUsuarios(prev => [...prev, { ...emptyUser(), isAdmin: false }]);
  };
  const removeUser = (index: number) => {
    setUsuarios(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (isEditing && next.length === 0) setShowNewUserForm(false);
      return next;
    });
  };

  const toggleExistingUserStatus = async (eu: ExistingUser) => {
    const newAtivo = !eu.ativo;
    const { error } = await supabase.from("orgao_usuarios").update({ ativo: newAtivo }).eq("id", eu.id);
    if (error) { toast({ title: "Erro ao atualizar usuário", variant: "destructive" }); return; }
    setExistingUsers(prev => prev.map(u => u.id === eu.id ? { ...u, ativo: newAtivo } : u));
    toast({ title: `Usuário ${newAtivo ? "ativado" : "inativado"} com sucesso` });
  };

  const toggleExistingUserAdmin = async (eu: ExistingUser) => {
    const newAdmin = !eu.is_admin;
    const { error } = await supabase.from("orgao_usuarios").update({ is_admin: newAdmin }).eq("id", eu.id);
    if (error) { toast({ title: "Erro ao atualizar permissão", variant: "destructive" }); return; }
    setExistingUsers(prev => prev.map(u => u.id === eu.id ? { ...u, is_admin: newAdmin } : u));
    toast({ title: `Permissão atualizada com sucesso` });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!sigla.trim()) newErrors.sigla = "Sigla é obrigatória";
    if (!uf) newErrors.uf = "UF é obrigatória";
    if (!cidade) newErrors.cidade = "Cidade é obrigatória";
    if (!dataInicio) newErrors.dataInicio = "Data de início é obrigatória";

    if (!isEditing) {
      const hasAdmin = usuarios.some(u => u.isAdmin);
      if (!hasAdmin) newErrors.usuarios = "É necessário ao menos 1 usuário administrador do órgão";
    }

    usuarios.forEach((u, i) => {
      if (!u.nome.trim()) newErrors[`user_${i}_nome`] = "Nome é obrigatório";
      if (!u.email.trim()) newErrors[`user_${i}_email`] = "E-mail é obrigatório";
      if (!u.login.trim()) newErrors[`user_${i}_login`] = "Login é obrigatório";
      if (!u.senha.trim()) newErrors[`user_${i}_senha`] = "Senha é obrigatória";
      if (u.senha.length > 0 && u.senha.length < 6) newErrors[`user_${i}_senha`] = "Senha deve ter no mínimo 6 caracteres";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const orgaoData = {
        nome: nome.trim(),
        sigla: sigla.trim().toUpperCase(),
        uf, cidade,
        data_inicio: format(dataInicio!, "yyyy-MM-dd"),
        data_termino: dataTermino ? format(dataTermino, "yyyy-MM-dd") : null,
        pacote_processos: pacoteProcessos ? parseInt(pacoteProcessos) : null,
        ativo,
      };

      let orgaoId = id;

      if (isEditing) {
        const { error } = await supabase.from("orgaos").update(orgaoData).eq("id", id);
        if (error) throw error;
      } else {
        const { data: orgao, error: orgaoError } = await supabase.from("orgaos").insert(orgaoData).select().single();
        if (orgaoError) throw orgaoError;
        orgaoId = (orgao as any).id;
      }

      // Create new users (both modes)
      for (const u of usuarios) {
        const res = await supabase.functions.invoke("create-org-user", {
          body: {
            email: u.email.trim(),
            password: u.senha,
            nome: u.nome.trim(),
            login: u.login.trim(),
            is_admin: u.isAdmin,
            orgao_id: orgaoId,
          },
        });
        if (res.error || res.data?.error) {
          throw new Error(res.data?.error || res.error?.message || "Erro ao criar usuário");
        }
      }

      const msg = isEditing ? "Órgão atualizado com sucesso!" : "Órgão criado com sucesso!";
      const desc = usuarios.length > 0 ? `${usuarios.length} novo(s) usuário(s) criado(s).` : undefined;
      toast({ title: msg, description: desc });
      navigate("/admin/orgaos");
    } catch (err: any) {
      toast({ title: isEditing ? "Erro ao atualizar órgão" : "Erro ao criar órgão", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (roleLoading || loadingOrgao) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orgaos")}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{isEditing ? "Editar Órgão" : "Novo Órgão"}</h1>
          <p className="text-muted-foreground mt-1">{isEditing ? "Altere os dados do órgão" : "Preencha os dados do órgão e seus usuários"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Org data card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-accent" />Dados do Órgão</CardTitle>
            <CardDescription>{isEditing ? "Edite as informações do órgão" : "Preencha as informações do novo órgão"}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="org-nome">Nome *</Label>
              <Input id="org-nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do órgão" />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-sigla">Sigla *</Label>
              <Input id="org-sigla" value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Ex: PMSP" maxLength={10} />
              {errors.sigla && <p className="text-xs text-destructive">{errors.sigla}</p>}
            </div>
            <div className="space-y-2">
              <Label>UF *</Label>
              <Select value={uf} onValueChange={setUf} disabled={loadingUfs}>
                <SelectTrigger><SelectValue placeholder={loadingUfs ? "Carregando UFs..." : "Selecione a UF"} /></SelectTrigger>
                <SelectContent>{ufs.map(u => (<SelectItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.nome}</SelectItem>))}</SelectContent>
              </Select>
              {errors.uf && <p className="text-xs text-destructive">{errors.uf}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Select value={cidade} onValueChange={setCidade} disabled={loadingCidades || !uf}>
                <SelectTrigger><SelectValue placeholder={loadingCidades ? "Carregando cidades..." : "Selecione a cidade"} /></SelectTrigger>
                <SelectContent>{cidades.map(c => (<SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>))}</SelectContent>
              </Select>
              {errors.cidade && <p className="text-xs text-destructive">{errors.cidade}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {errors.dataInicio && <p className="text-xs text-destructive">{errors.dataInicio}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataTermino && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{dataTermino ? format(dataTermino, "dd/MM/yyyy") : "Opcional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataTermino} onSelect={setDataTermino} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-pacote">Pacote de Processos</Label>
              <Input id="org-pacote" type="number" min={0} value={pacoteProcessos} onChange={e => setPacoteProcessos(e.target.value)} placeholder="Opcional" />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                  <span className="text-sm text-muted-foreground">{ativo ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing users (edit mode) */}
        {isEditing && existingUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-accent" />Usuários Vinculados</CardTitle>
              <CardDescription>Usuários já cadastrados neste órgão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingUsers.map(eu => (
                      <TableRow key={eu.id}>
                        <TableCell className="font-medium">{eu.nome}</TableCell>
                        <TableCell>{eu.login}</TableCell>
                        <TableCell>
                          <Badge variant={eu.is_admin ? "default" : "outline"}>
                            {eu.is_admin ? "Admin" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={eu.ativo ? "default" : "secondary"}>
                            {eu.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleExistingUserAdmin(eu)}>
                            {eu.is_admin ? "Remover Admin" : "Tornar Admin"}
                          </Button>
                          <Button type="button" variant={eu.ativo ? "destructive" : "default"} size="sm" onClick={() => toggleExistingUserStatus(eu)}>
                            {eu.ativo ? "Inativar" : "Ativar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New users section */}
        {(!isEditing || showNewUserForm || usuarios.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-accent" />{isEditing ? "Adicionar Novos Usuários" : "Usuários do Órgão"}</CardTitle>
                  <CardDescription>{isEditing ? "Cadastre novos usuários para este órgão" : "Cadastre ao menos 1 administrador do órgão"}</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addUser}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Usuário
                </Button>
              </div>
              {errors.usuarios && <p className="text-sm text-destructive mt-2">{errors.usuarios}</p>}
            </CardHeader>
            <CardContent className="space-y-6">
              {usuarios.map((u, i) => (
                <div key={i} className="p-4 border border-border rounded-xl space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Novo Usuário {i + 1}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`admin-${i}`} className="text-xs text-muted-foreground">Admin do Órgão</Label>
                        <Switch id={`admin-${i}`} checked={u.isAdmin} onCheckedChange={v => updateUser(i, "isAdmin", v)} />
                      </div>
                      {(usuarios.length > 1 || isEditing) && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUser(i)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={u.nome} onChange={e => updateUser(i, "nome", e.target.value)} placeholder="Nome completo" />
                      {errors[`user_${i}_nome`] && <p className="text-xs text-destructive">{errors[`user_${i}_nome`]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail *</Label>
                      <Input type="email" value={u.email} onChange={e => updateUser(i, "email", e.target.value)} placeholder="email@orgao.gov.br" />
                      {errors[`user_${i}_email`] && <p className="text-xs text-destructive">{errors[`user_${i}_email`]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Login *</Label>
                      <Input value={u.login} onChange={e => updateUser(i, "login", e.target.value)} placeholder="login.usuario" />
                      {errors[`user_${i}_login`] && <p className="text-xs text-destructive">{errors[`user_${i}_login`]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <div className="relative">
                        <Input type={u.showPassword ? "text" : "password"} value={u.senha} onChange={e => updateUser(i, "senha", e.target.value)} placeholder="Mínimo 6 caracteres" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => updateUser(i, "showPassword", !u.showPassword)}>
                          {u.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {errors[`user_${i}_senha`] && <p className="text-xs text-destructive">{errors[`user_${i}_senha`]}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add user button when editing and no new user form shown */}
        {isEditing && !showNewUserForm && usuarios.length === 0 && (
          <Button type="button" variant="outline" onClick={addUser} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Usuário ao Órgão
          </Button>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/orgaos")}>Cancelar</Button>
          <Button type="submit" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isEditing ? <Save className="w-4 h-4 mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
            {isEditing ? "Salvar Alterações" : "Cadastrar Órgão"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CadastroOrgaos;
