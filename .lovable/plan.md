

## Plan: Refactor "Novo Processo" for Multi-file Upload (Excel + Images)

### Overview
Replace the single-file CSV upload with a multi-file upload supporting Excel (.xls/.xlsx) and images (.jpg/.jpeg/.png). Images are matched to items by tombamento number. The existing classification service and edge function remain unchanged — only the client-side file handling changes.

### Changes

#### 1. Add `exceljs` for Excel parsing (already installed)
The project already has `exceljs@4.4.0` — will use it to read .xls/.xlsx files client-side.

#### 2. New service: `src/services/ExcelParsingService.ts`
- Read Excel file(s) using ExcelJS, extract rows with the same column mapping as the CSV parser
- Deduplicate rows across multiple Excel files by tombamento
- Return `Record<string, string>[]` (same format as `parseCsv`)

#### 3. Update `src/services/CsvClassificationService.ts`
- Rename to `ClassificationService.ts` (or add a new method)
- Add method `classificarDados(rows: Record<string, string>[], promptConfigurado: string, orgaoId?: string | null)` that accepts pre-parsed rows instead of a File
- Keep existing `classificarCsv` for backward compat or remove it
- Add `imagemVinculada?: string` field to `LoteItem` interface (filename of matched image)

#### 4. Rewrite `src/pages/NovoProcesso.tsx`

**State changes:**
- `file: File | null` → `files: File[]` (all uploaded files)
- Add `imageMap: Map<string, File>` (tombamento → image file)
- Add `stats: { totalImages, matchedImages, discardedImages }`

**Upload area:**
- `accept=".xlsx,.xls,.jpg,.jpeg,.png"` with `multiple` attribute
- Update drag/drop to handle `e.dataTransfer.files` (all files)
- Update labels: "Envie planilhas Excel e fotos dos bens"
- Show file list with counts after selection (X planilhas, Y imagens)

**Validation:**
- At least 1 Excel file required, show toast error if only images
- Images are optional

**Processing flow:**
1. Separate files into `excelFiles` and `imageFiles` by extension
2. Parse all Excel files → merge rows, deduplicate by tombamento
3. For each row, check if any image filename (without extension) matches the tombamento exactly (case-insensitive)
4. Build `imageMap` with matched images; discard unmatched images silently
5. Send rows to `classify-csv` edge function (same as before)
6. Attach `imagemVinculada` flag to each item in the result
7. Pass `imageMap` and result to RevisaoLotes via navigation state

**Done state updates:**
- Show matched image count: "X bens com imagem vinculada"
- Keep existing error/warning/suggestion display

**Template download:**
- Change from CSV to Excel (.xlsx) format using ExcelJS

#### 5. Minor: Update info text
- Change "Classificação de CSV" reference to "Classificação de Dados"
- Update supported formats text

### Files to create/edit
- **Create**: `src/services/ExcelParsingService.ts`
- **Edit**: `src/services/CsvClassificationService.ts` (add `imagemVinculada` to interface, add `classificarDados` method)
- **Edit**: `src/pages/NovoProcesso.tsx` (full rewrite of upload logic)

