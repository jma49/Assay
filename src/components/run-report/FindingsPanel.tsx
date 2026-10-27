import { EmptyState } from "@/components/common/EmptyState";
import type { RunReportMessages } from "./messages";
import { tableRows, type Language, type RunRows } from "./run-report";
import { FindingsTable } from "./FindingsTable";

/** The rows a run returned, as film; a plain-text note; or the clear-film empty state. */
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
  if (rows) {
    return (
      <section className="film" aria-label={t.queryFindings}>
        <div className="film-edge">
          <span className="lead">{t.queryFindings}</span>
          <span className="lead">{language === "zh" ? "来自检查的数据源" : "Read from the check's source"}</span>
        </div>
        <FindingsTable rows={rows} language={language} />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-sm border border-line-2 bg-white/30" aria-label={t.queryFindings}>
      {typeof findings === "string" ? (
        <p className="p-5 font-mono text-body-sm leading-relaxed whitespace-pre-wrap">{findings}</p>
      ) : (
        <EmptyState title={t.noData} hint={t.noDataDesc} />
      )}
    </section>
  );
}
