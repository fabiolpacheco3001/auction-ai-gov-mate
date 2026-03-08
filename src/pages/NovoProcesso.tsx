import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle2, Loader2, ArrowRight, Plug, Download, Info, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { CsvClassificationService, ClassificationResult } from "@/services/CsvClassificationService";
import { ExcelParsingService } from "@/services/ExcelParsingService";
import { useOrgFilter } from "@/hooks/useOrgFilter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const EXCEL_EXTENSIONS = [".xlsx", ".xls"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function isExcelFile(f: File) {
  return EXCEL_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext));
}
function isImageFile(f: File) {
  return IMAGE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext));
}

const generateTemplateXlsx = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Modelo");
  const headers = [
    "Número de Tombamento",
    "Descrição do Bem",
    "Categoria (veiculos/eletronicos/moveis/maquinario/outros)",
    "Estado de Conservação (bom/regular/ruim/inservivel)",
    "Localização",
    "Município",
    "Quantidade",
    "Valor Estimado (R$)",
  ];
  sheet.addRow(headers);
  const exampleRows = [
    ["VEI-2010-001", "Fiat Uno 2010 - Placa ABC-1234", "veiculos", "inservivel", "Garagem Central", "São Paulo", 1, 4500.0],
    ["ELE-2015-044", "Computador Desktop Dell OptiPlex 7010", "eletronicos", "ruim", "Almoxarifado TI", "Campinas", 3, 150.0],
    ["MOV-2010-201", "Mesa de escritório em MDF 1.20m", "moveis", "ruim", "Depósito Sede", "Curitiba", 5, 45.0],
    ["MAQ-2009-010", "Compressor de ar industrial 200L", "maquinario", "inservivel", "Galpão Manutenção", "Belo Horizonte", 1, 800.0],
  ];
  exampleRows.forEach((row) => sheet.addRow(row));

  // Style header row
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });
  sheet.columns.forEach((col) => {
    col.width = 30;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_bens_patrimoniais.xlsx";
  a.click();
  URL.revokeObjectURL(url);
};

const NovoProcesso = () => {
  const navigate = useNavigate();
  const { selectedOrgId } = useOrgFilter();
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [imageStats, setImageStats] = useState({ total: 0, matched: 0, discarded: 0 });
  const [imageMap, setImageMap] = useState<Map<string, File>>(new Map());

  const excelFiles = files.filter(isExcelFile);
  const imageFiles = files.filter(isImageFile);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const valid = newFiles.filter((f) => isExcelFile(f) || isImageFile(f));
    if (valid.length < newFiles.length) {
      toast({
        title: "Arquivos ignorados",
        description: "Apenas planilhas Excel (.xlsx, .xls) e imagens (.jpg, .png) são aceitos.",
        variant: "destructive",
      });
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) addFiles(selected);
    e.target.value = "";
  };

  const handleProcess = async () => {
    const excels = files.filter(isExcelFile);
    const images = files.filter(isImageFile);

    if (excels.length === 0) {
      toast({ title: "Planilha obrigatória", description: "Envie pelo menos uma planilha Excel.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setClassificationResult(null);

    try {
      // 1. Parse Excel files
      const rows = await ExcelParsingService.parseMultipleFiles(excels);

      // 2. Match images by tombamento
      const matched = ExcelParsingService.matchImages(rows, images);
      setImageMap(matched);
      setImageStats({
        total: images.length,
        matched: matched.size,
        discarded: images.length - matched.size,
      });

      // 3. Load org prompt
      let configQuery = supabase.from("configuracao_sistema").select("prompt_classificacao_csv");
      if (selectedOrgId) {
        configQuery = configQuery.eq("orgao_id", selectedOrgId);
      } else {
        configQuery = configQuery.is("orgao_id", null);
      }
      const { data: configData } = await configQuery.maybeSingle();
      const promptConfigurado = configData?.prompt_classificacao_csv || "";

      // 4. Classify
      const result = await CsvClassificationService.classificarDados(rows, promptConfigurado, selectedOrgId);

      // 5. Attach imagemVinculada to items
      for (const lote of result.lotes) {
        for (const item of lote.itens) {
          const tomb = item.tombamento?.trim().toLowerCase();
          if (tomb && matched.has(tomb)) {
            item.imagemVinculada = matched.get(tomb)!.name;
          }
        }
      }

      setClassificationResult(result);
    } catch (err) {
      console.error("Erro no processamento:", err);
      toast({ title: "Erro", description: "Falha ao processar os arquivos.", variant: "destructive" });
    }

    setProcessing(false);
    setDone(true);
  };

  const totalItensComImagem = classificationResult?.lotes.reduce(
    (acc, l) => acc + l.itens.filter((i) => i.imagemVinculada).length,
    0
  ) ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Novo Processo de Alienação</h1>
          <p className="text-muted-foreground mt-1">
            Envie planilhas Excel e fotos dos bens patrimoniais para processamento automático com IA
          </p>
        </div>
        <Button variant="outline" onClick={generateTemplateXlsx} className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          Baixar Planilha Modelo
        </Button>
      </div>

      {/* Upload area */}
      {!processing && !done && (
        <>
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
              accept=".xlsx,.xls,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={handleInputChange}
            />
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">
              Arraste os arquivos aqui ou clique para selecionar
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Envie planilhas Excel e, opcionalmente, fotos nomeadas pelo tombamento
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FileSpreadsheet className="w-4 h-4 text-success" />
                <span>Excel (.xlsx, .xls)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ImageIcon className="w-4 h-4 text-info" />
                <span>Imagens (.jpg, .png)</span>
              </div>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {excelFiles.length} planilha{excelFiles.length !== 1 ? "s" : ""} · {imageFiles.length} imagem{imageFiles.length !== 1 ? "ns" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>Limpar tudo</Button>
              </div>
              <div className="bg-card border border-border rounded-xl divide-y divide-border max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2 text-sm">
                    {isExcelFile(f) ? (
                      <FileSpreadsheet className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-info shrink-0" />
                    )}
                    <span className="truncate flex-1 text-foreground">{f.name}</span>
                    <span className="text-muted-foreground text-xs">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleProcess}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
                disabled={excelFiles.length === 0}
              >
                Processar Arquivos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Processing state */}
      {processing && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-card">
          <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Processando com IA...
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Extraindo dados, classificando bens e formando lotes otimizados
          </p>
          <div className="max-w-sm mx-auto space-y-3">
            {["Lendo planilhas...", "Vinculando imagens...", "Classificando categorias...", "Formando lotes..."].map((step, i) => (
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
      {done && !processing && (
        <div className="bg-card border border-success/30 rounded-2xl p-10 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Processamento Concluído!
          </h3>
          <p className="text-muted-foreground text-sm mb-2">
            <strong className="text-foreground">{classificationResult?.totalRegistros ?? 0} bens</strong> identificados ·{" "}
            <strong className="text-foreground">{classificationResult?.totalLotes ?? 0} lotes</strong> formados
          </p>
          {imageStats.total > 0 && (
            <p className="text-muted-foreground text-sm mb-2">
              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
              <strong className="text-foreground">{imageStats.matched}</strong> bens com imagem vinculada
              {imageStats.discarded > 0 && (
                <span className="text-muted-foreground/60"> · {imageStats.discarded} imagens descartadas</span>
              )}
            </p>
          )}

          {classificationResult && (classificationResult.errosEncontrados.length > 0 || classificationResult.avisos.length > 0) && (
            <div className="text-left bg-muted/50 border border-border rounded-xl p-4 my-4 space-y-3 max-w-md mx-auto">
              {classificationResult.errosEncontrados.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1">Erros ({classificationResult.errosEncontrados.length})</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {classificationResult.errosEncontrados.slice(0, 5).map((e, i) => <li key={i}>• {typeof e === "string" ? e : JSON.stringify(e)}</li>)}
                    {classificationResult.errosEncontrados.length > 5 && <li className="text-muted-foreground/60">...e mais {classificationResult.errosEncontrados.length - 5}</li>}
                  </ul>
                </div>
              )}
              {classificationResult.avisos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-warning mb-1">Avisos ({classificationResult.avisos.length})</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {classificationResult.avisos.slice(0, 5).map((a, i) => <li key={i}>• {typeof a === "string" ? a : JSON.stringify(a)}</li>)}
                    {classificationResult.avisos.length > 5 && <li className="text-muted-foreground/60">...e mais {classificationResult.avisos.length - 5}</li>}
                  </ul>
                </div>
              )}
              {classificationResult.sugestoes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-info mb-1">Sugestões ({classificationResult.sugestoes.length})</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {classificationResult.sugestoes.slice(0, 3).map((s, i) => <li key={i}>• {typeof s === "string" ? s : JSON.stringify(s)}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-muted-foreground text-sm mb-6">
            Arrecadação estimada: <strong className="text-success">
              R$ {(classificationResult?.lotes?.reduce((s, l) => s + (l.valorTotal ?? 0), 0) ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </strong>
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => { setFiles([]); setDone(false); setClassificationResult(null); setImageMap(new Map()); }}
            >
              Novo Upload
            </Button>
            <Button
              onClick={() => navigate("/revisao-lotes", { state: { classificationResult, fileName: excelFiles.map((f) => f.name).join(", "), imageMap: Object.fromEntries(imageMap) } })}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium px-6"
              disabled={!!classificationResult && classificationResult.errosEncontrados.length > 0}
            >
              Revisar Lotes Gerados <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p>
            Os dados serão validados e classificados conforme as regras definidas em{" "}
            <Link to="/configuracoes/classificacao-csv" className="text-accent font-medium hover:underline inline-flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" /> Configurações &gt; Classificação de Dados
            </Link>
          </p>
          <p className="mt-1">
            <strong>Dica:</strong> Nomeie as fotos com o Número de Tombamento (ex: <code className="bg-muted px-1 rounded text-xs">VEI-2010-001.jpg</code>) para vinculação automática.
          </p>
        </div>
      </div>

      {/* API integration docs */}
      <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Plug className="w-5 h-5 text-info" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Integração via API</h4>
            <p className="text-sm text-muted-foreground">
              Envie itens diretamente do seu sistema patrimonial (SIADS, ASI, SIPAC e outros) via API REST.
              Gerencie seus tokens em{" "}
              <Link to="/configuracoes/api-token" className="text-accent font-medium hover:underline">
                API Access Token
              </Link>.
            </p>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Endpoint</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block font-mono break-all">
            POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/intake-items
          </code>

          <p className="text-xs font-semibold text-foreground mt-3">Headers</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block font-mono">
            Authorization: Bearer &lt;seu_token&gt;{"\n"}Content-Type: application/json
          </code>

          <p className="text-xs font-semibold text-foreground mt-3">Corpo da requisição (JSON)</p>
          <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto whitespace-pre">{`{
  "titulo": "Processo - Lote Veículos 2026",
  "itens": [
    {
      "tombamento": "VEI-2010-001",
      "descricao": "Fiat Uno 2010 - Placa ABC-1234",
      "categoria": "veiculos",
      "estado": "inservivel",
      "localizacao": "Garagem Central",
      "municipio": "São Paulo",
      "quantidade": 1,
      "valor_estimado": 4500.00
    }
  ]
}`}</pre>
          <p className="text-xs text-muted-foreground mt-1">
            <Info className="w-3 h-3 inline mr-1" />
            O órgão é identificado automaticamente pelo token utilizado na requisição.
          </p>

          <p className="text-xs font-semibold text-foreground mt-3">Resposta de sucesso (201)</p>
          <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto whitespace-pre">{`{
  "sucesso": true,
  "processo_id": "uuid",
  "total_bens": 1,
  "total_lotes": 1,
  "mensagem": "Processo criado com sucesso."
}`}</pre>

          <p className="text-xs text-muted-foreground mt-2">
            Os lotes serão criados automaticamente agrupados por categoria com status <strong>pendente</strong>.
            Aprove-os na tela de <Link to="/lotes" className="text-accent hover:underline">Lotes Gerados</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NovoProcesso;
