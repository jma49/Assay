import { BeetleMark } from "@/components/brand/BeetleMark";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

/** The beetle beside the wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary-soft">
        <BeetleMark className="size-7" />
      </span>
      {!compact && <span className="font-display text-title-sm leading-none font-semibold">{BRAND}</span>}
    </span>
  );
}
