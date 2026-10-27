import type { RunReportMessages } from "./messages";
import { changeSummary, type Language } from "./run-report";

/** The change since the previous run, in counters and in one plain sentence. */
export function RunDiffBar({
  diff,
  language,
  t,
}: {
  diff: { added: number; still: number; fixed: number } | null | undefined;
  language: Language;
  t: RunReportMessages;
}) {
  if (!diff) {
    return <p className="px-1 text-caption text-ink-3">{t.firstRun}</p>;
  }
  const counters = [
    { label: t.newRows(diff.added), tone: diff.added > 0 ? "text-attention" : "text-ink-3" },
    { label: t.stillRows(diff.still), tone: "text-ink-2" },
    { label: t.fixedRows(diff.fixed), tone: diff.fixed > 0 ? "text-ink" : "text-ink-3" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-line-2 bg-white/30 px-4 py-2.5">
      <span className="lead text-ink-3">{t.compared}</span>
      {counters.map((counter) => (
        <span key={counter.label} className={`text-body-sm font-medium tabular-nums ${counter.tone}`}>
          {counter.label}
        </span>
      ))}
      <span className="w-full text-caption text-ink-2 sm:w-auto sm:flex-1 sm:text-right">{changeSummary(diff, language)}</span>
    </div>
  );
}
