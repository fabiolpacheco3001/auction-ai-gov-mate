import { FileText, FileDown, FileCheck, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchLotesComBens, downloadPdf, downloadXlsx, downloadDocx } from "@/services/DocumentoLoteService";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusStyles: Record<string, string> = {
  rascunho: "bg-warning/10 text-warning",
  finalizado: "bg-success/10 text-success",
};

const Documentos = () => {
  const { data: documentos = [] } = useQuery({
    queryKey: ["documentos"],
    queryFn: async () => {
      const { data } = await supabase.from("documentos").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleDownload = async (doc: any, format: "pdf" | "xlsx" | "docx") => {
    if (!doc.processo_id) {
      toast.error("Documento sem processo associado.");
      return;
    }

    try {
      const lotes = await fetchLotesComBens(doc.processo_id);
      if (!lotes || lotes.length === 0) {
        toast.error("Nenhum lote encontrado para este processo.");
        return;
      }

      if (format === "pdf") {
        await downloadPdf(doc.processo_titulo, lotes);
      } else if (format === "xlsx") {
        await downloadXlsx(doc.processo_titulo, lotes);
      } else {
        await downloadDocx(doc.processo_titulo, lotes);
      }
      toast.success(`Documento ${format.toUpperCase()} gerado com sucesso!`);
    } catch (err) {
      console.error("Erro ao gerar documento:", err);
      toast.error("Erro ao gerar documento.");
    }
  };
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
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                Documento
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                Processo
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                Tipo
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                Status
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {documentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  Nenhum documento gerado ainda.
                </td>
              </tr>
            )}
            {documentos.map((doc) => (
              <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {doc.data}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{doc.processo_titulo}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {doc.tipo}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusStyles[doc.status] ?? "")}>
                    {doc.status === "finalizado" ? "Finalizado" : "Rascunho"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {doc.status === "finalizado" && doc.processo_id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                          <FileDown className="w-4 h-4" />
                          Baixar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc, "pdf")}>📄 Baixar PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc, "xlsx")}>📊 Baixar XLSX</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc, "docx")}>📝 Baixar DOCX</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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
