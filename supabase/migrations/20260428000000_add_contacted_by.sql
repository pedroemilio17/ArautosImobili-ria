-- Adiciona rastreabilidade de quem marcou o lead como contatado
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contacted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_contacted_by_email text;

-- Adiciona campo de status do pipeline (Demanda, Em atendimento, Suspenso)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'demanda';

-- Índice para facilitar queries por pipeline_status
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON public.leads(pipeline_status);
