import type { SVGProps } from "react";
import { MARK } from "@/lib/brand/mark";
import { cn } from "@/lib/utils/utils";

/** The Row A mark. Decorative by default; `barProps` reaches the crossbar, which the landing page animates. */
export function RowAMark({
  className,
  title,
  barProps,
}: {
  className?: string;
  title?: string;
  barProps?: SVGProps<SVGRectElement>;
}) {
  const { viewBox, tileRadius, legs, legWidth, bar, barGap, colors } = MARK;
  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={cn("size-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width={viewBox} height={viewBox} rx={tileRadius} fill={colors.tile} />
      <path d={legs} fill="none" stroke={colors.glyph} strokeWidth={legWidth} strokeLinecap="round" strokeLinejoin="round" />
      <rect {...bar} fill={colors.bar} stroke={colors.tile} strokeWidth={barGap} paintOrder="stroke" {...barProps} />
    </svg>
  );
}
