"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { LatestRun } from "@/contracts/checks";
import { cellText } from "@/lib/utils/cells";
import { cn } from "@/lib/utils/utils";
import { SqlSlip } from "@/components/common/SqlSlip";
import type { Copy } from "./copy";
import { OutcomeGlyph } from "../OutcomeGlyph";

const ROW_CAP = 12;

export function LatestResult({ latest, sql, t, language }: { latest: LatestRun; sql: string; t: Copy; language: "en" | "zh" }) {
  const [expanded, setExpanded] = useState(false);

  if (latest.outcome === "error") {
    return (
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <OutcomeGlyph outcome="error" />
          <p className="text-body-sm font-semibold text-failure">{t.failed}</p>
          <Link href={`/runs/${latest.runId}`} className="ml-auto inline-flex items-center gap-0.5 text-caption font-medium text-ink hover:underline">
            {t.fullReport}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-2">
            <div className="fog-message">
              <pre>{latest.message}</pre>
            </div>
            <p className="text-caption text-ink-2">{t.failedHint}</p>
          </div>
          <SqlSlip sql={sql} language={language} />
        </div>
      </div>
    );
  }

  if (latest.rowCount === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <div className="panel-sheet flex w-full max-w-md items-center gap-3 px-4 py-3">
          <OutcomeGlyph outcome="clean" large />
          <div className="min-w-0">
            <p className="text-body-md font-medium text-ink">{t.noRows}</p>
            <p className="text-caption text-ink-2">
              {t.passed} {latest.fixed.length > 0 && t.fixedRows(latest.fixed.length)}
            </p>
          </div>
        </div>
        <Link href={`/runs/${latest.runId}`} className="inline-flex items-center gap-0.5 text-caption font-medium text-ink hover:underline">
          {t.fullReport}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const added = latest.rows.filter((r) => r.mark === "new").length;
  const still = latest.rows.filter((r) => r.mark === "still").length;
  const columns = latest.columns.length > 0 ? latest.columns : Object.keys(latest.rows[0]?.values ?? {});
  const changed = added > 0 || latest.fixed.length > 0;
  const total = latest.rows.length + latest.fixed.length;
  const shown = expanded ? total : Math.min(total, ROW_CAP);
  const body = [
    ...latest.rows.map((row) => ({ kind: "row" as const, mark: row.mark, values: row.values })),
    ...latest.fixed.map((values) => ({ kind: "fixed" as const, mark: null, values })),
  ].slice(0, shown);

  return (
    <div className="p-4">
      <div className="film">
        <div className="film-edge">
          <span className="lead">{t.resultFilm}</span>
          <span className="lead">{t.rowsReturned(latest.rowCount)}</span>
        </div>
        <div className="film-scroll">
          <table>
            <thead>
              <tr>
                {changed && <th className="w-24">{latest.compared ? t.comparedFilm : t.firstRun}</th>}
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {body.map((row, i) => (
                <tr key={i} className={row.kind === "fixed" ? "unlit" : cn("lit", row.mark === "new" && "new")}>
                  {changed && (
                    <td className="film-mark">
                      {row.kind === "fixed" ? (
                        <span className="tag tag-fixed">{t.markFixed}</span>
                      ) : row.mark === "new" ? (
                        <span className="tag tag-new">{t.markNew}</span>
                      ) : row.mark === "still" ? (
                        <span className="tag tag-still">{t.markStill}</span>
                      ) : null}
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column} title={cellText(row.values[column])}>
                      {cellText(row.values[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="film-more">
          {latest.compared && (
            <span>
              {t.newRows(added)} · {t.stillRows(still)} · {t.fixedRows(latest.fixed.length)}
            </span>
          )}
          {total > ROW_CAP && (
            <button type="button" onClick={() => setExpanded((open) => !open)}>
              {expanded ? t.showFirst(ROW_CAP) : t.showAll(total)}
            </button>
          )}
          {!expanded && total > ROW_CAP && <span>{t.shownOf(shown, total)}</span>}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Link href={`/runs/${latest.runId}`} className="inline-flex items-center gap-0.5 text-caption font-medium text-ink hover:underline">
          {t.fullReport}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
