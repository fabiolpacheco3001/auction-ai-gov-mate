

## Plan: Fix pricing prompt to use per-site values instead of valorMedioLeilao

### Problem
The `classify-csv` prompt correctly asks for `precificacao` with `valorMedioPorSite` (per-site pricing), but it also redundantly mentions `valorMedioLeilao` in the instructions (line 138), causing confusion. The `intake-items` function uses the OLD prompt format that only asks for `valorMedioLeilao` (a single value) instead of the per-site `precificacao` structure, so API-submitted items never get proper site1/site2/site3 values.

### Changes

#### 1. `supabase/functions/classify-csv/index.ts`
- Remove the contradictory `"valorMedioLeilao": number | null` from the INSTRUÇÕES DE PRECIFICAÇÃO section (line 138) and the "Retorne null se a confiança for inferior a 70 porcento" line
- Keep the detailed precificacao instructions and JSON format already in place (lines 107-117, 167-196) -- these are correct
- Update system message (line 226) to reference `precificacao` instead of `valorMedioLeilao`

#### 2. `supabase/functions/intake-items/index.ts`
- Replace the INSTRUÇÕES DE PRECIFICAÇÃO section (lines 210-235) with the same per-site pricing instructions used in classify-csv
- Replace the FORMATO DE RESPOSTA (lines 237-273) to include `precificacao` object instead of `valorMedioLeilao`
- Add the precificacao format rules (same as classify-csv lines 190-195)
- Update the system message (line 304) to reference `precificacao` instead of `valorMedioLeilao`
- Update the bens extraction logic (lines 367-393): remove `valorMedioLeilao` references, extract site values only from `precificacao.valorMedioPorSite`
- Update the lote price fallback (line 443): use `precificacao.valorMedioGeral` instead of `valorMedioLeilao`

#### 3. `src/services/CsvClassificationService.ts`
- Remove the `valorMedioLeilao` field from the `LoteItem` interface (line 17) since it's no longer returned

### Summary
Both edge functions will use identical precificacao instructions requesting per-site values, and the extraction logic in intake-items will correctly read `precificacao.valorMedioPorSite[0..2]` to populate `valor_medio_site1/2/3`.

