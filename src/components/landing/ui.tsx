import { cn } from "@/lib/utils/utils";
import type { Outcome } from "./data";
import type { LandingCopy } from "./content";

/** Every section aligns to the same left and right edges. */
export const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";

const NIGHT_PILL: Record<Outcome, string> = {
  clean: "bg-night-success/10 text-night-success",
  issues: "bg-night-attention/10 text-night-attention",
  broken: "bg-night-failure/10 text-night-failure",
};
const NIGHT_DOT: Record<Outcome, string> = { clean: "bg-night-success", issues: "bg-night-attention", broken: "bg-night-failure" };

/** A run outcome as it reads on night: a soft pill with a dot, the same three states as in the app. */
export function NightOutcome({ outcome, rows, copy, className }: { outcome: Outcome; rows?: number; copy: LandingCopy["outcome"]; className?: string }) {
  const label = outcome === "issues" ? copy.rows(rows ?? 0) : outcome === "broken" ? copy.error : copy.clean;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption", NIGHT_PILL[outcome], className)}>
      <span className={cn("size-1.5 rounded-full", NIGHT_DOT[outcome])} />
      {label}
    </span>
  );
}

export const NIGHT_CELL: Record<Outcome, string> = { clean: "bg-night-success/70", issues: "bg-night-attention/80", broken: "bg-night-failure" };
