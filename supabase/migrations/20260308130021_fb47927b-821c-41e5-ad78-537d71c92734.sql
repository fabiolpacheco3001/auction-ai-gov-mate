
ALTER TABLE public.bens ADD COLUMN imagem_url text DEFAULT null;

INSERT INTO storage.buckets (id, name, public) VALUES ('bens-imagens', 'bens-imagens', true);

CREATE POLICY "Authenticated can upload bens images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bens-imagens');

CREATE POLICY "Anyone can view bens images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'bens-imagens');
