
-- Add numero column
ALTER TABLE processos ADD COLUMN numero integer;

-- Create function to get next sequential number per year/orgao
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

-- Backfill existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY orgao_id, EXTRACT(YEAR FROM created_at)
    ORDER BY created_at
  ) AS rn
  FROM processos
)
UPDATE processos SET numero = numbered.rn FROM numbered WHERE processos.id = numbered.id;
