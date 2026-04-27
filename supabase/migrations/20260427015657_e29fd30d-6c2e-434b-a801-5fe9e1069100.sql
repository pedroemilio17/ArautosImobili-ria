-- 1. Recriar leads_dashboard sem SECURITY DEFINER, com security_invoker = true
DROP VIEW IF EXISTS public.leads_dashboard;
CREATE VIEW public.leads_dashboard
WITH (security_invoker = true)
AS
SELECT id, whatsapp, nome, classificacao, urgencia_real,
       etapa_que_parou, proximo_passo, created_at, updated_at
FROM public.leads;

-- 2. Corrigir search_path da função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 3. Revogar EXECUTE de has_role para anon e authenticated (será usada apenas dentro de policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;