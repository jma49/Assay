import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

/** The flask icon beside the wordmark, like the icon at the left of a Mac OS X menu bar. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG needs no optimisation */}
      <img src="/brand-mark.svg" alt="" width={22} height={22} className="size-[22px]" />
      <span className="font-serif text-[21px] font-semibold tracking-tight">{BRAND}</span>
    </span>
  );
}
