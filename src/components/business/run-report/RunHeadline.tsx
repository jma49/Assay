import { cn } from "@/lib/utils/utils";
import { OUTCOME_DOT, OUTCOME_TEXT } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";

/** What happened, in one line, above the rows that prove it. */
export function RunHeadline({
  outcome,
  headline,
  subtitle,
  errorText,
}: {
  outcome: RunOutcome;
  headline: string;
  subtitle: string;
  /** The query's error, shown under the headline of a broken run. */
  errorText: string | null;
}) {
  return (
    <header className="rounded-xl bg-card shadow-border flex items-start gap-3  px-5 py-4">
      <span className={cn("status-dot mt-2", OUTCOME_DOT[outcome])} aria-hidden />
      <div className="min-w-0">
        <p className={cn("font-display text-headline leading-tight font-semibold", OUTCOME_TEXT[outcome])}>{headline}</p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {subtitle}
        </p>
        {errorText && (
          <p className="mt-2 font-mono text-body-sm break-words">{errorText}</p>
        )}
      </div>
    </header>
  );
}
