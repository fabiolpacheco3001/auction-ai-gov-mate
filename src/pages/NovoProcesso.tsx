import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, FileText, CheckCircle2, Loader2, ArrowRight, Plug, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const generateTemplateCSV = () => {
  const BOM = "\uFEFF";
  const headers = [
    "Número de Tombamento",
    "Descrição do Bem",
    "Categoria (veiculos/eletronicos/moveis/maquinario/outros)",
    "Estado de Conservação (bom/regular/ruim/inservivel)",
    "Localização",
    "Valor Estimado (R$)",
  ];
  const exampleRows = [
    ["VEI-2010-001", "Fiat Uno 2010 - Placa ABC-1234", "veiculos", "inservivel", "Garagem Central", "4500,00"],
    ["ELE-2015-044", "Computador Desktop Dell OptiPlex 7010", "eletronicos", "ruim", "Almoxarifado TI", "150,00"],
    ["MOV-2010-201", "Mesa de escritório em MDF 1.20m", "moveis", "ruim", "Depósito Sede", "45,00"],
    ["MAQ-2009-010", "Compressor de ar industrial 200L", "maquinario", "inservivel", "Galpão Manutenção", "800,00"],
  ];
  const csv = BOM + [headers, ...exampleRows].map(row => row.map(cell => `"${cell}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_bens_patrimoniais.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const NovoProcesso = () => {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Novo Processo de Alienação</h1>
          <p className="text-muted-foreground mt-1">
            Envie sua lista de bens patrimoniais e a IA irá processar automaticamente
          </p>
        </div>
        <Button
          variant="outline"
          onClick={generateTemplateCSV}
          className="shrink-0"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Planilha Modelo
        </Button>
      </div>

      {/* Upload area */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
            dragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border hover:border-accent/50 hover:bg-muted/30"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.pdf,.csv"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Upload className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Arraste o arquivo aqui ou clique para selecionar
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Suportamos arquivos Excel (.xlsx, .xls), CSV e PDF
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileSpreadsheet className="w-4 h-4 text-success" />
              <span>Excel / CSV</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="w-4 h-4 text-destructive" />
              <span>PDF</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing state */}
      {file && processing && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-card">
          <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Processando com IA...
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Extraindo dados, classificando bens e formando lotes otimizados
          </p>
          <div className="max-w-sm mx-auto space-y-3">
            {["Lendo arquivo...", "Identificando itens...", "Classificando categorias...", "Formando lotes..."].map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-sm">
                {i < 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : i === 2 ? (
                  <Loader2 className="w-4 h-4 text-accent shrink-0 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                )}
                <span className={cn(i < 2 ? "text-muted-foreground" : i === 2 ? "text-foreground font-medium" : "text-muted-foreground/50")}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done state */}
      {file && done && (
        <div className="bg-card border border-success/30 rounded-2xl p-10 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Processamento Concluído!
          </h3>
          <p className="text-muted-foreground text-sm mb-2">
            <strong className="text-foreground">12 bens</strong> identificados · <strong className="text-foreground">4 lotes</strong> formados · Arquivo: {file.name}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Arrecadação estimada: <strong className="text-success">R$ 20.655,00</strong>
          </p>
          <Button
            onClick={() => navigate("/lotes")}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium px-6"
          >
            Revisar Lotes Gerados <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* API integration hint */}
      <div className="bg-muted/50 border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
          <Plug className="w-5 h-5 text-info" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Integração via API</h4>
          <p className="text-sm text-muted-foreground">
            Em breve será possível integrar diretamente com seu sistema patrimonial (SIADS, ASI, SIPAC e outros)
            para importação automática dos dados, eliminando a etapa de upload manual.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NovoProcesso;
