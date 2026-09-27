import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

/** The accent tile with a serif A, beside the wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid size-6 place-items-center rounded-md bg-primary font-serif text-[15px] leading-none font-semibold text-primary-foreground"
      >
        A
      </span>
      {!compact && <span className="font-serif text-[19px] leading-none font-semibold">{BRAND}</span>}
    </span>
  );
}
