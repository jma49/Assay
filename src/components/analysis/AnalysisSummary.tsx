import { OUTCOME_DOT, OUTCOME_LABEL } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";
import { cn } from "@/lib/utils/utils";
import type { AnalyticsData } from "./analytics";
import { analysisCopy } from "./copy";

const OUTCOMES: RunOutcome[] = ["error", "issues", "clean"];

/** Runs in the range, then Broken / Issues / Clean in the Checks page's order, each with its share. */
export function AnalysisSummary({ data, language }: { data: AnalyticsData; language: string }) {
  const copy = analysisCopy(language);
  const lang = language === "zh" ? "zh" : "en";
  const share = (count: number) => (data.totalExecutions > 0 ? ((count / data.totalExecutions) * 100).toFixed(1) : "0");

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-border lg:grid-cols-4">
      <div className="flex flex-col gap-0.5 px-5 py-4">
        <dt className="text-caption text-muted-foreground">{copy.runs}</dt>
        <dd className="text-stat leading-tight tabular-nums">{data.totalExecutions.toLocaleString()}</dd>
        <dd className="text-caption text-muted-foreground">{copy.acrossChecks(data.totalScripts)}</dd>
      </div>
      {OUTCOMES.map((outcome, i) => (
        <div key={outcome} className={cn("flex flex-col gap-0.5 border-l px-5 py-4", i === 1 && "max-lg:border-t max-lg:border-l-0", i === 2 && "max-lg:border-t")}>
          <dt className="flex items-center gap-2 text-caption text-muted-foreground">
            <span className={cn("status-dot", OUTCOME_DOT[outcome])} aria-hidden />
            {OUTCOME_LABEL[outcome][lang]}
          </dt>
          <dd className="text-stat leading-tight tabular-nums">{data.statusDistribution[outcome].toLocaleString()}</dd>
          <dd className="text-caption text-muted-foreground">{copy.shareOfRuns(share(data.statusDistribution[outcome]))}</dd>
        </div>
      ))}
    </dl>
  );
}
