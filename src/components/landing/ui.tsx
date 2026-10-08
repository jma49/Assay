import { cn } from "@/lib/utils/utils";
import type { Outcome } from "./data";
import type { LandingCopy } from "./content";

/** The ruled column: every section's content sits between the same two hairlines. */
export const FRAME = "ruled mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-3rem)]";

/** Inner padding inside the ruled column. */
export const INSET = "px-5 md:px-12";

/** A section: a top rule across the page, crossed where it meets the column's side rules. */
export function Section({ id, className, frameClassName, children }: { id?: string; className?: string; frameClassName?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("border-t border-rule", className)}>
      <div className={cn(FRAME, "ticks", frameClassName)}>{children}</div>
    </section>
  );
}

/** A label, a serif title and, beside it on wide screens, a lead. */
export function SectionHead({ eyebrow, title, lead, className }: { eyebrow: string; title: React.ReactNode; lead?: string; className?: string }) {
  return (
    <div className={cn(INSET, "grid gap-6 pb-12 pt-20 md:grid-cols-12 md:items-end md:pb-16 md:pt-28", className)}>
      <div className="md:col-span-7">
        <p data-reveal className="eyebrow text-caption text-ink-muted">{eyebrow}</p>
        <h2 data-reveal className="font-editorial mt-4 text-balance text-display-lg text-ink md:text-display-xl">{title}</h2>
      </div>
      {lead && <p data-reveal className="text-body-lg text-ink-muted md:col-span-4 md:col-start-9">{lead}</p>}
    </div>
  );
}

const PAPER_PILL: Record<Outcome, string> = {
  clean: "bg-success-soft text-success",
  issues: "bg-attention-soft text-attention",
  broken: "bg-failure-soft text-failure",
};
const PAPER_DOT: Record<Outcome, string> = { clean: "bg-success", issues: "bg-attention", broken: "bg-failure" };

function outcomeLabel(outcome: Outcome, rows: number | undefined, copy: LandingCopy["outcome"]) {
  return outcome === "issues" ? copy.rows(rows ?? 0) : outcome === "broken" ? copy.error : copy.clean;
}

/** A run outcome as a soft tag with a dot, the same three states as in the app. */
export function OutcomePill({ outcome, rows, copy, className }: { outcome: Outcome; rows?: number; copy: LandingCopy["outcome"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-caption", PAPER_PILL[outcome], className)}>
      <span className={cn("size-1.5 rounded-full", PAPER_DOT[outcome])} />
      {outcomeLabel(outcome, rows, copy)}
    </span>
  );
}

/** One run in a run-history strip. */
export const RUN_CELL: Record<Outcome, string> = { clean: "bg-success/70", issues: "bg-attention/80", broken: "bg-failure" };
