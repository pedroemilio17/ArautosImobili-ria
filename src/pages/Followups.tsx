import { useEffect, useMemo, useState } from "react";
import {
  endOfDay,
  format,
  formatDistanceToNow,
  isToday,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import {
  useLeads,
  useMarkContacted,
  type NormalizedLead,
} from "@/lib/leads-queries";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { ClassificationBadge } from "@/components/leads/ClassificationBadge";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { NextContactPopover } from "@/components/leads/NextContactPopover";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

function bucketize(leads: NormalizedLead[]) {
  const now = Date.now();
  const todayEnd = endOfDay(new Date()).getTime();
  const todayStart = startOfDay(new Date()).getTime();
  const horizon = now + 14 * 86400000;

  const atrasados: NormalizedLead[] = [];
  const hoje: NormalizedLead[] = [];
  const proximos: NormalizedLead[] = [];

  leads.forEach((l) => {
    if (!l.proximo_contato) return;
    const t = new Date(l.proximo_contato).getTime();
    if (isNaN(t)) return;
    if (t < now && t < todayStart) atrasados.push(l);
    else if (t >= todayStart && t <= todayEnd) hoje.push(l);
    else if (t > todayEnd && t <= horizon) proximos.push(l);
    else if (t < now) atrasados.push(l);
  });

  atrasados.sort(
    (a, b) =>
      new Date(a.proximo_contato!).getTime() -
      new Date(b.proximo_contato!).getTime(),
  );
  hoje.sort(
    (a, b) =>
      new Date(a.proximo_contato!).getTime() -
      new Date(b.proximo_contato!).getTime(),
  );
  proximos.sort(
    (a, b) =>
      new Date(a.proximo_contato!).getTime() -
      new Date(b.proximo_contato!).getTime(),
  );

  return { atrasados, hoje, proximos };
}

export default function FollowupsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Follow-ups · Arautos Imobiliária";
  }, []);

  const { atrasados, hoje, proximos } = useMemo(() => bucketize(leads), [leads]);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Follow-ups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hoje, atrasados e próximos contatos agendados.
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </header>

      <Group
        title="Atrasados"
        count={atrasados.length}
        leads={atrasados}
        emptyText="Sem atrasos. Bom trabalho."
        onOpen={setOpenId}
        variant="late"
      />
      <Group
        title="Hoje"
        count={hoje.length}
        leads={hoje}
        emptyText="Nenhum follow-up para hoje."
        onOpen={setOpenId}
      />
      <Group
        title="Próximos dias"
        count={proximos.length}
        leads={proximos}
        emptyText="Nenhum follow-up nos próximos 14 dias."
        onOpen={setOpenId}
      />

      <LeadDrawer leadId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function Group({
  title,
  count,
  leads,
  emptyText,
  onOpen,
  variant,
}: {
  title: string;
  count: number;
  leads: NormalizedLead[];
  emptyText: string;
  onOpen: (id: string) => void;
  variant?: "late";
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className={cn(
          "text-sm font-bold uppercase tracking-wider",
          variant === "late" && "text-status-late",
        )}>
          {title}
        </h2>
        <span className="text-xs text-muted-foreground num">{count}</span>
      </div>
      {leads.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <Item key={l.id} lead={l} variant={variant} onOpen={() => onOpen(l.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Item({
  lead,
  variant,
  onOpen,
}: {
  lead: NormalizedLead;
  variant?: "late";
  onOpen: () => void;
}) {
  const mark = useMarkContacted();
  const { user } = useAuth();
  const dt = new Date(lead.proximo_contato!);
  const overdue = variant === "late";
  const today = isToday(dt);

  return (
    <li
      className={cn(
        "border rounded-lg p-4 flex items-center gap-4 flex-wrap",
        overdue
          ? "border-status-late/30 bg-status-late-soft"
          : "border-border bg-background",
      )}
    >
      {overdue && <span className="h-10 w-1 rounded-full bg-status-late shrink-0" />}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold truncate">{lead.nomeNorm || "Sem nome"}</span>
          <StatusBadge status={lead.contactStatus} size="sm" />
          <ClassificationBadge value={lead.classificacao} />
        </div>
        <div className="text-xs text-muted-foreground mt-1 num">
          {overdue
            ? `Atrasado ${formatDistanceToNow(dt, { locale: ptBR })}`
            : today
              ? `Hoje · ${format(dt, "HH:mm")}`
              : format(dt, "EEEE dd/MM 'às' HH:mm", { locale: ptBR })}
          <span className="mx-2">·</span>
          {lead.tentativas_followup ?? 0}x contatado
        </div>
        {lead.last_contacted_by_email && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Último por: {lead.last_contacted_by_email}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <WhatsAppButton whatsapp={lead.whatsapp} />
        <NextContactPopover leadId={lead.id} current={lead.proximo_contato} />
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={mark.isPending}
          onClick={() =>
            mark.mutate(
              {
                id: lead.id,
                tentativas_followup: lead.tentativas_followup,
                userEmail: user?.email ?? undefined,
                userId: user?.id ?? undefined,
              },
              {
                onSuccess: () =>
                  toast({ title: "Contatei registrado", description: lead.nomeNorm }),
              },
            )
          }
        >
          <Check className="h-3.5 w-3.5" />
          Contatei
        </Button>
      </div>
    </li>
  );
}