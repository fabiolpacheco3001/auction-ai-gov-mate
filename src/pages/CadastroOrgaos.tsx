import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Building2, Loader2, Trash2, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface UF {
  id: number;
  sigla: string;
  nome: string;
}

interface Cidade {
  id: number;
  nome: string;
}

interface UserForm {
  nome: string;
  email: string;
  login: string;
  senha: string;
  isAdmin: boolean;
  showPassword: boolean;
}

const emptyUser = (): UserForm => ({
  nome: "",
  email: "",
  login: "",
  senha: "",
  isAdmin: true,
  showPassword: false,
});

const CadastroOrgaos = () => {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataTermino, setDataTermino] = useState<Date>();
  const [pacoteProcessos, setPacoteProcessos] = useState("");

  const [ufs, setUfs] = useState<UF[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loadingUfs, setLoadingUfs] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);

  const [usuarios, setUsuarios] = useState<UserForm[]>([emptyUser()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUfs = async () => {
      setLoadingUfs(true);
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        const data = await res.json();
        setUfs(data);
      } catch {
        toast({ title: "Erro ao carregar UFs", variant: "destructive" });
      }
      setLoadingUfs(false);
    };
    fetchUfs();
  }, []);

  useEffect(() => {
    if (!uf) { setCidades([]); setCidade(""); return; }
    const fetchCidades = async () => {
      setLoadingCidades(true);
      setCidade("");
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        const data = await res.json();
        setCidades(data);
      } catch {
        toast({ title: "Erro ao carregar cidades", variant: "destructive" });
      }
      setLoadingCidades(false);
    };
    fetchCidades();
  }, [uf]);

  const updateUser = (index: number, field: keyof UserForm, value: any) => {
    setUsuarios(prev => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  };

  const addUser = () => {
    setUsuarios(prev => [...prev, { ...emptyUser(), isAdmin: false }]);
  };

  const removeUser = (index: number) => {
    if (usuarios.length <= 1) return;
    setUsuarios(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!sigla.trim()) newErrors.sigla = "Sigla é obrigatória";
    if (!uf) newErrors.uf = "UF é obrigatória";
    if (!cidade) newErrors.cidade = "Cidade é obrigatória";
    if (!dataInicio) newErrors.dataInicio = "Data de início é obrigatória";

    const hasAdmin = usuarios.some(u => u.isAdmin);
    if (!hasAdmin) newErrors.usuarios = "É necessário ao menos 1 usuário administrador do órgão";

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
      const { data: orgao, error: orgaoError } = await supabase
        .from("orgaos")
        .insert({
          nome: nome.trim(),
          sigla: sigla.trim().toUpperCase(),
          uf,
          cidade,
          data_inicio: format(dataInicio!, "yyyy-MM-dd"),
          data_termino: dataTermino ? format(dataTermino, "yyyy-MM-dd") : null,
          pacote_processos: pacoteProcessos ? parseInt(pacoteProcessos) : null,
        })
        .select()
        .single();

      if (orgaoError) throw orgaoError;

      for (const u of usuarios) {
        const res = await supabase.functions.invoke("create-org-user", {
          body: {
            email: u.email.trim(),
            password: u.senha,
            nome: u.nome.trim(),
            login: u.login.trim(),
            is_admin: u.isAdmin,
            orgao_id: (orgao as any).id,
          },
        });

        if (res.error || res.data?.error) {
          throw new Error(res.data?.error || res.error?.message || "Erro ao criar usuário");
        }
      }

      toast({ title: "Órgão criado com sucesso!", description: `${nome} foi cadastrado com ${usuarios.length} usuário(s).` });
      navigate("/admin/orgaos");
    } catch (err: any) {
      toast({ title: "Erro ao criar órgão", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orgaos")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Novo Órgão</h1>
          <p className="text-muted-foreground mt-1">Preencha os dados do órgão e seus usuários</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Dados do Órgão
            </CardTitle>
            <CardDescription>Preencha as informações do novo órgão</CardDescription>
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
                <SelectContent>
                  {ufs.map(u => (<SelectItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.uf && <p className="text-xs text-destructive">{errors.uf}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Select value={cidade} onValueChange={setCidade} disabled={loadingCidades || !uf}>
                <SelectTrigger><SelectValue placeholder={loadingCidades ? "Carregando cidades..." : "Selecione a cidade"} /></SelectTrigger>
                <SelectContent>
                  {cidades.map(c => (<SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.cidade && <p className="text-xs text-destructive">{errors.cidade}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataTermino ? format(dataTermino, "dd/MM/yyyy") : "Opcional"}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-accent" />
                  Usuários do Órgão
                </CardTitle>
                <CardDescription>Cadastre ao menos 1 administrador do órgão</CardDescription>
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
                  <span className="text-sm font-medium text-foreground">Usuário {i + 1}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`admin-${i}`} className="text-xs text-muted-foreground">Admin do Órgão</Label>
                      <Switch id={`admin-${i}`} checked={u.isAdmin} onCheckedChange={v => updateUser(i, "isAdmin", v)} />
                    </div>
                    {usuarios.length > 1 && (
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
                      <Input
                        type={u.showPassword ? "text" : "password"}
                        value={u.senha}
                        onChange={e => updateUser(i, "senha", e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
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

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/orgaos")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
            Cadastrar Órgão
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CadastroOrgaos;
