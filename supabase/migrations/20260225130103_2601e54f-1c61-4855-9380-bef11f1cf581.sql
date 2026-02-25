-- Processos de alienação
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  orgao TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processando',
  total_bens INTEGER NOT NULL DEFAULT 0,
  total_lotes INTEGER NOT NULL DEFAULT 0,
  arrecadacao_estimada NUMERIC(12,2) NOT NULL DEFAULT 0,
  arrecadacao_real NUMERIC(12,2),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all processos" ON public.processos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert processos" ON public.processos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update processos" ON public.processos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete processos" ON public.processos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bens patrimoniais
CREATE TABLE public.bens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  estado TEXT NOT NULL DEFAULT 'regular',
  localizacao TEXT NOT NULL DEFAULT '',
  tombamento TEXT NOT NULL DEFAULT '',
  valor_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bens" ON public.bens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert bens" ON public.bens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update bens" ON public.bens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete bens" ON public.bens FOR DELETE TO authenticated USING (true);

-- Lotes
CREATE TABLE public.lotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  preco_sugerido NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_aprovado NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert lotes" ON public.lotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update lotes" ON public.lotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete lotes" ON public.lotes FOR DELETE TO authenticated USING (true);

-- Junction table: lotes <-> bens
CREATE TABLE public.lotes_bens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  bem_id UUID NOT NULL REFERENCES public.bens(id) ON DELETE CASCADE,
  UNIQUE(lote_id, bem_id)
);

ALTER TABLE public.lotes_bens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lotes_bens" ON public.lotes_bens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert lotes_bens" ON public.lotes_bens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete lotes_bens" ON public.lotes_bens FOR DELETE TO authenticated USING (true);

-- Documentos
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  processo_titulo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Relatório',
  status TEXT NOT NULL DEFAULT 'rascunho',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update documentos" ON public.documentos FOR UPDATE TO authenticated USING (true);

-- Configuração do sistema
CREATE TABLE public.configuracao_sistema (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'config-1',
  prompt_classificacao_csv TEXT NOT NULL,
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_atualizacao TEXT NOT NULL DEFAULT 'sistema'
);

ALTER TABLE public.configuracao_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view config" ON public.configuracao_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert config" ON public.configuracao_sistema FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update config" ON public.configuracao_sistema FOR UPDATE TO authenticated USING (true);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON public.lotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();