import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clean } from "./normalize";
import { getContactStatus, type ContactStatus } from "./contactStatus";

export type PipelineStatus = "demanda" | "em_atendimento" | "suspenso";

export const PIPELINE_STATUSES: PipelineStatus[] = [
  "demanda",
  "em_atendimento",
  "suspenso",
];

export const PIPELINE_META: Record<PipelineStatus, { label: string; color: string }> = {
  demanda: { label: "Demanda", color: "hsl(40 85% 48%)" },
  em_atendimento: { label: "Em atendimento", color: "hsl(152 55% 34%)" },
  suspenso: { label: "Suspenso", color: "hsl(28 8% 55%)" },
};

export interface LeadRow {
  id: string;
  whatsapp: string | null;
  nome: string | null;
  classificacao: string | null;
  finalidade: string | null;
  mora_aluguel: string | null;
  situacao_atual: string | null;
  preocupacao_principal: string | null;
  tentou_financiamento: string | null;
  compraria_esse_ano: string | null;
  filhos_menores: string | null;
  estado_civil: string | null;
  renda_familiar: string | null;
  data_nascimento: string | null;
  urgencia_real: string | null;
  etapa_que_parou: string | null;
  observacoes: string | null;
  proximo_passo: string | null;
  created_at: string | null;
  updated_at: string | null;
  estagio_atual: number | null;
  proximo_contato: string | null;
  tentativas_followup: number | null;
  LEAD_RAW: string | null;
  last_contacted_by: string | null;
  last_contacted_by_email: string | null;
  pipeline_status: string | null;
}

export interface NormalizedLead extends LeadRow {
  contactStatus: ContactStatus;
  nomeNorm: string;
  classificacaoNorm: string;
  etapaNorm: string;
  pipelineStatus: PipelineStatus;
}

function normalizeLead(row: LeadRow): NormalizedLead {
  const ps = (row.pipeline_status ?? "demanda").toLowerCase();
  return {
    ...row,
    nomeNorm: clean(row.nome),
    classificacaoNorm: clean(row.classificacao).toUpperCase(),
    etapaNorm: clean(row.etapa_que_parou).toLowerCase(),
    contactStatus: getContactStatus(row),
    pipelineStatus: PIPELINE_STATUSES.includes(ps as PipelineStatus)
      ? (ps as PipelineStatus)
      : "demanda",
  };
}

export const LEADS_QUERY_KEY = ["leads"] as const;

export function useLeads() {
  return useQuery({
    queryKey: LEADS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as LeadRow[]).map(normalizeLead);
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeLead(data as LeadRow) : null;
    },
  });
}

export function useMarkContacted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: {
      id: string;
      nome: string;
      tentativas_followup: number | null;
      userEmail?: string;
      userId?: string;
    }) => {
      const next = (lead.tentativas_followup ?? 0) + 1;
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 3);

      const fullPatch: Record<string, unknown> = {
        tentativas_followup: next,
        proximo_contato: followUpDate.toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (lead.userId) fullPatch.last_contacted_by = lead.userId;
      if (lead.userEmail) fullPatch.last_contacted_by_email = lead.userEmail;

      const { error } = await supabase
        .from("leads")
        .update(fullPatch)
        .eq("id", lead.id);

      if (error) {
        // Fallback: core fields only
        const { error: fallbackError } = await supabase
          .from("leads")
          .update({
            tentativas_followup: next,
            proximo_contato: followUpDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
        if (fallbackError) throw fallbackError;
      }

      // Notify via Edge Function (fire-and-forget)
      sendNotification({
        type: "followup_scheduled",
        leadName: lead.nome,
        by: lead.userEmail,
        followUpDate: followUpDate.toISOString(),
      });

      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function useResetContacted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const patch: Record<string, unknown> = {
        tentativas_followup: 0,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("leads")
        .update(patch)
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

// Fire-and-forget notification to Supabase Edge Function
async function sendNotification(payload: {
  type: "new_lead" | "followup_scheduled";
  leadName?: string;
  by?: string;
  followUpDate?: string;
}) {
  try {
    await supabase.functions.invoke("notify-email", { body: payload });
  } catch {
    // Notifications are non-blocking — don't break the UI
    console.warn("Email notification failed (edge function may not be deployed)");
  }
}

export function useSetNextContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, when }: { id: string; when: string | null }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          proximo_contato: when,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          etapa_que_parou: etapa,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, etapa }) => {
      await qc.cancelQueries({ queryKey: LEADS_QUERY_KEY });
      const prev = qc.getQueryData<NormalizedLead[]>(LEADS_QUERY_KEY);
      if (prev) {
        qc.setQueryData<NormalizedLead[]>(
          LEADS_QUERY_KEY,
          prev.map((l) =>
            l.id === id
              ? { ...l, etapa_que_parou: etapa, etapaNorm: etapa.toLowerCase() }
              : l,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(LEADS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

export function useUpdatePipelineStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PipelineStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          pipeline_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: LEADS_QUERY_KEY });
      const prev = qc.getQueryData<NormalizedLead[]>(LEADS_QUERY_KEY);
      if (prev) {
        qc.setQueryData<NormalizedLead[]>(
          LEADS_QUERY_KEY,
          prev.map((l) =>
            l.id === id
              ? { ...l, pipeline_status: status, pipelineStatus: status }
              : l,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(LEADS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

export function useUpdateLeadFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<LeadRow, "classificacao" | "proximo_passo" | "observacoes" | "estagio_atual">
      >;
    }) => {
      const { error } = await supabase
        .from("leads")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}