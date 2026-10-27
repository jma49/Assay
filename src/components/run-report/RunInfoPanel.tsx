import Link from "next/link";
import { cn } from "@/lib/utils/utils";
import { runResultLabel } from "@/lib/utils/run-message";
import type { RunReportMessages } from "./messages";
import { OUTCOME_LABEL, OUTCOME_TEXT } from "@/components/checks/status";
import { OutcomeGlyph } from "@/components/checks/OutcomeGlyph";
import type { RunOutcome } from "@/domain/run";
import { localized, type ExecutionResult, type Language } from "./run-report";

/** One line of facts about the run and its check, so the returned rows get the full width. */
export function RunInfoPanel({
  result,
  outcome,
  scriptName,
  executedAt,
  language,
  t,
}: {
  result: ExecutionResult;
  outcome: RunOutcome;
  scriptName: string | undefined;
  executedAt: string;
  language: Language;
  t: RunReportMessages;
}) {
  const description = localized(language, result.description, result.cnDescription);
  const scope = localized(language, result.scope, result.cnScope);
  const info: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    {
      label: t.status,
      value: (
        <span className={cn("inline-flex items-center gap-1.5 font-medium", OUTCOME_TEXT[outcome])}>
          <OutcomeGlyph outcome={outcome} />
          {OUTCOME_LABEL[outcome][language]}
        </span>
      ),
    },
    { label: t.executionTime, value: <span className="tabular-nums">{executedAt}</span> },
    { label: t.result, value: runResultLabel(result, language) },
    {
      label: t.scriptId,
      mono: true,
      value: (
        <Link href={`/checks/${encodeURIComponent(result.checkId)}`} className="text-ink underline underline-offset-4">
          {result.checkId}
        </Link>
      ),
    },
    ...(scriptName ? [{ label: t.name, value: scriptName }] : []),
    ...(result.description || result.cnDescription ? [{ label: t.description, value: description }] : []),
    ...(result.scope || result.cnScope ? [{ label: t.scope, value: scope }] : []),
    ...(result.author ? [{ label: t.author, value: result.author }] : []),
    { label: t.resultId, value: result._id, mono: true },
  ];

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 border-y border-line px-1 py-2.5 text-caption">
      {info.map((item) => (
        <div key={item.label} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="lead shrink-0 text-ink-3">{item.label}</dt>
          <dd className={cn("min-w-0 truncate text-body-sm text-ink", item.mono && "font-mono text-caption")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
