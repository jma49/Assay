import { HighlightedLine } from "@/components/code/HighlightedLine";
import type { CheckDetail } from "@/contracts/checks";
import { nextScheduledRun } from "@/lib/scheduling/schedule";
import { tableReferences } from "@/lib/sql/table-references";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { scheduleLabel } from "../status";
import type { Copy } from "./copy";

export function Definition({ check, t, language }: { check: CheckDetail; t: Copy; language: "en" | "zh" }) {
  const next = check.schedule ? nextScheduledRun(check.schedule) : null;
  const tables = tableReferences(check.sql);
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-[12px]">
          <span className="font-medium">{t.query}</span>
          <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-medium text-success">{t.readOnly}</span>
        </div>
        <pre className="overflow-x-auto bg-code p-4 font-mono text-[12.5px] leading-6">
          {check.sql.split("\n").map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line ? <HighlightedLine text={line} language="sql" /> : " "}
            </div>
          ))}
        </pre>
      </div>
      <dl className="grid h-fit grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-3 text-[13px]">
        <dt className="text-muted-foreground">{t.schedule}</dt>
        <dd>
          {scheduleLabel(check.schedule, language)}
          {next && (
            <span className="block text-[12px] text-muted-foreground" title={formatDateTime(next, language)}>
              {t.nextRun(formatRelative(next, language))}
            </span>
          )}
        </dd>
        <dt className="text-muted-foreground">{t.reads}</dt>
        <dd className="space-y-0.5 font-mono text-[12.5px]">
          {tables.length ? tables.map((table) => <span key={table} className="block">{table}</span>) : "—"}
        </dd>
        <dt className="text-muted-foreground">{t.tags}</dt>
        <dd>{check.tags.length ? check.tags.map((tag) => `#${tag}`).join("  ") : "—"}</dd>
        <dt className="text-muted-foreground">{t.scope}</dt>
        <dd>{check.scope || "—"}</dd>
        <dt className="text-muted-foreground">{t.author}</dt>
        <dd>{check.author || "—"}</dd>
        <dt className="text-muted-foreground">{t.created}</dt>
        <dd className="tabular-nums">{check.createdAt ? formatDateTime(check.createdAt, language) : "—"}</dd>
      </dl>
    </div>
  );
}
