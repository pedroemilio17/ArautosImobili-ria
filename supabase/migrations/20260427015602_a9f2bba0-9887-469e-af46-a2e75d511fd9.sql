-- 1. Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Policies para user_roles: usuário vê apenas os próprios papéis
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Habilitar RLS em leads e leads_dashboard
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- leads_dashboard pode ser uma tabela ou view; tentamos habilitar RLS se for tabela
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'leads_dashboard' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.leads_dashboard ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 6. Policies para leads (apenas admin)
DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
CREATE POLICY "Admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
CREATE POLICY "Admins can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Policies para leads_dashboard (se for tabela)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'leads_dashboard' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view leads_dashboard" ON public.leads_dashboard';
    EXECUTE 'CREATE POLICY "Admins can view leads_dashboard" ON public.leads_dashboard FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;