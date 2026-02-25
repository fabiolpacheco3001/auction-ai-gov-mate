ALTER TABLE public.bens
  ADD COLUMN IF NOT EXISTS valor_medio_site1 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_medio_site2 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_medio_site3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_sugerido numeric DEFAULT NULL;