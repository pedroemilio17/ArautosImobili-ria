import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ClassificationBadge } from "./ClassificationBadge";
import { WhatsAppButton } from "./WhatsAppButton";
import { NextContactPopover } from "./NextContactPopover";
import {
  useLead,
  useMarkContacted,
  useUpdateLeadFields,
} from "@/lib/leads-queries";
import { clean, isEmptyValue } from "@/lib/normalize";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const v = clean(value);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className={"text-sm mt-0.5 " + (isEmptyValue(v) ? "text-muted-foreground italic" : "")}>
        {isEmptyValue(v) ? "Não informado" : v}
      </div>
    </div>
  );
}

export function LeadDrawer({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: lead, isLoading } = useLead(leadId ?? undefined);
  const update = useUpdateLeadFields();
  const mark = useMarkContacted();

  const [classificacao, setClassificacao] = useState("");
  const [proximoPasso, setProximoPasso] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (lead) {
      setClassificacao(clean(lead.classificacao).toUpperCase() || "INDEFINIDA");
      setProximoPasso(clean(lead.proximo_passo));
      setObservacoes(clean(lead.observacoes));
    }
  }, [lead?.id]);

  const save = () => {
    if (!lead) return;
    update.mutate(
      {
        id: lead.id,
        patch: {
          classificacao: classificacao,
          proximo_passo: proximoPasso,
          observacoes: observacoes,
        },
      },
      {
        onSuccess: () => toast({ title: "Lead atualizado" }),
        onError: (e: any) =>
          toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !lead ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="pr-8 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-2xl font-black tracking-tight truncate text-left">
                    {lead.nomeNorm || "Sem nome"}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={lead.contactStatus} />
                    <ClassificationBadge value={lead.classificacao} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <WhatsAppButton whatsapp={lead.whatsapp} showNumber />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() =>
                    mark.mutate(
                      { id: lead.id, tentativas_followup: lead.tentativas_followup },
                      {
                        onSuccess: () => toast({ title: "Marcado como contatado" }),
                      },
                    )
                  }
                >
                  Marcar contatado ({lead.tentativas_followup ?? 0}x)
                </Button>
                <NextContactPopover
                  leadId={lead.id}
                  current={lead.proximo_contato}
                  trigger={
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      {lead.proximo_contato
                        ? `Próx: ${format(new Date(lead.proximo_contato), "dd/MM HH:mm", { locale: ptBR })}`
                        : "Agendar"}
                    </Button>
                  }
                />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <Section title="Perfil">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estado civil" value={lead.estado_civil} />
                  <Field label="Filhos menores" value={lead.filhos_menores} />
                  <Field label="Renda familiar" value={lead.renda_familiar} />
                  <Field label="Nascimento" value={lead.data_nascimento} />
                </div>
              </Section>

              <Section title="Contexto">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Finalidade" value={lead.finalidade} />
                  <Field label="Mora / aluguel" value={lead.mora_aluguel} />
                  <Field label="Situação atual" value={lead.situacao_atual} />
                  <Field label="Preocupação principal" value={lead.preocupacao_principal} />
                </div>
              </Section>

              <Section title="Financiamento">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tentou financiamento" value={lead.tentou_financiamento} />
                  <Field label="Compraria esse ano" value={lead.compraria_esse_ano} />
                  <Field label="Urgência real" value={lead.urgencia_real} />
                </div>
              </Section>

              <Section title="Funil">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Etapa que parou" value={lead.etapa_que_parou} />
                  <Field label="Estágio" value={String(lead.estagio_atual ?? "")} />
                  <Field label="Tentativas" value={String(lead.tentativas_followup ?? 0)} />
                  <Field
                    label="Próximo contato"
                    value={
                      lead.proximo_contato
                        ? format(new Date(lead.proximo_contato), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : ""
                    }
                  />
                </div>
              </Section>

              <Section title="Edição">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Classificação</Label>
                    <Select value={classificacao} onValueChange={setClassificacao}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUENTE">QUENTE</SelectItem>
                        <SelectItem value="MORNO">MORNO</SelectItem>
                        <SelectItem value="FRIO">FRIO</SelectItem>
                        <SelectItem value="ABANDONOU">ABANDONOU</SelectItem>
                        <SelectItem value="INDEFINIDA">INDEFINIDA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Próximo passo</Label>
                    <Input
                      value={proximoPasso}
                      onChange={(e) => setProximoPasso(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
                  </div>
                  <Button onClick={save} disabled={update.isPending} className="w-full">
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar alterações
                  </Button>
                </div>
              </Section>

              {clean(lead.LEAD_RAW) && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                      LEAD_RAW (dados brutos)
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 text-[11px] bg-secondary rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                      {clean(lead.LEAD_RAW)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}