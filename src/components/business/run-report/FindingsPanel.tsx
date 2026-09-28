import { Database } from "lucide-react";
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
    content = (
      <div className="p-6 bg-muted/10 rounded-lg border border-border/20">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed font-mono">
          {findings}
        </p>
      </div>
    );
  } else {
    content = (
      <div className="p-8 text-center bg-muted/10 rounded-lg border border-border/20">
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">{t.noData}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.noDataDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-border overflow-hidden " aria-label={t.queryFindings}>
      {content}
    </div>
  );
}
