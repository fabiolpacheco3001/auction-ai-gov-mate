
-- 1. Enum for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'org_admin', 'user');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Orgaos table
CREATE TABLE public.orgaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL,
  uf text NOT NULL,
  cidade text NOT NULL,
  data_inicio date NOT NULL,
  data_termino date,
  pacote_processos integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orgaos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage orgaos"
  ON public.orgaos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view orgaos"
  ON public.orgaos FOR SELECT
  TO authenticated
  USING (true);

-- 6. Orgao usuarios table (links auth users to orgs)
CREATE TABLE public.orgao_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao_id uuid REFERENCES public.orgaos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  login text NOT NULL UNIQUE,
  is_admin boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_id, user_id)
);
ALTER TABLE public.orgao_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all orgao_usuarios"
  ON public.orgao_usuarios FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org admins can manage own org users"
  ON public.orgao_usuarios FOR ALL
  TO authenticated
  USING (
    orgao_id IN (
      SELECT ou.orgao_id FROM public.orgao_usuarios ou
      WHERE ou.user_id = auth.uid() AND ou.is_admin = true
    )
  )
  WITH CHECK (
    orgao_id IN (
      SELECT ou.orgao_id FROM public.orgao_usuarios ou
      WHERE ou.user_id = auth.uid() AND ou.is_admin = true
    )
  );

CREATE POLICY "Users can view own orgao_usuario"
  ON public.orgao_usuarios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Trigger for updated_at on orgaos
CREATE TRIGGER update_orgaos_updated_at
  BEFORE UPDATE ON public.orgaos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Assign super_admin role to existing admin user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'admin@alienagov.gov.br'
ON CONFLICT DO NOTHING;
