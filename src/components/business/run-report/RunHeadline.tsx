import { cn } from "@/lib/utils/utils";
import { cleanRunMessage } from "@/lib/utils/run-message";
import { OUTCOME_DOT, OUTCOME_TEXT } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";

/** What happened, in one line, above the rows that prove it. */
export function RunHeadline({
  outcome,
  headline,
  subtitle,
  message,
}: {
  outcome: RunOutcome;
  headline: string;
  subtitle: string;
  message: string;
}) {
  return (
    <header className="rounded-xl bg-card shadow-border flex items-start gap-3  px-5 py-4">
      <span className={cn("status-dot mt-2", OUTCOME_DOT[outcome])} aria-hidden />
      <div className="min-w-0">
        <p className={cn("font-display text-[26px] leading-tight font-semibold", OUTCOME_TEXT[outcome])}>{headline}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {subtitle}
        </p>
        {outcome === "error" && message && (
          <p className="mt-2 font-mono text-[13px] break-words">{cleanRunMessage(message)}</p>
        )}
      </div>
    </header>
  );
}
