import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Loader2 } from "lucide-react";
import { useLeads, type NormalizedLead } from "@/lib/leads-queries";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_META,
  type ContactStatus,
} from "@/lib/contactStatus";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

function statusCounts(leads: NormalizedLead[]) {
  const counts: Record<ContactStatus, number> = {
    NAO_CONTATADO: 0,
    CONTATADO: 0,
    EM_FOLLOWUP: 0,
    ATRASADO: 0,
    ABANDONADO: 0,
  };
  for (const l of leads) counts[l.contactStatus]++;
  return counts;
}

function quenteCount(leads: NormalizedLead[]) {
  return leads.filter((l) => l.classificacaoNorm === "QUENTE").length;
}

function stageData(leads: NormalizedLead[]) {
  const map = new Map<string, number>();
  for (const l of leads) {
    const k = l.etapaNorm || "indefinida";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const order = ["abertura", "situação", "situacao", "dados", "completo"];
  return Array.from(map.entries())
    .map(([etapa, count]) => ({ etapa, count }))
    .sort((a, b) => {
      const ai = order.indexOf(a.etapa);
      const bi = order.indexOf(b.etapa);
      if (ai === -1 && bi === -1) return a.etapa.localeCompare(b.etapa);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}

function dailyData(leads: NormalizedLead[]) {
  const days: { date: string; label: string; count: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = 29; i >= 0; i--) {
    const d = subDays(today, i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: format(d, "dd/MM"),
      count: 0,
    });
  }
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const l of leads) {
    if (!l.created_at) continue;
    const k = l.created_at.slice(0, 10);
    const i = idx.get(k);
    if (i !== undefined) days[i].count++;
  }
  return days;
}

function upcomingContacts(leads: NormalizedLead[]) {
  return leads
    .filter((l) => l.proximo_contato)
    .sort((a, b) => {
      // Atrasados primeiro (mais antigos), depois próximos
      const da = new Date(a.proximo_contato!).getTime();
      const db = new Date(b.proximo_contato!).getTime();
      return da - db;
    })
    .slice(0, 8);
}

function Kpi({
  label,
  value,
  accent,
  to,
}: {
  label: string;
  value: number;
  accent?: "default" | "late" | "followup" | "contacted" | "cold";
  to?: string;
}) {
  const dotColor: Record<NonNullable<typeof accent>, string> = {
    default: "bg-foreground",
    late: "bg-status-late",
    followup: "bg-status-followup",
    contacted: "bg-status-contacted",
    cold: "bg-status-cold",
  };
  const inner = (
    <div className="border border-border rounded-lg p-4 hover:border-foreground transition-colors h-full flex flex-col justify-between">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[accent ?? "default"])} />
        {label}
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-black tracking-tight num">
        {value}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function OverviewPage() {
  const { data: leads = [], isLoading } = useLeads();

  useEffect(() => {
    document.title = "Visão geral · ECO Leads";
  }, []);

  const counts = useMemo(() => statusCounts(leads), [leads]);
  const total = leads.length;
  const quente = useMemo(() => quenteCount(leads), [leads]);
  const stages = useMemo(() => stageData(leads), [leads]);
  const daily = useMemo(() => dailyData(leads), [leads]);
  const upcoming = useMemo(() => upcomingContacts(leads), [leads]);

  const pie = CONTACT_STATUSES.map((s) => ({
    name: CONTACT_STATUS_META[s].label,
    status: s,
    value: counts[s],
    fill: CONTACT_STATUS_META[s].color,
  })).filter((p) => p.value > 0);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Visão geral</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento de contato com leads.
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Total" value={total} to="/leads" />
        <Kpi label="Não contatados" value={counts.NAO_CONTATADO} accent="cold" to="/leads?status=NAO_CONTATADO" />
        <Kpi label="Contatados" value={counts.CONTATADO} accent="contacted" to="/leads?status=CONTATADO" />
        <Kpi label="Em follow-up" value={counts.EM_FOLLOWUP} accent="followup" to="/followups" />
        <Kpi label="Atrasados" value={counts.ATRASADO} accent="late" to="/followups" />
        <Kpi label="QUENTES" value={quente} to="/leads" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 border border-border rounded-lg p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
            Status de contato
          </h2>
          <div className="h-56">
            {pie.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {pie.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {pie.map((p) => (
              <div key={p.status} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.fill }} />
                <span className="text-muted-foreground truncate">{p.name}</span>
                <span className="ml-auto font-bold num">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border border-border rounded-lg p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
            Etapa do funil
          </h2>
          <div className="h-56">
            {stages.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stages} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="etapa"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
          Novos leads / dia (30 dias)
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-border rounded-lg overflow-hidden">
        <header className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Próximos contatos
          </h2>
          <Link
            to="/followups"
            className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        {upcoming.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-muted-foreground">
            Nenhum próximo contato agendado.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((l) => {
              const dt = new Date(l.proximo_contato!);
              const overdue = dt.getTime() < Date.now();
              const today = isToday(dt);
              return (
                <li
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3",
                    overdue && "bg-status-late-soft",
                  )}
                >
                  {overdue && (
                    <span className="h-8 w-1 rounded-full bg-status-late shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">
                        {l.nomeNorm || "Sem nome"}
                      </span>
                      <StatusBadge status={l.contactStatus} size="sm" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 num">
                      {overdue
                        ? `Atrasado ${formatDistanceToNow(dt, { locale: ptBR })}`
                        : today
                          ? `Hoje · ${format(dt, "HH:mm")}`
                          : format(dt, "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <WhatsAppButton whatsapp={l.whatsapp} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
      Sem dados
    </div>
  );
}