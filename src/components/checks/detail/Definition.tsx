import { SqlSlip } from "@/components/common/SqlSlip";
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
      <SqlSlip sql={check.sql} language={language} title={t.query} />
      <dl className="grid h-fit grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-3 text-body-sm">
        <dt className="text-ink-3">{t.schedule}</dt>
        <dd>
          {scheduleLabel(check.schedule, language)}
          {next && (
            <span className="block text-caption text-ink-3" title={formatDateTime(next, language)}>
              {t.nextRun(formatRelative(next, language))}
            </span>
          )}
        </dd>
        <dt className="text-ink-3">{t.reads}</dt>
        <dd className="space-y-0.5 font-mono text-body-sm">
          {tables.length ? tables.map((table) => <span key={table} className="block">{table}</span>) : "—"}
        </dd>
        <dt className="text-ink-3">{t.tags}</dt>
        <dd>{check.tags.length ? check.tags.map((tag) => `#${tag}`).join("  ") : "—"}</dd>
        <dt className="text-ink-3">{t.scope}</dt>
        <dd>{check.scope || "—"}</dd>
        <dt className="text-ink-3">{t.author}</dt>
        <dd>{check.author || "—"}</dd>
        <dt className="text-ink-3">{t.created}</dt>
        <dd className="tabular-nums">{check.createdAt ? formatDateTime(check.createdAt, language) : "—"}</dd>
      </dl>
    </div>
  );
}
