-- Trigger que notifica automaticamente quando um novo lead é criado
-- Usa pg_net para chamar a Edge Function de email
-- ATENÇÃO: Só funciona se a Edge Function estiver deployed

-- Habilitar a extensão pg_net (já disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que dispara a notificação
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _supabase_url text := current_setting('app.settings.supabase_url', true);
  _service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Chama a Edge Function de notificação
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'type', 'new_lead',
      'leadName', COALESCE(NEW.nome, 'Sem nome')
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear a inserção se a notificação falhar
  RAISE WARNING 'notify_new_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger na tabela leads
DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
