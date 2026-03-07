
ALTER TABLE public.orgao_usuarios ADD COLUMN email text;
ALTER TABLE public.orgao_usuarios ADD CONSTRAINT orgao_usuarios_login_unique UNIQUE (login);
