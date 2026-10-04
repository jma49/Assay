"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckDefinition } from "@/components/business/dashboard/types";
import type { CoverageReport } from "@/lib/coverage/coverage";
import { cn } from "@/lib/utils/utils";
import { useApi } from "@/client/use-api";
import { DEFAULT_SOURCE_ID } from "@/domain/data-source";

export type CoverageState = CoverageReport | "loading" | "error" | null;

/** Loads the coverage report of a data source while `enabled`; it reads that database's schema. */
export function useCoverage(enabled: boolean, sourceId: string = DEFAULT_SOURCE_ID): CoverageState {
  const url = `/api/coverage?source=${encodeURIComponent(sourceId)}`;
  const { data, dataUrl, error } = useApi<CoverageReport>(enabled ? url : null);
  if (!enabled) return null;
  if (error) return "error";
  // A report for another source is not shown while this one loads.
  return data && dataUrl === url ? data : "loading";
}

/** A row of the list: a database table, or a table checks read that no longer exists. */
interface CoverageRow {
  table: string;
  missing: boolean;
  columnCount?: number;
  checks: { scriptId: string; name: string; cnName?: string }[];
}

function coverageRows(report: CoverageReport, scripts: CheckDefinition[]): CoverageRow[] {
  const missing = new Map<string, CoverageRow>();
  for (const { scriptId, table } of report.unknown) {
    const script = scripts.find((s) => s.scriptId === scriptId);
    const row = missing.get(table) ?? { table, missing: true, checks: [] };
    row.checks.push({ scriptId, name: script?.name ?? scriptId, cnName: script?.cnName });
    missing.set(table, row);
  }
  return [...missing.values(), ...report.tables.map((t) => ({ ...t, missing: false }))];
}

const COPY = {
  en: {
    list: "Tables",
    empty: "No tables",
    loading: "Reading the database…",
    loadFailed: "Could not read the database schema.",
    missing: "missing",
    tablesCovered: (covered: number, total: number) => `${covered} of ${total} tables have a check`,
    watchedBy: (n: number) => (n === 1 ? "Watched by 1 check" : `Watched by ${n} checks`),
    unwatched: "No check reads this table yet.",
    missingTable: "This table is not in the database. These checks will fail until they are updated:",
    columns: (n: number) => `${n} columns`,
    newCheck: "New check for this table",
  },
  zh: {
    list: "数据表",
    empty: "没有数据表",
    loading: "正在读取数据库…",
    loadFailed: "无法读取数据库表结构。",
    missing: "缺失",
    tablesCovered: (covered: number, total: number) => `${total} 张表中有 ${covered} 张已有检查`,
    watchedBy: (n: number) => `有 ${n} 个检查覆盖`,
    unwatched: "还没有检查读取这张表。",
    missingTable: "数据库里没有这张表。下面这些检查在修改之前都会失败：",
    columns: (n: number) => `${n} 列`,
    newCheck: "为这张表新建检查",
  },
};

/**
 * One card per table: missing tables (stale checks) first, then tables no check reads, then the
 * covered ones, each with the checks that read it and a way to add one.
 */
export function CoverageGrid({
  coverage,
  scripts,
  language,
  checkHref,
  sourceId = DEFAULT_SOURCE_ID,
}: {
  coverage: CoverageState;
  scripts: CheckDefinition[];
  language: string;
  /** Where a check listed under a table links to. */
  checkHref: (scriptId: string) => string;
  /** The data source the report is for; a new check for a table starts on it. */
  sourceId?: string;
}) {
  const zh = language === "zh";
  const t = zh ? COPY.zh : COPY.en;
  const rows = useMemo(() => {
    if (typeof coverage !== "object" || coverage === null) return [];
    const rank = (row: CoverageRow) => (row.missing ? 0 : row.checks.length === 0 ? 1 : 2);
    return coverageRows(coverage, scripts).sort((a, b) => rank(a) - rank(b));
  }, [coverage, scripts]);
  const notice =
    coverage === "loading" || coverage === null ? t.loading : coverage === "error" ? t.loadFailed : rows.length === 0 ? t.empty : null;

  if (notice) {
    return <p className="rounded-xl bg-card px-6 py-10 text-center text-body-sm text-muted-foreground shadow-border">{notice}</p>;
  }
  const report = coverage as CoverageReport;
  const share = report.tables.length ? report.covered / report.tables.length : 0;

  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <p className="text-body-sm text-muted-foreground">{t.tablesCovered(report.covered, report.tables.length)}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      </div>
      <ul aria-label={t.list} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const tone = row.missing ? "failure" : row.checks.length > 0 ? "success" : "attention_needed";
          return (
            <li key={row.table} className={cn("flex flex-col rounded-xl bg-card p-5 shadow-border", !row.missing && row.checks.length === 0 && "border-2 border-dashed border-border-strong shadow-none")}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("status-dot shrink-0", `status-dot-${tone}`)} aria-hidden />
                  <span className="truncate font-mono text-body-md">{row.table}</span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-caption", row.missing ? "bg-failure-soft text-failure" : row.checks.length ? "bg-primary-soft text-primary-ink" : "bg-muted text-muted-foreground")}>
                  {row.missing ? t.missing : row.checks.length}
                </span>
              </div>
              <p className="mt-1 text-caption text-muted-foreground">
                {row.missing ? t.missingTable : row.checks.length > 0 ? t.watchedBy(row.checks.length) : t.unwatched}
                {row.columnCount !== undefined && ` · ${t.columns(row.columnCount)}`}
              </p>
              {row.checks.length > 0 && (
                <ul className="mt-3 flex-1 space-y-0.5">
                  {row.checks.map((check) => (
                    <li key={check.scriptId}>
                      <Link href={checkHref(check.scriptId)} className="block truncate rounded-md px-2 py-1 text-body-sm hover:bg-muted">
                        {zh ? check.cnName || check.name : check.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!row.missing && (
                <Button asChild size="sm" variant={row.checks.length > 0 ? "outline" : "default"} className="mt-4 w-fit">
                  <Link href={`/checks/new?table=${encodeURIComponent(row.table)}${sourceId === DEFAULT_SOURCE_ID ? "" : `&source=${encodeURIComponent(sourceId)}`}`}>
                    <Plus />
                    {t.newCheck}
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
