import type { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

export interface StatTile {
  key: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** A `status-dot-*` class; outcome tiles carry one, summary tiles do not. */
  dot?: string;
  /** Present on tiles that filter the list below. */
  pressed?: boolean;
  onClick?: () => void;
}

/**
 * Four numbers in one joined card: two by two on small screens, one row from
 * `lg`. The Checks and Runs pages both use it, outcome tiles first in the order
 * Broken, Issues, Clean, then one summary tile.
 */
export function StatStrip({ tiles, label }: { tiles: StatTile[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-border lg:grid-cols-4">
      {tiles.map((tile, i) => {
        const className = cn(
          "flex flex-col gap-0.5 px-5 py-4 text-left",
          i % 2 === 1 && "border-l",
          i >= 2 && "max-lg:border-t",
          i === 2 && "lg:border-l",
        );
        const body = (
          <>
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {tile.dot && <span className={cn("status-dot", tile.dot)} aria-hidden />}
              {tile.label}
            </span>
            <span className="text-[24px] leading-tight font-semibold tabular-nums">{tile.value}</span>
            {tile.hint !== undefined && <span className="truncate text-[12px] text-muted-foreground">{tile.hint}</span>}
          </>
        );
        if (!tile.onClick) {
          return (
            <div key={tile.key} className={className}>
              {body}
            </div>
          );
        }
        return (
          <button
            key={tile.key}
            type="button"
            aria-pressed={tile.pressed}
            onClick={tile.onClick}
            className={cn(
              className,
              // Inset, so the joined card's rounded clip never cuts the ring.
              "outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              tile.pressed ? "bg-primary-soft" : "hover:bg-muted/60",
            )}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
