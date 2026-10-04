import { EmptyState } from "@/components/common/EmptyState";
import type { RunReportMessages } from "./messages";
import { tableRows, type Language, type RunRows } from "./run-report";
import { FindingsTable } from "./FindingsTable";

/** The rows a run returned: a table, a plain-text note, or an empty state. */
export function FindingsPanel({
  findings,
  language,
  t,
}: {
  findings: RunRows;
  language: Language;
  t: RunReportMessages;
}) {
  const rows = tableRows(findings);
  let content;
  if (rows) {
    content = <FindingsTable rows={rows} language={language} />;
  } else if (typeof findings === "string") {
    content = <p className="p-5 font-mono text-body-sm leading-relaxed whitespace-pre-wrap">{findings}</p>;
  } else {
    content = <EmptyState title={t.noData} hint={t.noDataDesc} />;
  }

  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-border" aria-label={t.queryFindings}>
      {content}
    </section>
  );
}
