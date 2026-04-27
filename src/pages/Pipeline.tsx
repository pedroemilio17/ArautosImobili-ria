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
import { Loader2 } from "lucide-react";
import {
  useLeads,
  useUpdateStage,
  type NormalizedLead,
} from "@/lib/leads-queries";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { ClassificationBadge } from "@/components/leads/ClassificationBadge";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STAGE_ORDER = ["abertura", "situação", "situacao", "dados", "completo"];

function orderStages(stages: string[]) {
  return [...stages].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a);
    const bi = STAGE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function PipelinePage() {
  const { data: leads = [], isLoading } = useLeads();
  const update = useUpdateStage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Pipeline · Arautos Imobiliária";
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const stages = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => set.add(l.etapaNorm || "indefinida"));
    return orderStages(Array.from(set));
  }, [leads]);

  const grouped = useMemo(() => {
    const map: Record<string, NormalizedLead[]> = {};
    stages.forEach((s) => (map[s] = []));
    leads.forEach((l) => {
      const k = l.etapaNorm || "indefinida";
      if (!map[k]) map[k] = [];
      map[k].push(l);
    });
    return map;
  }, [leads, stages]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const lead = leads.find((l) => l.id === e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!lead || !target) return;
    if (lead.etapaNorm === target) return;
    update.mutate(
      { id: lead.id, etapa: target },
      {
        onSuccess: () => toast({ title: `Movido para ${target}` }),
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
            Arraste os leads entre as etapas do funil.
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <Column key={stage} stage={stage} leads={grouped[stage]} onOpen={setOpenId} />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeLead && <Card lead={activeLead} dragging />}
        </DragOverlay>
      </DndContext>

      <LeadDrawer leadId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function Column({
  stage,
  leads,
  onOpen,
}: {
  stage: string;
  leads: NormalizedLead[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 flex flex-col rounded-lg border border-border bg-secondary/30 transition-colors",
        isOver && "border-foreground bg-secondary",
      )}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider capitalize">
          {stage}
        </span>
        <span className="text-xs num text-muted-foreground font-semibold">
          {leads.length}
        </span>
      </div>
      <div className="p-2 flex-1 space-y-2 min-h-[120px]">
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
      onClick={onOpen}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <Card lead={lead} />
    </div>
  );
}

function Card({ lead, dragging = false }: { lead: NormalizedLead; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "bg-background rounded-md border border-border p-3 space-y-2",
        dragging && "shadow-lg",
      )}
    >
      <div className="font-bold text-sm truncate">{lead.nomeNorm || "Sem nome"}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={lead.contactStatus} size="sm" />
        <ClassificationBadge value={lead.classificacao} />
      </div>
      {lead.proximo_contato && (
        <div className="text-[11px] text-muted-foreground num">
          Próx: {format(new Date(lead.proximo_contato), "dd/MM HH:mm", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}