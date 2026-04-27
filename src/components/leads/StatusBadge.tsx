import { cn } from "@/lib/utils";
import { CONTACT_STATUS_META, type ContactStatus } from "@/lib/contactStatus";

interface Props {
  status: ContactStatus;
  variant?: "solid" | "soft";
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, variant = "solid", size = "md", className }: Props) {
  const meta = CONTACT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide whitespace-nowrap",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        variant === "solid" ? meta.badge : meta.soft,
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "solid" ? "bg-current opacity-90" : "bg-current",
        )}
        style={{ backgroundColor: variant === "soft" ? meta.color : undefined }}
      />
      {size === "sm" ? meta.shortLabel : meta.label}
    </span>
  );
}