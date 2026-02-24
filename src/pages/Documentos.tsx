import { FileText, FileDown, FileCheck, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const documentos = [
  { id: "d1", nome: "Edital de Alienação - Lote Veículos", processo: "Alienação de Bens - 1º Semestre 2026", tipo: "Edital", status: "rascunho", data: "2026-02-22" },
  { id: "d2", nome: "Termo de Avaliação - Equipamentos TI", processo: "Leilão Equipamentos TI", tipo: "Avaliação", status: "finalizado", data: "2026-02-18" },
  { id: "d3", nome: "Relatório de Classificação - Mobiliário", processo: "Alienação Mobiliário Sede", tipo: "Relatório", status: "finalizado", data: "2026-02-01" },
  { id: "d4", nome: "Ata de Resultado - Leilão Frota 2025", processo: "Desfazimento Frota 2025", tipo: "Ata", status: "finalizado", data: "2026-02-16" },
  { id: "d5", nome: "Minuta de Edital - Climatização", processo: "Alienação de Bens - 1º Semestre 2026", tipo: "Edital", status: "rascunho", data: "2026-02-23" },
];

const statusStyles: Record<string, string> = {
  rascunho: "bg-warning/10 text-warning",
  finalizado: "bg-success/10 text-success",
};

const Documentos = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground mt-1">Geração e exportação de documentos para leilão</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" /> Filtrar
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Documento</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Processo</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Tipo</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{doc.data}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{doc.processo}</td>
                <td className="px-5 py-3.5 text-center"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{doc.tipo}</span></td>
                <td className="px-5 py-3.5 text-center"><span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusStyles[doc.status])}>{doc.status === "finalizado" ? "Finalizado" : "Rascunho"}</span></td>
                <td className="px-5 py-3.5 text-center">
                  <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Baixar">
                    {doc.status === "finalizado" ? <FileDown className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Documentos;
