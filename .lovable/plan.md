

## Plan: Add sequential numbering to processes by year

### Overview
Add a `numero` column to the `processos` table that auto-increments per year (e.g., 1, 2, 3...). Display as `"<numero>/<year> - <titulo>"` in Lotes Gerados.

### Changes

#### 1. Database migration
- Add `numero` integer column to `processos` table (nullable initially for existing data)
- Create a database function `get_next_processo_numero(p_orgao_id uuid)` that calculates the next sequential number for the current year, scoped by `orgao_id`
- Backfill existing rows with sequential numbers based on `created_at` order

```sql
ALTER TABLE processos ADD COLUMN numero integer;

CREATE OR REPLACE FUNCTION get_next_processo_numero(p_orgao_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero), 0) + 1
  FROM processos
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())
    AND (
      (p_orgao_id IS NULL AND orgao_id IS NULL)
      OR orgao_id = p_orgao_id
    )
$$;
```

- Backfill existing data with row_number per year/orgao

#### 2. Edit `src/pages/RevisaoLotes.tsx` (processo insert ~line 172-184)
- Before inserting, call `supabase.rpc('get_next_processo_numero', { p_orgao_id })` to get the next number
- Include `numero` in the insert payload

#### 3. Edit `supabase/functions/intake-items/index.ts` (processo insert ~line 218)
- Same logic: call `get_next_processo_numero` via supabaseAdmin before insert
- Include `numero` in the insert payload

#### 4. Edit `src/pages/LotesGerados.tsx`
- Add `numero` and `created_at` to the `Processo` interface (line 75-80)
- Fetch `numero` in the processos query (line 118)
- Update display (line 358): show `"<numero>/<year> - <titulo>"` instead of just `titulo`
  ```tsx
  const year = new Date(group.processo.created_at).getFullYear();
  const label = group.processo.numero
    ? `${String(group.processo.numero).padStart(3, '0')}/${year} - ${group.processo.titulo}`
    : group.processo.titulo;
  ```

### Files
- **Migration**: Add `numero` column + `get_next_processo_numero` function + backfill
- **Edit**: `src/pages/RevisaoLotes.tsx` — get next numero before insert
- **Edit**: `supabase/functions/intake-items/index.ts` — get next numero before insert
- **Edit**: `src/pages/LotesGerados.tsx` — add numero to interface/query/display

