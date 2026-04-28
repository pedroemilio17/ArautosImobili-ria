-- Migration: Create Database Webhook trigger for new leads
-- When a new lead is inserted, call the webpush-notify Edge Function

-- First, enable the pg_net extension (for HTTP calls from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _supabase_url text := current_setting('app.settings.supabase_url', true);
  _service_role_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Build the notification payload
  _payload := jsonb_build_object(
    'title', '🏠 Novo Lead!',
    'message', 'Nome: ' || COALESCE(NEW.nome, 'Sem nome') || ' – ' || COALESCE(NEW.classificacao, ''),
    'url', '/leads',
    'tag', 'new-lead-' || NEW.id
  );

  -- Fire HTTP request to the Edge Function via pg_net
  PERFORM net.http_post(
    url := COALESCE(_supabase_url, 'https://dfmaxxvbzvjyvmqkqrta.supabase.co')
            || '/functions/v1/webpush-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        _service_role_key,
        current_setting('supabase.service_role_key', true)
      )
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to leads table
DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();

-- ============================================================================
-- Follow-up reminder: pg_cron job (runs every hour)
-- Requires pg_cron to be enabled in Supabase Dashboard > Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- This cron job checks leads with proximo_contato in the next 2 hours
-- and sends a push notification as a reminder
SELECT cron.schedule(
  'followup-reminder',
  '0 * * * *',  -- every hour
  $$
  SELECT net.http_post(
    url := 'https://dfmaxxvbzvjyvmqkqrta.supabase.co/functions/v1/webpush-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'title', '⏰ Follow-up próximo!',
      'message', (
        SELECT string_agg(COALESCE(nome, 'Lead'), ', ')
        FROM public.leads
        WHERE proximo_contato IS NOT NULL
          AND proximo_contato::timestamptz BETWEEN now() AND now() + interval '2 hours'
      ),
      'url', '/followups',
      'tag', 'followup-reminder'
    )
  );
  $$
);
