ALTER TABLE public.bens ADD COLUMN quantidade integer NOT NULL DEFAULT 1;
ALTER TABLE public.bens ADD COLUMN municipio text NOT NULL DEFAULT '';