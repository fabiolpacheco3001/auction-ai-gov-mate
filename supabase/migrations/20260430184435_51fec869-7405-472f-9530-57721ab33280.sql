
-- Allow org members (not only the creator) to update processos in their organ.
-- This is needed for cancellation, approval, and finalization workflows.
CREATE POLICY "Org members can update org processos"
ON public.processos
FOR UPDATE
TO authenticated
USING (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
)
WITH CHECK (
  orgao_id IN (
    SELECT orgao_id FROM public.orgao_usuarios
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Super admins can update all processos"
ON public.processos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
