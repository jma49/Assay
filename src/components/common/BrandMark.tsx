import { RowAMark } from "@/components/brand/RowAMark";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

/** The Row A mark beside the wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <RowAMark className="size-8" />
      {!compact && <span className="font-display text-title-sm leading-none font-semibold">{BRAND}</span>}
    </span>
  );
}
