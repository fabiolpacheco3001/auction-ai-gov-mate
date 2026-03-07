
-- Create a security definer function to check if user is admin of an org
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _orgao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orgao_usuarios
    WHERE user_id = _user_id
      AND orgao_id = _orgao_id
      AND is_admin = true
  )
$$;

-- Create a security definer function to get orgao_ids where user is admin
CREATE OR REPLACE FUNCTION public.get_admin_orgao_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT orgao_id FROM public.orgao_usuarios
  WHERE user_id = _user_id AND is_admin = true
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Org admins can manage own org users" ON public.orgao_usuarios;

-- Recreate without recursion using the security definer function
CREATE POLICY "Org admins can manage own org users"
ON public.orgao_usuarios
FOR ALL
TO authenticated
USING (orgao_id IN (SELECT public.get_admin_orgao_ids(auth.uid())))
WITH CHECK (orgao_id IN (SELECT public.get_admin_orgao_ids(auth.uid())));
