import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTCOME_DOT, OUTCOME_LABEL } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { pagerLabel } from "@/lib/utils/pagination";
import { cn } from "@/lib/utils/utils";
import type { CheckAnalytics } from "./analytics";
import { AnalysisSection } from "./AnalysisChartsRow";
import { analysisCopy } from "./copy";

const PAGE_SIZE = 10;
const OUTCOMES: RunOutcome[] = ["error", "issues", "clean"];

/** Per-check outcome counts and clean rate, paged. Remount (via key) to go back to the first page. */
export function CheckPerformanceTable({ scripts, hint, language }: { scripts: CheckAnalytics[]; hint: string; language: string }) {
  const copy = analysisCopy(language);
  const lang = language === "zh" ? "zh" : "en";
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(scripts.length / PAGE_SIZE));
  const rows = scripts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const name = (script: CheckAnalytics) => (lang === "zh" && script.cnName) || script.scriptName;

  return (
    <AnalysisSection title={copy.byCheck} hint={hint}>
      <div className="overflow-x-auto">
        <table className="w-full sm:min-w-[720px] text-body-sm">
          <thead>
            <tr className="border-b text-caption text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">{copy.check}</th>
              <th className="w-20 px-3 py-2 text-right font-medium max-sm:w-12">{copy.runs}</th>
              {OUTCOMES.map((outcome) => (
                <th key={outcome} className="w-20 px-3 py-2 text-right font-medium max-sm:hidden">
                  {OUTCOME_LABEL[outcome][lang]}
                </th>
              ))}
              <th className="w-44 px-3 py-2 text-left font-medium max-sm:w-28">{copy.cleanRate}</th>
              <th className="w-32 px-4 py-2 text-right font-medium max-sm:hidden">{copy.lastRun}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((script) => (
              <tr key={script.scriptId} className="border-b last:border-0">
                <td className="max-w-0 px-4 py-2.5">
                  <Link href={`/checks/${encodeURIComponent(script.scriptId)}`} className="block truncate font-medium hover:underline" title={name(script)}>
                    {name(script)}
                  </Link>
                  <span className="block truncate font-mono text-caption text-muted-foreground">{script.scriptId}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{script.runs}</td>
                {OUTCOMES.map((outcome) => (
                  <td key={outcome} className={cn("px-3 py-2.5 text-right tabular-nums max-sm:hidden", script.counts[outcome] === 0 && "text-muted-foreground")}>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {script.counts[outcome] > 0 && <span className={cn("status-dot", OUTCOME_DOT[outcome])} aria-hidden />}
                      {script.counts[outcome]}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5">
                  {script.runs > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/60" style={{ width: `${script.cleanRate}%` }} />
                      </div>
                      <span className="w-10 text-right tabular-nums">{script.cleanRate.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-muted-foreground tabular-nums max-sm:hidden" title={script.lastRun ? formatDateTime(script.lastRun, language) : undefined}>
                  {script.lastRun ? formatRelative(script.lastRun, language) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scripts.length > PAGE_SIZE && (
        <nav aria-label={copy.byCheck} className="flex items-center justify-end gap-2 border-t px-4 py-2 text-caption text-muted-foreground">
          <span className="tabular-nums" aria-live="polite">
            {pagerLabel(page, PAGE_SIZE, scripts.length, language)}
          </span>
          <Button variant="ghost" size="icon" className="size-7" aria-label={copy.previousPage} disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label={copy.nextPage} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight />
          </Button>
        </nav>
      )}
    </AnalysisSection>
  );
}
