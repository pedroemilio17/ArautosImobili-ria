import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSetNextContact } from "@/lib/leads-queries";
import { toast } from "@/hooks/use-toast";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NextContactPopover({
  leadId,
  current,
  trigger,
}: {
  leadId: string;
  current: string | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocalInput(current));
  const mut = useSetNextContact();

  const submit = (when: string | null) => {
    mut.mutate(
      { id: leadId, when },
      {
        onSuccess: () => {
          toast({ title: when ? "Próximo contato agendado" : "Agenda removida" });
          setOpen(false);
        },
        onError: (e: any) =>
          toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <CalendarClock className="h-3.5 w-3.5" />
            Agendar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Próximo contato</Label>
            <Input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => submit(null)}
              disabled={mut.isPending}
            >
              Limpar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!value || mut.isPending}
              onClick={() => {
                const iso = value ? new Date(value).toISOString() : null;
                submit(iso);
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}