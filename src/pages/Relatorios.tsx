import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Package, Target } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const arrecadacaoMensal = [
  { mes: "Set", estimado: 18200, realizado: 21400 },
  { mes: "Out", estimado: 24500, realizado: 22800 },
  { mes: "Nov", estimado: 31000, realizado: 35200 },
  { mes: "Dez", estimado: 28700, realizado: 30100 },
  { mes: "Jan", estimado: 22300, realizado: 24600 },
  { mes: "Fev", estimado: 34500, realizado: 15420 },
];

const categoriaData = [
  { name: "Veículos", value: 58, color: "hsl(215, 55%, 18%)" },
  { name: "Eletrônicos", value: 22, color: "hsl(168, 55%, 38%)" },
  { name: "Móveis", value: 14, color: "hsl(38, 92%, 50%)" },
  { name: "Outros", value: 6, color: "hsl(215, 15%, 70%)" },
];

const Relatorios = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Desempenho e arrecadação dos leilões finalizados</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Leilões Finalizados" value={8} icon={Target} trend={{ value: 15, label: "" }} />
        <StatCard title="Total Arrecadado" value="R$ 149.520" icon={DollarSign} variant="success" />
        <StatCard title="Bens Alienados" value={112} icon={Package} variant="accent" />
        <StatCard title="Taxa de Sucesso" value="94%" icon={TrendingUp} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Arrecadação Mensal (Estimado vs Realizado)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={arrecadacaoMensal} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(215, 15%, 50%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 15%, 50%)" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="estimado" name="Estimado" fill="hsl(215, 55%, 18%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="hsl(168, 55%, 38%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Arrecadação por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoriaData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {categoriaData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {categoriaData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-muted-foreground">{cat.name}</span>
                </div>
                <span className="font-medium text-foreground">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
