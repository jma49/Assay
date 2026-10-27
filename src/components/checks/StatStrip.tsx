import type { ReactNode } from "react";
import type { RunOutcome } from "@/domain/run";
import { cn } from "@/lib/utils/utils";
import { OutcomeGlyph } from "./OutcomeGlyph";

export interface StatTile {
  key: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** A `status-dot-*` class; outcome tiles carry one, summary tiles do not. */
  dot?: string;
  /** An outcome drawn as film; preferred over `dot` on the Checks page. */
  glyph?: RunOutcome | null;
  /** Present on tiles that filter the list below. */
  pressed?: boolean;
  onClick?: () => void;
}

/**
 * Four numbers in one joined plate: two by two on small screens, one row from
 * `lg`. The Checks and Runs pages both use it, outcome tiles first in the order
 * Broken, Issues, Clean, then one summary tile.
 */
export function StatStrip({ tiles, label }: { tiles: StatTile[]; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-2 overflow-hidden rounded-sm border border-line-2 bg-white/35 lg:grid-cols-4"
    >
      {tiles.map((tile, i) => {
        const className = cn(
          "relative flex flex-col gap-1.5 px-4 py-3.5 text-left transition-colors duration-150",
          i % 2 === 1 && "border-l border-line",
          i >= 2 && "max-lg:border-t max-lg:border-line",
          i === 2 && "lg:border-l lg:border-line",
          i > 0 && "lg:border-l lg:border-line",
        );
        const body = (
          <>
            <span className="flex items-center gap-2 text-body-sm font-medium text-foreground">
              {tile.glyph !== undefined ? <OutcomeGlyph outcome={tile.glyph} /> : tile.dot && <span className={cn("status-dot", tile.dot)} aria-hidden />}
              {tile.label}
            </span>
            <span className="text-stat leading-tight text-ink tabular-nums">{tile.value}</span>
            {tile.hint !== undefined && <span className="truncate text-caption text-ink-3">{tile.hint}</span>}
            {tile.pressed && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-ink" aria-hidden />}
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
              // Inset, so the joined plate's clip never cuts the ring.
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              tile.pressed ? "bg-face-hi" : "hover:bg-white/55",
            )}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
