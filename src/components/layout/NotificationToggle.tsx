import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "@/hooks/use-toast";

export function NotificationToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === "unsupported") return null;

  async function handleClick() {
    if (state === "granted") {
      await unsubscribe();
      toast({ title: "Notificações desativadas" });
    } else if (state === "denied") {
      toast({
        title: "Notificações bloqueadas",
        description:
          "Você bloqueou notificações no navegador. Acesse as configurações do site para reativar.",
        variant: "destructive",
      });
    } else {
      const ok = await subscribe();
      if (ok) {
        toast({ title: "🔔 Notificações ativadas!" });
      } else {
        toast({
          title: "Não foi possível ativar",
          description: "Verifique as permissões do navegador.",
          variant: "destructive",
        });
      }
    }
  }

  const Icon =
    state === "loading"
      ? Loader2
      : state === "granted"
        ? BellRing
        : state === "denied"
          ? BellOff
          : Bell;

  const label =
    state === "granted"
      ? "Notificações ativas"
      : state === "denied"
        ? "Notificações bloqueadas"
        : "Ativar notificações";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={state === "loading"}
          className={
            state === "granted"
              ? "text-amber-500 hover:text-amber-600"
              : "text-muted-foreground"
          }
          aria-label={label}
        >
          <Icon
            className={`h-5 w-5 ${state === "loading" ? "animate-spin" : ""}`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
