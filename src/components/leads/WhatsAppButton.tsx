import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink, formatWhatsapp } from "@/lib/normalize";
import { cn } from "@/lib/utils";

export function WhatsAppButton({
  whatsapp,
  showNumber = false,
  size = "sm",
  className,
}: {
  whatsapp: string | null | undefined;
  showNumber?: boolean;
  size?: "sm" | "icon";
  className?: string;
}) {
  const link = whatsappLink(whatsapp);
  if (link === "#") return <span className="text-muted-foreground text-sm">—</span>;

  if (size === "icon") {
    return (
      <Button
        asChild
        variant="outline"
        size="icon"
        className={cn("h-8 w-8 border-border", className)}
      >
        <a href={link} target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp">
          <MessageCircle className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1.5 text-xs font-medium num", className)}
    >
      <a href={link} target="_blank" rel="noreferrer">
        <MessageCircle className="h-3.5 w-3.5" />
        {showNumber ? formatWhatsapp(whatsapp) : "WhatsApp"}
      </a>
    </Button>
  );
}