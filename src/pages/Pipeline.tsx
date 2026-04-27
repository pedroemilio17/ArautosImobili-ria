import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Loader2, MessageCircle } from "lucide-react";
import {
  useLeads,
  useUpdatePipelineStatus,
  useMarkContacted,
  PIPELINE_STATUSES,
  PIPELINE_META,
  type NormalizedLead,
  type PipelineStatus,
} from "@/lib/leads-queries";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { ClassificationBadge } from "@/components/leads/ClassificationBadge";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function PipelinePage() {
  const { data: leads = [], isLoading } = useLeads();
  const updatePipeline = useUpdatePipelineStatus();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Pipeline · Arautos Imobiliária";
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map: Record<PipelineStatus, NormalizedLead[]> = {
      demanda: [],
      em_atendimento: [],
      suspenso: [],
    };
    leads.forEach((l) => {
      map[l.pipelineStatus].push(l);
    });
    return map;
  }, [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const lead = leads.find((l) => l.id === e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!lead || !target) return;
    if (!PIPELINE_STATUSES.includes(target as PipelineStatus)) return;
    if (lead.pipelineStatus === target) return;
    updatePipeline.mutate(
      { id: lead.id, status: target as PipelineStatus },
      {
        onSuccess: () =>
          toast({ title: `Movido para ${PIPELINE_META[target as PipelineStatus].label}` }),
        onError: (err: any) =>
          toast({ title: "Erro ao mover", description: err?.message, variant: "destructive" }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste os leads entre as etapas. Veja quem já foi contatado.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-status-contacted" />
            Contatado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-border bg-background" />
            Não contatado
          </span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                leads={grouped[status]}
                onOpen={setOpenId}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeLead && <PipelineCard lead={activeLead} dragging />}
        </DragOverlay>
      </DndContext>

      <LeadDrawer leadId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function Column({
  status,
  leads,
  onOpen,
}: {
  status: PipelineStatus;
  leads: NormalizedLead[];
  onOpen: (id: string) => void;
}) {
  const meta = PIPELINE_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const contactedCount = leads.filter((l) => (l.tentativas_followup ?? 0) > 0).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-80 shrink-0 flex flex-col rounded-xl border border-border bg-secondary/30 transition-all",
        isOver && "border-foreground bg-secondary ring-2 ring-foreground/10",
      )}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: meta.color }}
          />
          <span className="text-sm font-bold tracking-tight">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium num">
            {contactedCount}/{leads.length} contatados
          </span>
        </div>
      </div>
      <div className="p-2 flex-1 space-y-2 min-h-[140px] max-h-[calc(100vh-240px)] overflow-y-auto">
        {leads.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Nenhum lead aqui.
          </div>
        )}
        {leads.map((l) => (
          <DraggableCard key={l.id} lead={l} onOpen={() => onOpen(l.id)} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen }: { lead: NormalizedLead; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <PipelineCard lead={lead} onOpen={onOpen} />
    </div>
  );
}

function PipelineCard({
  lead,
  dragging = false,
  onOpen,
}: {
  lead: NormalizedLead;
  dragging?: boolean;
  onOpen?: () => void;
}) {
  const mark = useMarkContacted();
  const { user } = useAuth();
  const contacted = (lead.tentativas_followup ?? 0) > 0;

  return (
    <div
      className={cn(
        "bg-background rounded-lg border p-3 space-y-2 transition-shadow",
        dragging && "shadow-xl ring-2 ring-foreground/10",
        contacted ? "border-status-contacted/40" : "border-border",
      )}
    >
      {/* Header: nome + indicador visual de contato */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onOpen}
        >
          <div className="font-bold text-sm truncate">{lead.nomeNorm || "Sem nome"}</div>
        </div>
        <div
          className={cn(
            "shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
            contacted
              ? "bg-status-contacted text-status-contacted-foreground"
              : "bg-secondary border-2 border-border text-muted-foreground",
          )}
          title={contacted ? `${lead.tentativas_followup}x contatado` : "Não contatado"}
        >
          {contacted ? <Check className="h-3.5 w-3.5" /> : "?"}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={lead.contactStatus} size="sm" />
        <ClassificationBadge value={lead.classificacao} />
      </div>

      {/* Info extra */}
      {lead.proximo_contato && (
        <div className="text-[11px] text-muted-foreground num">
          Próx: {format(new Date(lead.proximo_contato), "dd/MM HH:mm", { locale: ptBR })}
        </div>
      )}

      {contacted && lead.last_contacted_by_email && (
        <div className="text-[10px] text-muted-foreground truncate">
          Por: {lead.last_contacted_by_email}
        </div>
      )}

      {/* Ações rápidas */}
      <div
        className="flex items-center gap-1.5 pt-1 border-t border-border/50"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <WhatsAppButton whatsapp={lead.whatsapp} size="icon" className="h-7 w-7" />
        <Button
          size="sm"
          variant={contacted ? "outline" : "default"}
          className={cn(
            "h-7 text-[11px] gap-1 flex-1",
            contacted && "border-status-contacted/40 text-status-contacted",
          )}
          disabled={mark.isPending}
          onClick={() =>
            mark.mutate(
              {
                id: lead.id,
                tentativas_followup: lead.tentativas_followup,
                userEmail: user?.email ?? undefined,
                userId: user?.id ?? undefined,
              },
              { onSuccess: () => toast({ title: "✓ Marcado como contatado" }) },
            )
          }
        >
          <Check className="h-3 w-3" />
          {contacted ? `${lead.tentativas_followup}x` : "Contatei"}
        </Button>
      </div>
    </div>
  );
}