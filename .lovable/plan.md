

## Plan: Move "Classificação CSV" into the "Configurações" page as a new section

### Changes

1. **`src/pages/ConfiguracaoPrecificacao.tsx`** -- Merge the CSV classification logic directly into this page as a new Card section (between "Configurações Gerais" and "Sites de Referência"):
   - Import `Textarea`, `FileCode2`, `RotateCcw`, `Info` from their respective modules
   - Add state for `prompt`, `lastUpdate`, `saving` (from the CSV page)
   - Add the `useEffect` to load the prompt from `configuracao_sistema` filtered by org
   - Add `handleSavePrompt` and `handleRestore` functions
   - Render a new Card with the prompt textarea, save/restore buttons, and the "Como funciona" info box
   - Reuse the existing `configData` query (already fetches `prompt_classificacao_csv`) to populate the prompt state

2. **`src/App.tsx`** -- Remove the `/configuracoes/classificacao-csv` route and the `ConfiguracaoClassificacaoCsv` import

3. **`src/components/layout/AppSidebar.tsx`** -- Remove the "Classificação CSV" nav item from `navItems`

4. **`src/pages/ConfiguracaoClassificacaoCsv.tsx`** -- Can be deleted (no longer used)

### Notes
- The existing `configData` query in `ConfiguracaoPrecificacao` already fetches `prompt_classificacao_csv`, so we can reuse it to initialize the prompt state without an extra query
- The prompt textarea height will be reduced from `min-h-[500px]` to `min-h-[300px]` to fit better as a section within a larger page

