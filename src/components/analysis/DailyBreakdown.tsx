import { OUTCOME_DOT, OUTCOME_LABEL } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";
import { formatDayKey } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import type { DailyTrendPoint } from "./analytics";
import { AnalysisSection } from "./AnalysisChartsRow";
import { analysisCopy } from "./copy";

const OUTCOMES: RunOutcome[] = ["error", "issues", "clean"];
const BAR: Record<RunOutcome, string> = { error: "bg-failure", issues: "bg-attention", clean: "bg-success" };

/** The most recent days, newest first, each with its runs split into Broken / Issues / Clean. */
export function DailyBreakdown({ days, hint, language }: { days: DailyTrendPoint[]; hint: string; language: string }) {
  const copy = analysisCopy(language);
  const lang = language === "zh" ? "zh" : "en";
  const most = Math.max(1, ...days.map((day) => day.runs));

  return (
    <AnalysisSection title={copy.byDay} hint={hint}>
      <ul className="divide-y">
        {[...days].reverse().map((day) => (
          <li key={day.date} className="grid grid-cols-[7.5rem_minmax(0,1fr)_15rem] items-center gap-4 px-4 py-2.5 text-body-sm max-sm:grid-cols-[5.5rem_minmax(0,1fr)] max-sm:gap-x-3">
            <time dateTime={day.date} className="tabular-nums">
              {formatDayKey(day.date, language, { weekday: true })}
            </time>
            {day.runs === 0 ? (
              <span className="text-muted-foreground max-sm:col-span-1">{copy.noRunsDay}</span>
            ) : (
              <div className="flex h-2 overflow-hidden rounded-none bg-muted" style={{ width: `${(day.runs / most) * 100}%` }} aria-hidden>
                {OUTCOMES.map((outcome) =>
                  day[outcome] > 0 ? <span key={outcome} className={BAR[outcome]} style={{ width: `${(day[outcome] / day.runs) * 100}%` }} /> : null,
                )}
              </div>
            )}
            {day.runs > 0 && (
              <span className="flex justify-end gap-3 tabular-nums max-sm:col-span-2 max-sm:justify-start">
                <span>{copy.runCount(day.runs)}</span>
                {OUTCOMES.map((outcome) =>
                  day[outcome] > 0 ? (
                    <span key={outcome} className="inline-flex items-center gap-1.5" title={OUTCOME_LABEL[outcome][lang]}>
                      <span className={cn("status-dot", OUTCOME_DOT[outcome])} aria-hidden />
                      {day[outcome]}
                      <span className="sr-only">{OUTCOME_LABEL[outcome][lang]}</span>
                    </span>
                  ) : null,
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </AnalysisSection>
  );
}
