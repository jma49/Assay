import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_TEXT } from "@/components/checks/status";
import type { BatchItemView } from "@/contracts/batches";
import { cn } from "@/lib/utils/utils";
import { batchCounts, itemOutcome } from "./manual-trigger/batch-progress";
import { triggerCopy } from "./manual-trigger/copy";

/** A bulk run's checks as they finish, each with its outcome and a link to its report. */
export function BatchExecutionProgress({ items, language }: { items: BatchItemView[]; language: string }) {
  const copy = triggerCopy(language);
  const lang = language === "zh" ? "zh" : "en";
  const counts = batchCounts(items);
  const percent = items.length > 0 ? (counts.done / items.length) * 100 : 0;

  return (
    <section aria-live="polite" className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-body-sm">
          <span className="font-medium">{copy.progress(counts.done, items.length)}</span>
          <span className="text-muted-foreground tabular-nums">{copy.finishedSummary(counts.clean, counts.issues, counts.error)}
            {counts.skipped > 0 && copy.skippedSummary(counts.skipped)}
          </span>
        </div>
        <Progress value={percent} className="h-1" aria-label={copy.progress(counts.done, items.length)} />
      </div>
      <ul className="max-h-72 divide-y overflow-y-auto rounded-lg shadow-border">
        {items.map((item) => {
          const outcome = itemOutcome(item.status);
          const label = outcome
            ? OUTCOME_LABEL[outcome][lang]
            : item.status === "running"
              ? copy.runningItem
              : item.status === "skipped"
                ? copy.skipped
                : copy.pending;
          return (
            <li key={item.scriptId} className="flex items-center gap-3 px-3 py-2 text-body-sm">
              {item.status === "running" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              ) : (
                <span className={cn("status-dot shrink-0", outcome ? OUTCOME_DOT[outcome] : "status-dot-idle")} aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.scriptName || item.scriptId}</span>
                {(outcome === "error" || item.status === "skipped") && item.message && (
                  <span className="block truncate font-mono text-caption text-muted-foreground" title={item.message}>
                    {item.message}
                  </span>
                )}
              </span>
              {outcome && item.mongoResultId ? (
                <Link href={`/runs/${item.mongoResultId}`} className={cn("shrink-0 hover:underline", OUTCOME_TEXT[outcome])}>
                  {label}
                </Link>
              ) : (
                <span className={cn("shrink-0", outcome ? OUTCOME_TEXT[outcome] : "text-muted-foreground")}>{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
