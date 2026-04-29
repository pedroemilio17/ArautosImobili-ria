import { useEffect, useMemo, useState } from "react";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLeads, type NormalizedLead } from "@/lib/leads-queries";
import { useFlow } from "@/lib/flow-context";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { ClassificationBadge } from "@/components/leads/ClassificationBadge";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

// Helper for parsing dates flexibly
function parseDateFlexible(dateString: string | null): Date | null {
  if (!dateString) return null;
  // Try parsing ISO or common format first
  let parsed = parseISO(dateString);
  if (isValid(parsed)) return parsed;

  // Try standard JS Date fallback
  parsed = new Date(dateString);
  if (isValid(parsed)) return parsed;

  // Try custom aaaa-mm-dd hh:mm format (sometimes people use space instead of T)
  parsed = parse(dateString, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(parsed)) return parsed;

  return null;
}

export default function AgendaPage() {
  const { data: leads = [], isLoading } = useLeads();
  const { activeFlow } = useFlow();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    document.title = "Agenda · Arautos Imobiliária";
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding for first day of week
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDayOfWeek - i));
    return d;
  });

  const calendarDays = [...paddingDays, ...daysInMonth];

  // Filter leads and group by day
  const leadsWithDate = useMemo(() => {
    const flowFiltered = activeFlow === "ALL" 
      ? leads 
      : leads.filter(l => l.flow_type === activeFlow);

    const validLeads = flowFiltered.map(lead => {
      const parsedDate = parseDateFlexible(lead.agendamento);
      return { ...lead, parsedAgendamento: parsedDate };
    }).filter(lead => lead.parsedAgendamento !== null);

    return validLeads as (NormalizedLead & { parsedAgendamento: Date })[];
  }, [leads, activeFlow]);

  const leadsByDay = useMemo(() => {
    const map = new Map<string, (NormalizedLead & { parsedAgendamento: Date })[]>();
    leadsWithDate.forEach(lead => {
      const dayKey = format(lead.parsedAgendamento, "yyyy-MM-dd");
      const list = map.get(dayKey) || [];
      list.push(lead);
      map.set(dayKey, list);
    });
    return map;
  }, [leadsWithDate]);

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const selectedDayLeads = selectedDate 
    ? leadsByDay.get(format(selectedDate, "yyyy-MM-dd")) || []
    : [];

  // Sort selected leads by time
  const sortedSelectedLeads = [...selectedDayLeads].sort((a, b) => a.parsedAgendamento.getTime() - b.parsedAgendamento.getTime());

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            {activeFlow !== "ALL" && (
               <span>· Fluxo {activeFlow.toUpperCase()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground">
            &larr; Anterior
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="p-2 hover:bg-secondary rounded-md text-sm font-medium">
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground">
            Próximo &rarr;
          </button>
        </div>
      </header>

      {/* Calendário */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayLeads = leadsByDay.get(dayKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString() + i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[100px] border-b border-r border-border p-2 flex flex-col items-start transition-colors hover:bg-muted/50 text-left",
                  !isCurrentMonth && "bg-muted/20 opacity-50",
                  today && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn(
                    "text-sm font-medium rounded-full h-7 w-7 flex items-center justify-center",
                    today ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  {dayLeads.length > 0 && (
                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                      {dayLeads.length}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 flex-1 w-full space-y-1 overflow-hidden">
                  {dayLeads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="text-[10px] truncate rounded bg-primary/10 text-primary-foreground/90 font-medium px-1.5 py-0.5">
                      {format(lead.parsedAgendamento, "HH:mm")} - {lead.nomeNorm || "Sem nome"}
                    </div>
                  ))}
                  {dayLeads.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      + {dayLeads.length - 3} mais
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes do Dia (Sheet) */}
      <Sheet open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-black">
              {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {sortedSelectedLeads.length} {sortedSelectedLeads.length === 1 ? 'agendamento' : 'agendamentos'} para este dia
            </p>
          </SheetHeader>

          <div className="space-y-4">
            {sortedSelectedLeads.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 bg-secondary/50 rounded-lg">
                Nenhum agendamento para este dia.
              </div>
            ) : (
              sortedSelectedLeads.map((lead) => (
                <div key={lead.id} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-primary flex items-center gap-1.5 mb-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {format(lead.parsedAgendamento, "HH:mm")}
                      </div>
                      <div className="font-semibold">{lead.nomeNorm || "Sem nome"}</div>
                    </div>
                    <StatusBadge status={lead.contactStatus} size="sm" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <ClassificationBadge value={lead.classificacao} />
                    <span className="capitalize">{lead.etapaNorm || "—"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <WhatsAppButton whatsapp={lead.whatsapp} showNumber={false} size="sm" />
                    <a href={`/leads?status=ALL`} onClick={() => setSelectedDate(null)} className="text-xs font-medium text-primary hover:underline ml-auto">
                      Ver no CRM
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
