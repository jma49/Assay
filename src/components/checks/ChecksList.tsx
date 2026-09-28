"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BellOff, Hand, Search } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import { Input } from "@/components/ui/input";
import { useApi } from "@/client/use-api";
import type { CheckSummary } from "@/contracts/checks";
import type { RunOutcome } from "@/domain/run";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { Sparkline } from "./Sparkline";
import { OUTCOME_DOT, OUTCOME_GROUPS, OUTCOME_LABEL, scheduleLabel } from "./status";

type Filter = "all" | RunOutcome;

const COPY = {
  en: {
    search: "Search checks, tags, scopes",
    broken: "Broken",
    brokenHint: "Queries that fail",
    issues: "With issues",
    issuesHint: (rows: number) => `${rows} rows need attention`,
    clean: "Clean",
    cleanHint: "No rows returned",
    changed: "Changed in 24 h",
    changedHint: "Checks whose outcome changed",
    all: "All",
    check: "Check",
    now: "Now",
    delta: "Δ last run",
    trend: "Last 30 runs",
    schedule: "Schedule",
    lastRun: "Last run",
    queryError: "Query error",
    rows: (n: number) => (n === 1 ? "1 row" : `${n} rows`),
    neverRan: "Not run yet",
    empty: "No checks match.",
    noChecks: "No checks yet.",
    newCheck: "Write your first check",
    loadFailed: "Could not load checks",
    count: (n: number) => `${n} checks`,
    acknowledgedBy: (name: string) => `Acknowledged by ${name}`,
    muted: "Alerts muted",
  },
  zh: {
    search: "搜索检查、标签、范围",
    broken: "出错",
    brokenHint: "查询执行失败",
    issues: "有问题",
    issuesHint: (rows: number) => `共 ${rows} 行需要处理`,
    clean: "正常",
    cleanHint: "没有返回任何行",
    changed: "24 小时内变化",
    changedHint: "结果状态发生变化的检查",
    all: "全部",
    check: "检查",
    now: "当前",
    delta: "较上次",
    trend: "最近 30 次",
    schedule: "定时",
    lastRun: "上次执行",
    queryError: "查询出错",
    rows: (n: number) => `${n} 行`,
    neverRan: "尚未执行",
    empty: "没有匹配的检查。",
    noChecks: "还没有检查。",
    newCheck: "编写第一个检查",
    loadFailed: "无法加载检查",
    count: (n: number) => `${n} 个检查`,
    acknowledgedBy: (name: string) => `${name} 已确认处理`,
    muted: "告警已静音",
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function Delta({ check }: { check: CheckSummary }) {
  const state = check.state;
  if (!state || state.outcome === "error" || state.previousRowCount === null || state.previousRowCount === state.rowCount) {
    return <span className="text-muted-foreground">—</span>;
  }
  const diff = state.rowCount - state.previousRowCount;
  return (
    <span className={cn("font-medium tabular-nums", diff > 0 ? "text-failure" : "text-success")}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff)}
    </span>
  );
}

