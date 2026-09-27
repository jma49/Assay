"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SqlScript } from "@/components/business/dashboard/types";
import type { CoverageReport } from "@/lib/coverage/coverage";
import { cn } from "@/lib/utils/utils";
import { listKeyHandler } from "./list-keys";

export type CoverageState = CoverageReport | "loading" | "error" | null;

/** Loads the coverage report the first time `enabled` is true; it reads the database schema. */
export function useCoverage(enabled: boolean): CoverageState {
  const [state, setState] = useState<CoverageState>(null);
  useEffect(() => {
    if (!enabled || state !== null) return;
    setState("loading");
    fetch("/api/coverage")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((report: CoverageReport) => setState(report))
      .catch(() => setState("error"));
  }, [enabled, state]);
  return state;
}

/** A row of the list: a database table, or a table checks read that no longer exists. */
interface CoverageRow {
  table: string;
  missing: boolean;
  columnCount?: number;
  checks: { scriptId: string; name: string; cnName?: string }[];
}

function coverageRows(report: CoverageReport, scripts: SqlScript[]): CoverageRow[] {
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
 * The Finder's coverage view: tables without a check first, then the
 * covered ones; missing tables (stale checks) on top of both.
 */
export function CoveragePanes({
  coverage,
  scripts,
  searchTerm,
  language,
  checkHref,
}: {
  coverage: CoverageState;
  scripts: SqlScript[];
  searchTerm: string;
  language: string;
  /** Where a check listed under a table links to. */
  checkHref: (scriptId: string) => string;
}) {
  const zh = language === "zh";
  const t = zh ? COPY.zh : COPY.en;
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (typeof coverage !== "object" || coverage === null) return [];
    const q = searchTerm.trim().toLowerCase();
    return coverageRows(coverage, scripts).filter((row) => !q || row.table.toLowerCase().includes(q));
  }, [coverage, scripts, searchTerm]);

  useEffect(() => {
    if (!rows.some((row) => row.table === selectedTable)) setSelectedTable(rows[0]?.table ?? null);
  }, [rows, selectedTable]);

  const selected = rows.find((row) => row.table === selectedTable) ?? null;
  const notice =
    coverage === "loading" || coverage === null ? t.loading : coverage === "error" ? t.loadFailed : rows.length === 0 ? t.empty : null;

  return (
    <>
      <ul
        aria-label={t.list}
        onKeyDown={listKeyHandler(
          rows.map((row) => row.table),
          selectedTable,
          setSelectedTable,
        )}
        className="w-80 shrink-0 overflow-y-auto border-r max-xl:max-h-72 max-xl:w-full max-xl:border-r-0 max-xl:border-b">
        {notice ? (
          <li className="p-6 text-center text-[13px] text-muted-foreground">{notice}</li>
        ) : (
          rows.map((row) => {
            const active = row.table === selectedTable;
            const tone = row.missing ? "failure" : row.checks.length > 0 ? "success" : "attention_needed";
            return (
              <li key={row.table}>
                <button
                  type="button"
                  data-list-id={row.table}
                  tabIndex={active ? 0 : -1}
                  aria-pressed={active}
                  onClick={() => setSelectedTable(row.table)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left",
                    active ? "bg-primary-soft" : "hover:bg-muted",
                  )}
                >
                  <span className={cn("status-dot shrink-0", `status-dot-${tone}`)} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{row.table}</span>
                  <span className={cn("shrink-0 text-[11px] tabular-nums", "text-muted-foreground")}>
                    {row.missing ? t.missing : row.checks.length}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <section className="min-w-0 flex-1 overflow-y-auto bg-card">
        {typeof coverage === "object" && coverage && (
          <p className="border-b px-6 py-2 text-[12px] text-muted-foreground">{t.tablesCovered(coverage.covered, coverage.tables.length)}</p>
        )}
        {selected && (
          <div className="space-y-5 p-6">
            <header className="space-y-1">
              <h2 className="font-mono text-[20px] leading-tight font-semibold break-all">{selected.table}</h2>
              <p className="text-[13px] text-muted-foreground">
                {selected.missing ? t.missingTable : selected.checks.length > 0 ? t.watchedBy(selected.checks.length) : t.unwatched}
                {selected.columnCount !== undefined && ` · ${t.columns(selected.columnCount)}`}
              </p>
            </header>

            {selected.checks.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {selected.checks.map((check) => (
                  <li key={check.scriptId}>
                    <Link href={checkHref(check.scriptId)} className="block w-full px-4 py-2 text-left hover:bg-foreground/[0.04]">
                      <span className="block text-[13px] font-medium">{zh ? check.cnName || check.name : check.name}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{check.scriptId}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!selected.missing && (
              <Button asChild size="sm" variant={selected.checks.length > 0 ? "outline" : "default"}>
                <Link href={`/checks/new?table=${encodeURIComponent(selected.table)}`}>
                  <Plus />
                  {t.newCheck}
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
