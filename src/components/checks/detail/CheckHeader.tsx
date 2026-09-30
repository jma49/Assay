import { Database } from "lucide-react";
import type { CheckDetail } from "@/contracts/checks";
import { sourceName } from "@/components/settings/data-sources/data-sources";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { AlertBadges } from "../AlertControls";
import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_PILL, scheduleLabel } from "../status";
import type { Copy } from "./copy";

/** The check's standing, name, description and schedule. */
export function CheckHeader({
  check,
  name,
  description,
  t,
  language,
}: {
  check: CheckDetail;
  name: string;
  description: string | undefined;
  t: Copy;
  language: "en" | "zh";
}) {
  const state = check.state;
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-caption">
        {state ? (
          <>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium", OUTCOME_PILL[state.outcome])}>
              <span className={cn("status-dot", OUTCOME_DOT[state.outcome])} aria-hidden />
              {OUTCOME_LABEL[state.outcome][language]}
            </span>
            <span className="text-muted-foreground" title={formatDateTime(state.since, language)}>
              {t.since(formatRelative(state.since, language))}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{t.neverRan}</span>
        )}
        <AlertBadges alerting={check.alerting} />
      </div>
      <h1 className="text-display-md">{name}</h1>
      {description && <p className="max-w-[70ch] text-pretty text-body-md text-muted-foreground">{description}</p>}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <span className="font-mono">{check.scriptId}</span>
        {check.dataSource && (
          <span className="inline-flex items-center gap-1" title={check.dataSource.id}>
            <Database className="size-3.5" aria-hidden />
            {check.dataSource.name === null ? check.dataSource.id : sourceName({ sourceId: check.dataSource.id, name: check.dataSource.name }, language)}
          </span>
        )}
        <span>{scheduleLabel(check.schedule, language)}</span>
        {state && <span title={formatDateTime(state.lastRunAt, language)}>{formatRelative(state.lastRunAt, language)}</span>}
      </p>
    </header>
  );
}
