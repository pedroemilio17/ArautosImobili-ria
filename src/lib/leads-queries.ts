import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clean } from "./normalize";
import { getContactStatus, type ContactStatus } from "./contactStatus";

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
}

export interface NormalizedLead extends LeadRow {
  contactStatus: ContactStatus;
  nomeNorm: string;
  classificacaoNorm: string;
  etapaNorm: string;
}

function normalizeLead(row: LeadRow): NormalizedLead {
  return {
    ...row,
    nomeNorm: clean(row.nome),
    classificacaoNorm: clean(row.classificacao).toUpperCase(),
    etapaNorm: clean(row.etapa_que_parou).toLowerCase(),
    contactStatus: getContactStatus(row),
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
    mutationFn: async (lead: { id: string; tentativas_followup: number | null }) => {
      const next = (lead.tentativas_followup ?? 0) + 1;
      const { error } = await supabase
        .from("leads")
        .update({
          tentativas_followup: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
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