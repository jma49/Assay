import { beetleIconGrid } from "@/lib/brand/beetle";
import { cn } from "@/lib/utils/utils";

const GRID = beetleIconGrid();

/** The pixel beetle, drawn as SVG rects so it stays crisp at any size. Decorative by default. */
export function BeetleMark({ className, title }: { className?: string; title?: string }) {
  const n = GRID.length;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      shapeRendering="crispEdges"
      className={cn("size-6", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {GRID.flatMap((row, y) =>
        row.map((color, x) => (color ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} /> : null)),
      )}
    </svg>
  );
}
