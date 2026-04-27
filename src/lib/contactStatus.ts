import { clean, cleanLower } from "./normalize";

export type ContactStatus =
  | "NAO_CONTATADO"
  | "CONTATADO"
  | "EM_FOLLOWUP"
  | "ATRASADO"
  | "ABANDONADO";

export const CONTACT_STATUSES: ContactStatus[] = [
  "NAO_CONTATADO",
  "CONTATADO",
  "EM_FOLLOWUP",
  "ATRASADO",
  "ABANDONADO",
];

export interface ContactStatusMeta {
  label: string;
  shortLabel: string;
  /** Tailwind classes para o badge sólido */
  badge: string;
  /** Tailwind classes para superfície suave (linhas, cards) */
  soft: string;
  /** cor crua para gráficos */
  color: string;
}

export const CONTACT_STATUS_META: Record<ContactStatus, ContactStatusMeta> = {
  NAO_CONTATADO: {
    label: "Não contatado",
    shortLabel: "Não cont.",
    badge: "bg-status-cold text-status-cold-foreground",
    soft: "bg-status-cold-soft text-status-cold",
    color: "hsl(28 20% 18%)",
  },
  CONTATADO: {
    label: "Contatado",
    shortLabel: "Contatado",
    badge: "bg-status-contacted text-status-contacted-foreground",
    soft: "bg-status-contacted-soft text-status-contacted",
    color: "hsl(152 55% 34%)",
  },
  EM_FOLLOWUP: {
    label: "Em follow-up",
    shortLabel: "Follow-up",
    badge: "bg-status-followup text-status-followup-foreground",
    soft: "bg-status-followup-soft text-status-followup",
    color: "hsl(40 85% 48%)",
  },
  ATRASADO: {
    label: "Atrasado",
    shortLabel: "Atrasado",
    badge: "bg-status-late text-status-late-foreground",
    soft: "bg-status-late-soft text-status-late",
    color: "hsl(4 72% 47%)",
  },
  ABANDONADO: {
    label: "Abandonado",
    shortLabel: "Abandonou",
    badge: "bg-status-abandoned text-status-abandoned-foreground",
    soft: "bg-status-abandoned-soft text-status-abandoned",
    color: "hsl(28 8% 55%)",
  },
};

interface ContactStatusInput {
  classificacao?: string | null;
  proximo_contato?: string | null;
  tentativas_followup?: number | null;
}

/**
 * Deriva o status de contato em ordem de prioridade.
 * 1. ABANDONADO   → classificacao == ABANDONOU
 * 2. ATRASADO     → proximo_contato no passado
 * 3. EM_FOLLOWUP  → proximo_contato no futuro
 * 4. CONTATADO    → tentativas_followup > 0
 * 5. NAO_CONTATADO (default)
 */
export function getContactStatus(lead: ContactStatusInput): ContactStatus {
  const classif = cleanLower(lead.classificacao);
  if (classif === "abandonou") return "ABANDONADO";

  const proximo = clean(lead.proximo_contato);
  if (proximo) {
    const dt = new Date(proximo);
    if (!isNaN(dt.getTime())) {
      if (dt.getTime() < Date.now()) return "ATRASADO";
      return "EM_FOLLOWUP";
    }
  }

  const tentativas = lead.tentativas_followup ?? 0;
  if (tentativas > 0) return "CONTATADO";

  return "NAO_CONTATADO";
}

export type Classification =
  | "QUENTE"
  | "MORNO"
  | "FRIO"
  | "ABANDONOU"
  | "INDEFINIDA";

export function getClassification(value: string | null | undefined): Classification {
  const c = cleanLower(value);
  if (c === "quente") return "QUENTE";
  if (c === "morno") return "MORNO";
  if (c === "frio") return "FRIO";
  if (c === "abandonou") return "ABANDONOU";
  return "INDEFINIDA";
}

export const CLASSIFICATION_META: Record<Classification, { label: string; className: string }> = {
  QUENTE: { label: "QUENTE", className: "bg-status-late-soft text-status-late border border-status-late/30" },
  MORNO: { label: "MORNO", className: "bg-status-followup-soft text-foreground border border-status-followup/40" },
  FRIO: { label: "FRIO", className: "bg-secondary text-foreground border border-border" },
  ABANDONOU: { label: "ABANDONOU", className: "bg-status-abandoned-soft text-muted-foreground border border-border" },
  INDEFINIDA: { label: "—", className: "bg-secondary text-muted-foreground border border-border" },
};