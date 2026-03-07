
-- Add orgao_id to processos, documentos, api_tokens, sites_precificacao, configuracao_sistema
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS orgao_id uuid REFERENCES public.orgaos(id);
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS orgao_id uuid REFERENCES public.orgaos(id);
ALTER TABLE public.api_tokens ADD COLUMN IF NOT EXISTS orgao_id uuid REFERENCES public.orgaos(id);
ALTER TABLE public.sites_precificacao ADD COLUMN IF NOT EXISTS orgao_id uuid REFERENCES public.orgaos(id);
ALTER TABLE public.configuracao_sistema ADD COLUMN IF NOT EXISTS orgao_id uuid REFERENCES public.orgaos(id);

-- Link existing data to the first orgao
UPDATE public.processos SET orgao_id = (SELECT id FROM public.orgaos ORDER BY created_at LIMIT 1) WHERE orgao_id IS NULL;
UPDATE public.documentos SET orgao_id = (SELECT id FROM public.orgaos ORDER BY created_at LIMIT 1) WHERE orgao_id IS NULL;
UPDATE public.api_tokens SET orgao_id = (SELECT id FROM public.orgaos ORDER BY created_at LIMIT 1) WHERE orgao_id IS NULL;
UPDATE public.sites_precificacao SET orgao_id = (SELECT id FROM public.orgaos ORDER BY created_at LIMIT 1) WHERE orgao_id IS NULL;
UPDATE public.configuracao_sistema SET orgao_id = (SELECT id FROM public.orgaos ORDER BY created_at LIMIT 1) WHERE orgao_id IS NULL;
