import { cn } from "@/lib/utils/utils";
import { OutcomeGlyph } from "@/components/checks/OutcomeGlyph";
import { OUTCOME_TEXT } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";
import { SqlSlip } from "@/components/common/SqlSlip";

/** What happened, in one line, above the rows that prove it. */
export function RunHeadline({
  outcome,
  headline,
  subtitle,
  errorText,
  sql,
  language,
}: {
  outcome: RunOutcome;
  headline: string;
  subtitle: string;
  /** The query's error, printed as fog under the headline of a broken run. */
  errorText: string | null;
  /** The statement that failed, printed beside its error. */
  sql?: string | null;
  language: "en" | "zh";
}) {
  return (
    <header className="flex items-start gap-3 px-1 pt-1">
      <OutcomeGlyph outcome={outcome} large className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <p className={cn("font-display text-display-sm leading-tight", OUTCOME_TEXT[outcome])}>{headline}</p>
        <p className="mt-1 text-body-sm text-ink-2">{subtitle}</p>
        {errorText && (
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="fog-message">
              <pre>{errorText}</pre>
            </div>
            {sql && <SqlSlip sql={sql} language={language} />}
          </div>
        )}
      </div>
    </header>
  );
}
