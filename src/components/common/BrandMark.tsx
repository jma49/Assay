import { BeetleMark } from "@/components/brand/BeetleMark";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

/** The beetle beside the wordmark. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary-soft">
        <BeetleMark className="size-6" />
      </span>
      {!compact && <span className="font-serif text-[19px] leading-none font-semibold">{BRAND}</span>}
    </span>
  );
}
