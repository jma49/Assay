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
import { StatStrip, type StatTile } from "./StatStrip";
import { OUTCOME_DOT, OUTCOME_GROUPS, OUTCOME_LABEL, scheduleLabel } from "./status";

type Filter = "all" | RunOutcome;

const COPY = {
  en: {
    search: "Search checks, tags, scopes",
    summary: "Checks by outcome",
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
    summary: "按结果统计的检查",
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

type Copy = (typeof COPY)["en"];

/** Rows flagged now against the previous run; "0" when unchanged, "—" when there is nothing to compare. */
function Delta({ check }: { check: CheckSummary }) {
  const state = check.state;
  if (!state || state.outcome === "error" || state.previousRowCount === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const diff = state.rowCount - state.previousRowCount;
  if (diff === 0) return <span className="text-muted-foreground tabular-nums">0</span>;
  // More flagged rows is more to look at (attention), fewer is progress (success); never the error red.
  return (
    <span className={cn("font-medium tabular-nums", diff > 0 ? "text-attention" : "text-success")}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff)}
    </span>
  );
}

/** What the check found on its last run, in words. */
function Now({ check, t }: { check: CheckSummary; t: Copy }) {
  if (!check.state) return <span className="text-muted-foreground">—</span>;
  if (check.state.outcome === "error") return <span className="text-failure">{t.queryError}</span>;
  if (check.state.rowCount === 0) return <span className="text-muted-foreground">{t.rows(0)}</span>;
  return <>{t.rows(check.state.rowCount)}</>;
}

function Markers({ check, t }: { check: CheckSummary; t: Copy }) {
  return (
    <>
      {check.alerting.acknowledged && (
        <Hand className="size-3.5 shrink-0 text-primary" aria-label={t.acknowledgedBy(check.alerting.acknowledged.by)} />
      )}
      {check.alerting.mutedUntil && <BellOff className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.muted} />}
    </>
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
  const pending = loading && !data;
  const outcomeTile = (key: RunOutcome, label: string, value: number, hint: string): StatTile => ({
    key,
    label,
    dot: OUTCOME_DOT[key],
    value: pending ? "–" : value,
    hint: pending ? " " : hint,
    pressed: filter === key,
    onClick: () => setFilter(filter === key ? "all" : key),
  });
  const tiles: StatTile[] = [
    outcomeTile("error", t.broken, counts.error, t.brokenHint),
    outcomeTile("issues", t.issues, counts.issues, t.issuesHint(counts.rows)),
    outcomeTile("clean", t.clean, counts.clean, t.cleanHint),
    { key: "changed", label: t.changed, value: pending ? "–" : counts.changed, hint: t.changedHint },
  ];
  const groups = [...OUTCOME_GROUPS, null]
    .map((group) => ({ group, rows: visible.filter((c) => (group ? c.state?.outcome === group.outcome : !c.state)) }))
    .filter(({ rows }) => rows.length > 0);
  const groupTitle = (group: (typeof OUTCOME_GROUPS)[number] | null, count: number) => (
    <>
      {group ? group.title[language] : t.neverRan} · {count}
      {group && <span className="font-normal"> — {group.hint[language]}</span>}
    </>
  );
  const href = (c: CheckSummary) => `/checks/${encodeURIComponent(c.scriptId)}`;
  const lastRun = (c: CheckSummary) => (c.state ? formatRelative(c.state.lastRunAt, language) : t.neverRan);
  const dot = (c: CheckSummary) =>
    c.state && <span className={cn("status-dot", OUTCOME_DOT[c.state.outcome])} aria-label={OUTCOME_LABEL[c.state.outcome][language]} />;

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        <div className="relative w-64 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
      </WindowToolbar>
      {data && <WindowStatusBar>{t.count(checks.length)}</WindowStatusBar>}

      {/* Each outcome tile filters the list below; the last one only reports. */}
      <StatStrip tiles={tiles} label={t.summary} />

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
          <div role="group" aria-label={t.all} className="inline-flex gap-0.5 rounded-md border bg-background p-0.5">
            {(["all", "error", "issues", "clean"] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[12px] transition-[color,background-color] duration-150",
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
        ) : pending ? (
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
          <>
            {/* Phone: one two-line item per check, so the name keeps the full width. */}
            <div className="md:hidden">
              {groups.map(({ group, rows }) => (
                <section key={group?.outcome ?? "never"} aria-label={group ? group.title[language] : t.neverRan}>
                  <h2 className="border-b bg-background px-4 py-1.5 text-[12px] font-medium text-muted-foreground">{groupTitle(group, rows.length)}</h2>
                  <ul>
                    {rows.map((c) => (
                      <li key={c.scriptId} className="border-b last:border-0">
                        <Link href={href(c)} className="flex items-start gap-3 px-4 py-2.5 text-[13px] transition-[background-color] duration-150 hover:bg-muted/60">
                          <span className="flex h-5 w-2 shrink-0 items-center">{dot(c)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-3">
                              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span className="truncate font-medium">{name(c)}</span>
                                <Markers check={c} t={t} />
                              </span>
                              <span className="shrink-0 whitespace-nowrap tabular-nums">
                                <Now check={c} t={t} />
                              </span>
                            </span>
                            <span className="flex items-baseline gap-3 text-[12px] text-muted-foreground">
                              <span className="min-w-0 flex-1 truncate font-mono">{c.scriptId}</span>
                              <span className="shrink-0 whitespace-nowrap">{lastRun(c)}</span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Fixed column widths, so filtering or searching never shifts the columns. */}
            <div className="overflow-x-auto max-md:hidden">
              <table className="w-full table-fixed text-[13px]">
                <thead>
                  <tr className="border-b text-[12px] text-muted-foreground">
                    <th className="w-10 px-4 py-2" />
                    <th className="px-3 py-2 text-left font-medium">{t.check}</th>
                    <th className="w-28 px-3 py-2 text-left font-medium">{t.now}</th>
                    <th className="w-24 px-3 py-2 text-left font-medium">{t.delta}</th>
                    <th className="w-32 px-3 py-2 text-left font-medium">{t.trend}</th>
                    <th className="w-48 px-3 py-2 text-left font-medium max-lg:hidden">{t.schedule}</th>
                    <th className="w-32 px-4 py-2 text-right font-medium">{t.lastRun}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ group, rows }) => [
                    <tr key={`group-${group?.outcome ?? "never"}`} className="border-b bg-background">
                      <td colSpan={7} className="px-4 py-1.5 text-[12px] font-medium text-muted-foreground">
                        {groupTitle(group, rows.length)}
                      </td>
                    </tr>,
                    ...rows.map((c) => (
                      <tr
                        key={c.scriptId}
                        className="cursor-pointer border-b transition-[background-color] duration-150 last:border-0 hover:bg-muted/60"
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest("a")) return;
                          router.push(href(c));
                        }}
                      >
                        <td className="px-4 py-2.5">{dot(c)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Link href={href(c)} className="truncate font-medium hover:underline">
                              {name(c)}
                            </Link>
                            <Markers check={c} t={t} />
                          </div>
                          <span className="block truncate font-mono text-[12px] text-muted-foreground">
                            {c.scriptId}
                            {c.alerting.owner && <span className="font-sans"> · {c.alerting.owner.name}</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          <Now check={c} t={t} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Delta check={c} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Sparkline points={c.history} outcome={c.state?.outcome ?? "clean"} />
                        </td>
                        <td className="truncate px-3 py-2.5 whitespace-nowrap text-muted-foreground max-lg:hidden" title={c.schedule ?? undefined}>
                          {scheduleLabel(c.schedule, language)}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap text-muted-foreground" title={c.state ? formatDateTime(c.state.lastRunAt, language) : undefined}>
                          {lastRun(c)}
                        </td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