/** The checks home: current state first, grouped so broken and flagged checks come first. */
export function ChecksList() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = COPY[language];
  const zh = language === "zh";
  const { data, error, loading } = useApi<{ checks: CheckSummary[] }>("/api/checks");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const checks = useMemo(() => data?.checks ?? [], [data]);

  const counts = useMemo(() => {
    const now = Date.now();
    const of = (o: RunOutcome) => checks.filter((c) => c.state?.outcome === o);
    return {
      error: of("error").length,
      issues: of("issues").length,
      rows: of("issues").reduce((sum, c) => sum + (c.state?.rowCount ?? 0), 0),
      clean: of("clean").length,
      changed: checks.filter((c) => c.state && now - new Date(c.state.since).getTime() < DAY_MS).length,
    };
  }, [checks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return checks.filter(
      (c) =>
        (filter === "all" || c.state?.outcome === filter) &&
        (!q || [c.name, c.cnName, c.scriptId, c.scope, ...c.tags].some((f) => f?.toLowerCase().includes(q))),
    );
  }, [checks, filter, query]);

  const name = (c: CheckSummary) => (zh ? c.cnName || c.name : c.name);
  const tiles: { key: Filter; label: string; value: number; hint: string; dot?: string }[] = [
    { key: "error", label: t.broken, value: counts.error, hint: t.brokenHint, dot: OUTCOME_DOT.error },
    { key: "issues", label: t.issues, value: counts.issues, hint: t.issuesHint(counts.rows), dot: OUTCOME_DOT.issues },
    { key: "clean", label: t.clean, value: counts.clean, hint: t.cleanHint, dot: OUTCOME_DOT.clean },
  ];

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        <div className="relative w-64 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
      </WindowToolbar>
      {data && <WindowStatusBar>{t.count(checks.length)}</WindowStatusBar>}

      {/* Summary: each tile filters the list below; the last one only reports. */}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-border lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const active = filter === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? "all" : tile.key)}
              className={cn(
                "flex flex-col gap-0.5 px-5 py-4 text-left transition-[background-color] duration-150",
                i > 0 && "lg:border-l",
                i === 2 && "max-lg:border-t",
                i === 1 && "border-l",
                active ? "bg-primary-soft" : "hover:bg-muted/60",
              )}
            >
              <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className={cn("status-dot", tile.dot)} aria-hidden />
                {tile.label}
              </span>
              <span className="text-[24px] leading-tight font-semibold tabular-nums">{loading && !data ? "–" : tile.value}</span>
              <span className="text-[12px] text-muted-foreground">{loading && !data ? "\u00a0" : tile.hint}</span>
            </button>
          );
        })}
        <div className="flex flex-col gap-0.5 border-l px-5 py-4 max-lg:border-t">
          <span className="text-[12px] text-muted-foreground">{t.changed}</span>
          <span className="text-[24px] leading-tight font-semibold tabular-nums">{loading && !data ? "–" : counts.changed}</span>
          <span className="text-[12px] text-muted-foreground">{t.changedHint}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
          <div role="group" aria-label={t.all} className="inline-flex gap-0.5 rounded-[7px] border bg-background p-0.5">
            {(["all", "error", "issues", "clean"] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-[12.5px] transition-[color,background-color] duration-150",
                  filter === key ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "all" ? t.all : OUTCOME_LABEL[key][language]}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">
            {t.loadFailed}: {error}
          </p>
        ) : loading && !data ? (
          <div className="space-y-2 p-4" aria-busy>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-11 rounded-md" />
            ))}
          </div>
        ) : checks.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-muted-foreground">
            <p>{t.noChecks}</p>
            <Link href="/checks/new" className="mt-2 inline-block font-medium text-primary hover:underline">
              {t.newCheck}
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Fixed column widths, so filtering or searching never shifts the columns. */}
            <table className="w-full table-fixed text-[13px]">
              <thead>
                <tr className="border-b text-[12px] text-muted-foreground">
                  <th className="w-10 px-4 py-2" />
                  <th className="px-3 py-2 text-left font-medium">{t.check}</th>
                  <th className="w-28 px-3 py-2 text-left font-medium">{t.now}</th>
                  <th className="w-24 px-3 py-2 text-left font-medium max-sm:hidden">{t.delta}</th>
                  <th className="w-32 px-3 py-2 text-left font-medium max-md:hidden">{t.trend}</th>
                  <th className="w-48 px-3 py-2 text-left font-medium max-lg:hidden">{t.schedule}</th>
                  <th className="w-32 px-4 py-2 text-right font-medium">{t.lastRun}</th>
                </tr>
              </thead>
              <tbody>
                {[...OUTCOME_GROUPS, null].map((group) => {
                  const rows = visible.filter((c) => (group ? c.state?.outcome === group.outcome : !c.state));
                  if (rows.length === 0) return null;
                  return [
                    <tr key={`group-${group?.outcome ?? "never"}`} className="border-b bg-background">
                      <td colSpan={7} className="px-4 py-1.5 text-[12px] font-medium text-muted-foreground">
                        {group ? group.title[language] : t.neverRan} · {rows.length}
                        {group && <span className="font-normal text-muted-foreground"> — {group.hint[language]}</span>}
                      </td>
                    </tr>,
                    ...rows.map((c) => (
                      <tr
                        key={c.scriptId}
                        className="cursor-pointer border-b transition-[background-color] duration-150 last:border-0 hover:bg-muted/60"
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest("a")) return;
                          router.push(`/checks/${encodeURIComponent(c.scriptId)}`);
                        }}
                      >
                        <td className="px-4 py-2.5">
                          {c.state && <span className={cn("status-dot", OUTCOME_DOT[c.state.outcome])} aria-label={OUTCOME_LABEL[c.state.outcome][language]} />}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Link href={`/checks/${encodeURIComponent(c.scriptId)}`} className="truncate font-medium hover:underline">
                              {name(c)}
                            </Link>
                            {c.alerting.acknowledged && (
                              <Hand className="size-3.5 shrink-0 text-primary" aria-label={t.acknowledgedBy(c.alerting.acknowledged.by)} />
                            )}
                            {c.alerting.mutedUntil && <BellOff className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.muted} />}
                          </div>
                          <span className="block truncate font-mono text-[11.5px] text-muted-foreground">
                            {c.scriptId}
                            {c.alerting.owner && <span className="font-sans"> · {c.alerting.owner.name}</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {!c.state ? (
                            <span className="text-muted-foreground">—</span>
                          ) : c.state.outcome === "error" ? (
                            <span className="text-failure">{t.queryError}</span>
                          ) : c.state.rowCount === 0 ? (
                            <span className="text-muted-foreground">{t.rows(0)}</span>
                          ) : (
                            t.rows(c.state.rowCount)
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-sm:hidden">
                          <Delta check={c} />
                        </td>
                        <td className="px-3 py-2.5 max-md:hidden">
                          <Sparkline points={c.history} outcome={c.state?.outcome ?? "clean"} />
                        </td>
                        <td className="truncate px-3 py-2.5 whitespace-nowrap text-muted-foreground max-lg:hidden" title={c.schedule ?? undefined}>
                          {scheduleLabel(c.schedule, language)}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap text-muted-foreground" title={c.state ? formatDateTime(c.state.lastRunAt, language) : undefined}>
                          {c.state ? formatRelative(c.state.lastRunAt, language) : t.neverRan}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
