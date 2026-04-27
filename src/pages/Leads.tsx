import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeads, useMarkContacted, type NormalizedLead } from "@/lib/leads-queries";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_META,
  type ContactStatus,
} from "@/lib/contactStatus";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { ClassificationBadge } from "@/components/leads/ClassificationBadge";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { NextContactPopover } from "@/components/leads/NextContactPopover";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type StatusFilter = ContactStatus | "ALL";

const PERIOD_OPTIONS = [
  { value: "all", label: "Sempre" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("status") as StatusFilter) || "ALL";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initial);
  const [classificacao, setClassificacao] = useState<string>("ALL");
  const [etapa, setEtapa] = useState<string>("ALL");
  const [period, setPeriod] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const mark = useMarkContacted();

  useEffect(() => {
    document.title = "Leads · Arautos Imobiliária";
  }, []);

  const etapas = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.etapaNorm && set.add(l.etapaNorm));
    return Array.from(set).sort();
  }, [leads]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: leads.length,
      NAO_CONTATADO: 0,
      CONTATADO: 0,
      EM_FOLLOWUP: 0,
      ATRASADO: 0,
      ABANDONADO: 0,
    };
    leads.forEach((l) => c[l.contactStatus]++);
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const since =
      period !== "all" ? Date.now() - parseInt(period) * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "ALL" && l.contactStatus !== statusFilter) return false;
      if (classificacao !== "ALL" && l.classificacaoNorm !== classificacao) return false;
      if (etapa !== "ALL" && l.etapaNorm !== etapa) return false;
      if (since && l.created_at && new Date(l.created_at).getTime() < since) return false;
      if (q) {
        const hay =
          (l.nomeNorm + " " + (l.whatsapp ?? "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, classificacao, etapa, period, search]);

  const updateStatusFilter = (v: StatusFilter) => {
    setStatusFilter(v);
    if (v === "ALL") params.delete("status");
    else params.set("status", v);
    setParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} de {leads.length} leads
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou WhatsApp"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </header>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <Chip
          active={statusFilter === "ALL"}
          onClick={() => updateStatusFilter("ALL")}
          label="Todos"
          count={counts.ALL}
        />
        {CONTACT_STATUSES.map((s) => (
          <Chip
            key={s}
            active={statusFilter === s}
            onClick={() => updateStatusFilter(s)}
            label={CONTACT_STATUS_META[s].label}
            count={counts[s]}
            color={CONTACT_STATUS_META[s].color}
          />
        ))}
      </div>

      {/* Filtros secundários */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={classificacao} onValueChange={setClassificacao}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas classificações</SelectItem>
            <SelectItem value="QUENTE">QUENTE</SelectItem>
            <SelectItem value="MORNO">MORNO</SelectItem>
            <SelectItem value="FRIO">FRIO</SelectItem>
            <SelectItem value="ABANDONOU">ABANDONOU</SelectItem>
          </SelectContent>
        </Select>
        <Select value={etapa} onValueChange={setEtapa}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas etapas</SelectItem>
            {etapas.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "ALL" ||
          classificacao !== "ALL" ||
          etapa !== "ALL" ||
          period !== "all" ||
          search) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              updateStatusFilter("ALL");
              setClassificacao("ALL");
              setEtapa("ALL");
              setPeriod("all");
              setSearch("");
            }}
          >
            Limpar
          </Button>
        )}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="font-bold text-foreground">Nome</TableHead>
              <TableHead className="font-bold text-foreground">WhatsApp</TableHead>
              <TableHead className="font-bold text-foreground">Status</TableHead>
              <TableHead className="font-bold text-foreground">Class.</TableHead>
              <TableHead className="font-bold text-foreground">Etapa</TableHead>
              <TableHead className="font-bold text-foreground">Próx. contato</TableHead>
              <TableHead className="font-bold text-foreground text-right">Tent.</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                onClick={() => setOpenId(l.id)}
              >
                <TableCell className="font-semibold">
                  {l.nomeNorm || <span className="text-muted-foreground">Sem nome</span>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <WhatsAppButton whatsapp={l.whatsapp} size="icon" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.contactStatus} />
                </TableCell>
                <TableCell>
                  <ClassificationBadge value={l.classificacao} />
                </TableCell>
                <TableCell className="text-sm capitalize">{l.etapaNorm || "—"}</TableCell>
                <TableCell className="text-sm num">
                  {l.proximo_contato
                    ? format(new Date(l.proximo_contato), "dd/MM HH:mm", { locale: ptBR })
                    : "—"}
                </TableCell>
                <TableCell className="text-right num font-semibold">
                  {l.tentativas_followup ?? 0}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RowActions lead={l} onOpen={() => setOpenId(l.id)} markPending={mark.isPending} onMark={() =>
                    mark.mutate(
                      { id: l.id, tentativas_followup: l.tentativas_followup },
                      { onSuccess: () => toast({ title: "Marcado como contatado" }) },
                    )
                  }/>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-2">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="border border-border rounded-lg p-4 cursor-pointer"
            onClick={() => setOpenId(l.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold truncate">{l.nomeNorm || "Sem nome"}</div>
              <StatusBadge status={l.contactStatus} size="sm" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <ClassificationBadge value={l.classificacao} />
              <span className="capitalize">{l.etapaNorm || "—"}</span>
              <span className="num ml-auto">{l.tentativas_followup ?? 0}x</span>
            </div>
            <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <WhatsAppButton whatsapp={l.whatsapp} />
              <NextContactPopover leadId={l.id} current={l.proximo_contato} />
            </div>
          </div>
        ))}
      </div>

      <LeadDrawer leadId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:border-foreground",
      )}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {label}
      <span
        className={cn(
          "num rounded-md px-1.5 py-0.5 text-[10px]",
          active ? "bg-primary-foreground/20" : "bg-secondary",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function RowActions({
  lead,
  onOpen,
  onMark,
  markPending,
}: {
  lead: NormalizedLead;
  onOpen: () => void;
  onMark: () => void;
  markPending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onMark} disabled={markPending}>
          Marcar como contatado
        </DropdownMenuItem>
        <NextContactPopover
          leadId={lead.id}
          current={lead.proximo_contato}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Definir próximo contato
            </DropdownMenuItem>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpen}>Abrir detalhe</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}