

## Plan: Rename "Número de Tombamento" e "Tombamento" para "Código do Bem"

### Overview
Substituir todas as ocorrências visíveis ao usuário de "Número de Tombamento" e "Tombamento" por "Código do Bem" na UI, nos documentos gerados e na planilha modelo. Os nomes internos do banco de dados e variáveis (`tombamento`) permanecem inalterados para não quebrar o modelo de dados nem a API.

### Changes

#### 1. `src/pages/NovoProcesso.tsx`
- Cabeçalho do template Excel: `"Número de Tombamento"` → `"Código do Bem"`
- Texto da dica/info box: "Nomeie as fotos com o **Código do Bem**..."
- Qualquer label/instrução visível mencionando "Tombamento"

#### 2. `src/services/DocumentoLoteService.ts`
- Cabeçalho de coluna no PDF: `"Tombamento"` → `"Código do Bem"`
- Cabeçalho de coluna no XLSX: `"Tombamento"` → `"Código do Bem"`
- Cabeçalho de coluna no DOCX: `"Tombamento"` → `"Código do Bem"`

#### 3. `src/components/lotes/LoteItemsTable.tsx`
- Cabeçalho da coluna `"Tombamento"` → `"Código do Bem"`

#### 4. Outras referências de UI (buscar e atualizar todas as strings)
- `src/pages/RevisaoLotes.tsx`
- `src/pages/LotesGerados.tsx`
- `src/pages/ProcessoImagens.tsx`
- `src/pages/LoteImagens.tsx`
- Qualquer toast, placeholder, tooltip ou mensagem de erro que mencione "Tombamento" ou "Número de Tombamento"

### What stays unchanged
- Coluna `tombamento` do banco de dados
- Nomes de campos TypeScript (`item.tombamento`, `Bem.tombamento`)
- Chave JSON `tombamento` no payload da edge function `intake-items`
- Lógica de matching de imagens (nomes de arquivo continuam comparados ao valor de `tombamento`)

### Files
- **Edit**: `src/pages/NovoProcesso.tsx`
- **Edit**: `src/services/DocumentoLoteService.ts`
- **Edit**: `src/components/lotes/LoteItemsTable.tsx`
- **Edit**: `src/pages/RevisaoLotes.tsx`, `LotesGerados.tsx`, `ProcessoImagens.tsx`, `LoteImagens.tsx` (todas as ocorrências de string)

