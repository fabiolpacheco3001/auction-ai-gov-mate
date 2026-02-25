
CREATE TABLE public.sites_precificacao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sites_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sites" ON public.sites_precificacao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sites" ON public.sites_precificacao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sites" ON public.sites_precificacao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sites" ON public.sites_precificacao FOR DELETE USING (auth.uid() = user_id);
