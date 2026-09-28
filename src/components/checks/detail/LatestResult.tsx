import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LatestRun } from "@/contracts/checks";
import { cellText } from "@/lib/utils/cells";
import { cn } from "@/lib/utils/utils";
import type { Copy } from "./copy";

export function LatestResult({ latest, t }: { latest: LatestRun; t: Copy }) {
  if (latest.outcome === "error") {
    return (
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-failure">{t.failed}</p>
          <Link href={`/runs/${latest.runId}`} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:underline">
            {t.fullReport}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-code p-4 font-mono text-[12.5px] leading-6 whitespace-pre-wrap text-failure">{latest.message}</pre>
      </div>
    );
  }
  if (latest.rowCount === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">✓</span>
        <p className="text-[14px] font-medium">{t.noRows}</p>
        <p className="text-[13px] text-muted-foreground">
          {t.passed} {latest.fixed.length > 0 && t.fixedRows(latest.fixed.length)}
        </p>
      </div>
    );
  }
  const added = latest.rows.filter((r) => r.mark === "new").length;
  const still = latest.rows.filter((r) => r.mark === "still").length;
  const columns = latest.columns.length > 0 ? latest.columns : Object.keys(latest.rows[0]?.values ?? {});
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-[12px]">
        <span className="text-muted-foreground">{latest.compared ? t.compared : t.firstRun}</span>
        {latest.compared && (
          <>
            <span className="rounded-md bg-failure-soft px-1.5 py-0.5 font-medium text-failure">{t.newRows(added)}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">{t.stillRows(still)}</span>
            <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-medium text-success">{t.fixedRows(latest.fixed.length)}</span>
          </>
        )}
        <Link href={`/runs/${latest.runId}`} className="ml-auto inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
          {t.fullReport}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-[12px] text-muted-foreground">
              {latest.compared && <th className="w-24 px-4 py-2 text-left font-medium" />}
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 text-left font-mono font-medium whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {latest.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {latest.compared && (
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
                        row.mark === "new" ? "bg-failure-soft text-failure" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {row.mark === "new" ? t.markNew : t.markStill}
                    </span>
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column} className="max-w-[280px] truncate px-4 py-2 whitespace-nowrap" title={cellText(row.values[column])}>
                    {cellText(row.values[column])}
                  </td>
                ))}
              </tr>
            ))}
            {latest.fixed.map((values, i) => (
              <tr key={`fixed-${i}`} className="border-b text-muted-foreground last:border-0">
                <td className="px-4 py-2">
                  <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-success">{t.markFixed}</span>
                </td>
                {columns.map((column) => (
                  <td key={column} className="max-w-[280px] truncate px-4 py-2 whitespace-nowrap line-through decoration-border-strong">
                    {cellText(values[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {latest.rowCount > latest.rows.length && (
        <p className="border-t px-4 py-2.5 text-[12px] text-muted-foreground">{t.shownOf(latest.rows.length, latest.rowCount)}</p>
      )}
    </div>
  );
}
