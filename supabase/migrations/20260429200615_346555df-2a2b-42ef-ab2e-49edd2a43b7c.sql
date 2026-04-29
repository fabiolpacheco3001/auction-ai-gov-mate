
ALTER TABLE public.bens ADD COLUMN IF NOT EXISTS valor_efetivado numeric;
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS nao_vendido boolean NOT NULL DEFAULT false;
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS documento_comprobatorio_url text;
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS documento_comprobatorio_nome text;
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS finalizado_em timestamp with time zone;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-comprobatorios', 'documentos-comprobatorios', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can view comprobatorios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload comprobatorios" ON storage.objects;

CREATE POLICY "Authenticated can view comprobatorios"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-comprobatorios');

CREATE POLICY "Authenticated can upload comprobatorios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-comprobatorios');
