import { useId, type SVGProps } from "react";
import { MARK } from "@/lib/brand/mark";
import { cn } from "@/lib/utils/utils";

/** The Row A mark in the current text colour. Decorative by default; `cutProps` reaches the cut, which the landing page animates. */
export function RowAMark({
  className,
  title,
  cutProps,
}: {
  className?: string;
  title?: string;
  cutProps?: SVGProps<SVGRectElement>;
}) {
  const maskId = useId();
  const { viewBox, glyph, soften, cut } = MARK;
  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={cn("size-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={viewBox} height={viewBox}>
        <rect width={viewBox} height={viewBox} fill="white" />
        <rect y={cut.y} width={viewBox} height={cut.height} fill="black" {...cutProps} />
      </mask>
      <path d={glyph} fill="currentColor" stroke="currentColor" strokeWidth={soften} strokeLinejoin="round" mask={`url(#${maskId})`} />
    </svg>
  );
}
