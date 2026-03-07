import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgFilter } from "@/hooks/useOrgFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, DollarSign, Package, Target, Layers, Loader2, BarChart3 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS: Record<string, string> = {
  veículos: "hsl(215, 55%, 18%)",
  veiculos: "hsl(215, 55%, 18%)",
  "veículos leves": "hsl(215, 55%, 30%)",
  eletrônicos: "hsl(168, 55%, 38%)",
  eletronicos: "hsl(168, 55%, 38%)",
  móveis: "hsl(38, 92%, 50%)",
  moveis: "hsl(38, 92%, 50%)",
  maquinário: "hsl(280, 50%, 50%)",
  maquinario: "hsl(280, 50%, 50%)",
  outros: "hsl(215, 15%, 60%)",
  mista: "hsl(340, 55%, 50%)",
};

const getColor = (cat: string) => CATEGORY_COLORS[cat.toLowerCase()] || "hsl(215, 15%, 70%)";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Relatorios = () => {
  const { selectedOrgId, applyOrgFilter } = useOrgFilter();

  // Fetch processos
  const { data: processos = [], isLoading: loadingProcessos } = useQuery({
    queryKey: ["relatorios-processos", selectedOrgId],
    queryFn: async () => {
      let q = supabase.from("processos").select("*");
      q = applyOrgFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch lotes
  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ["relatorios-lotes", selectedOrgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch bens
  const { data: bens = [], isLoading: loadingBens } = useQuery({
    queryKey: ["relatorios-bens", selectedOrgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bens").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingProcessos || loadingLotes || loadingBens;

  // Filter lotes & bens by processos in scope
  const processoIds = useMemo(() => new Set(processos.map((p) => p.id)), [processos]);

  const filteredLotes = useMemo(
    () => lotes.filter((l) => l.processo_id && processoIds.has(l.processo_id)),
    [lotes, processoIds]
  );

  const filteredBens = useMemo(
    () => bens.filter((b) => b.processo_id && processoIds.has(b.processo_id)),
    [bens, processoIds]
  );

  // === Stats ===
  const stats = useMemo(() => {
    const totalProcessos = processos.length;
    const totalLotes = filteredLotes.length;
    const totalBens = filteredBens.reduce((s, b) => s + (b.quantidade || 1), 0);

    const arrecadacaoEstimada = processos.reduce((s, p) => s + Number(p.arrecadacao_estimada || 0), 0);
    const arrecadacaoReal = processos.reduce((s, p) => s + Number(p.arrecadacao_real || 0), 0);

    const lotesAprovados = filteredLotes.filter((l) => l.status === "aprovado").length;
    const taxaAprovacao = totalLotes > 0 ? Math.round((lotesAprovados / totalLotes) * 100) : 0;

    return { totalProcessos, totalLotes, totalBens, arrecadacaoEstimada, arrecadacaoReal, lotesAprovados, taxaAprovacao };
  }, [processos, filteredLotes, filteredBens]);

  // === Pie: Lotes by category ===
  const categoryPieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredLotes.forEach((l) => {
      const cat = l.categoria || "Outros";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: getColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLotes]);

  // === Bar: Value by category ===
  const categoryValueData = useMemo(() => {
    const map = new Map<string, { sugerido: number; aprovado: number }>();
    filteredLotes.forEach((l) => {
      const cat = l.categoria || "Outros";
      const prev = map.get(cat) || { sugerido: 0, aprovado: 0 };
      prev.sugerido += Number(l.preco_sugerido || 0);
      prev.aprovado += Number(l.preco_aprovado || 0);
      map.set(cat, prev);
    });
    return Array.from(map.entries())
      .map(([categoria, vals]) => ({ categoria, ...vals }))
      .sort((a, b) => b.sugerido - a.sugerido);
  }, [filteredLotes]);

  // === Table: Process summary ===
  const processoSummary = useMemo(() => {
    return processos
      .map((p) => {
        const pLotes = filteredLotes.filter((l) => l.processo_id === p.id);
        const pBens = filteredBens.filter((b) => b.processo_id === p.id);
        const valorSugerido = pLotes.reduce((s, l) => s + Number(l.preco_sugerido || 0), 0);
        const valorAprovado = pLotes.reduce((s, l) => s + Number(l.preco_aprovado || 0), 0);
        return {
          id: p.id,
          titulo: p.titulo,
          status: p.status,
          totalLotes: pLotes.length,
          totalBens: pBens.reduce((s, b) => s + (b.quantidade || 1), 0),
          valorSugerido,
          valorAprovado,
          createdAt: p.created_at,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [processos, filteredLotes, filteredBens]);

  // === Pie: Bens by estado ===
  const estadoPieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredBens.forEach((b) => {
      const estado = b.estado || "regular";
      map.set(estado, (map.get(estado) || 0) + (b.quantidade || 1));
    });
    const colors: Record<string, string> = {
      bom: "hsl(168, 55%, 38%)",
      regular: "hsl(38, 92%, 50%)",
      ruim: "hsl(15, 80%, 55%)",
      inservível: "hsl(0, 70%, 50%)",
      inservivel: "hsl(0, 70%, 50%)",
    };
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: colors[name.toLowerCase()] || "hsl(215, 15%, 60%)" }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBens]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      processando: { label: "Processando", variant: "secondary" },
      concluido: { label: "Concluído", variant: "default" },
      erro: { label: "Erro", variant: "outline" },
    };
    return map[s] || { label: s, variant: "outline" as const };
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada de processos, lotes e bens</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Processos" value={stats.totalProcessos} icon={Target} />
        <StatCard
          title="Arrecadação Estimada"
          value={formatCurrency(stats.arrecadacaoEstimada)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard title="Total de Bens" value={stats.totalBens} icon={Package} variant="accent" />
        <StatCard
          title="Lotes Aprovados"
          value={`${stats.lotesAprovados}/${stats.totalLotes}`}
          subtitle={`${stats.taxaAprovacao}% de aprovação`}
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar: Values by category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-accent" />
              Valores por Categoria (Sugerido vs Aprovado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryValueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryValueData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                    }
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="sugerido" name="Sugerido" fill="hsl(215, 55%, 18%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aprovado" name="Aprovado" fill="hsl(168, 55%, 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum lote disponível.</p>
            )}
          </CardContent>
        </Card>

        {/* Pie: Lotes by category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-5 h-5 text-accent" />
              Lotes por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categoryPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} lote(s)`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {categoryPieData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie: Estado de conservação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-accent" />
              Estado de Conservação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={estadoPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {estadoPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} ben(s)`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {estadoPieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        {/* Table: Process summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-accent" />
              Resumo por Processo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processoSummary.length > 0 ? (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Lotes</TableHead>
                      <TableHead className="text-center">Bens</TableHead>
                      <TableHead className="text-right">Valor Sugerido</TableHead>
                      <TableHead className="text-right">Valor Aprovado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processoSummary.map((p) => {
                      const st = statusLabel(p.status);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium max-w-[200px] truncate" title={p.titulo}>
                            {p.titulo}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{p.totalLotes}</TableCell>
                          <TableCell className="text-center">{p.totalBens}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.valorSugerido)}</TableCell>
                          <TableCell className="text-right">
                            {p.valorAprovado > 0 ? formatCurrency(p.valorAprovado) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum processo encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
