import { cn } from "@/lib/utils";
import { CLASSIFICATION_META, getClassification } from "@/lib/contactStatus";

export function ClassificationBadge({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const c = getClassification(value);
  const meta = CLASSIFICATION_META[c];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}