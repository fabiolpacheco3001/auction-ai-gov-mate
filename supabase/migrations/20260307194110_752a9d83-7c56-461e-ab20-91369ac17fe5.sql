
-- Allow org members to view their org's API tokens
CREATE POLICY "Org members can view org tokens"
ON public.api_tokens FOR SELECT
TO authenticated
USING (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Allow org members to view their org's pricing sites
CREATE POLICY "Org members can view org sites"
ON public.sites_precificacao FOR SELECT
TO authenticated
USING (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Allow org members to manage their org's pricing sites
CREATE POLICY "Org members can insert org sites"
ON public.sites_precificacao FOR INSERT
TO authenticated
WITH CHECK (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Org members can update org sites"
ON public.sites_precificacao FOR UPDATE
TO authenticated
USING (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Org members can delete org sites"
ON public.sites_precificacao FOR DELETE
TO authenticated
USING (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);
