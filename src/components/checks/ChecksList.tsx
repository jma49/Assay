"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BellOff, Hand, Search } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import { Input } from "@/components/ui/input";
import { apiErrorCodeText } from "@/client/api-errors";
import { useApi } from "@/client/use-api";
import type { CheckSummary } from "@/contracts/checks";
import type { RunOutcome } from "@/domain/run";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { Sparkline } from "./Sparkline";
import { CheckPanel } from "./CheckDetailView";
import { StatStrip, type StatTile } from "./StatStrip";
import { OUTCOME_DOT, OUTCOME_GROUPS, OUTCOME_LABEL, OUTCOME_PILL } from "./status";

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
    allChecks: "All checks",
    allHint: (n: number) => `${n} enabled`,
    check: "Check",
    now: "Now",
    delta: "Δ last run",
    trend: "Last 30 runs",
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
    allChecks: "全部检查",
    allHint: (n: number) => `${n} 个已启用`,
    check: "检查",
    now: "当前",
    delta: "较上次",
    trend: "最近 30 次",
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

/** What the check found on its last run, as a pill in its outcome's colour. */
function Now({ check, t }: { check: CheckSummary; t: Copy }) {
  const state = check.state;
  if (!state) return <span className="text-muted-foreground">—</span>;
  const text = state.outcome === "error" ? t.queryError : t.rows(state.rowCount);
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium tabular-nums", OUTCOME_PILL[state.outcome])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {text}
    </span>
  );
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

/** Wide enough for the list and the side panel together; below it the panel opens as a drawer. */
const SPLIT_QUERY = "(min-width: 1280px)";

function useSplitView() {
  const [split, setSplit] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(SPLIT_QUERY);
    const update = () => setSplit(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return split;
}

/**
 * The checks home: current state first, grouped so broken and flagged checks come first.
 * Choosing a check opens it beside the list (`?check=` keeps it linkable); its page is one click away.
 */
export function ChecksList() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { language } = useLanguage();
  const t = COPY[language];
  const zh = language === "zh";
  const split = useSplitView();
  const { data, error, errorCode, loading } = useApi<{ checks: CheckSummary[] }>("/api/checks");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const checks = useMemo(() => data?.checks ?? [], [data]);
  const selected = search.get("check");

  const counts = useMemo(() => {
    const of = (o: RunOutcome) => checks.filter((c) => c.state?.outcome === o);
    return {
      error: of("error").length,
      issues: of("issues").length,
      rows: of("issues").reduce((sum, c) => sum + (c.state?.rowCount ?? 0), 0),
      clean: of("clean").length,
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

  // On a wide screen the first problem opens beside the list, so the panel is never empty.
  const shown = selected ?? (split ? (checks.find((c) => c.state?.outcome === "error") ?? checks.find((c) => c.state?.outcome === "issues") ?? checks[0])?.scriptId : null) ?? null;

  const name = (c: CheckSummary) => (zh ? c.cnName || c.name : c.name);
  const pending = loading && !data;
  const tile = (key: Filter, label: string, value: number, hint: string, dot?: string): StatTile => ({
    key,
    label,
    dot,
    value: pending ? "–" : value,
    hint: pending ? " " : hint,
    pressed: filter === key,
    onClick: () => setFilter(filter === key && key !== "all" ? "all" : key),
  });
  const tiles: StatTile[] = [
    tile("all", t.allChecks, checks.length, t.allHint(checks.length)),
    tile("error", t.broken, counts.error, t.brokenHint, OUTCOME_DOT.error),
    tile("issues", t.issues, counts.issues, t.issuesHint(counts.rows), OUTCOME_DOT.issues),
    tile("clean", t.clean, counts.clean, t.cleanHint, OUTCOME_DOT.clean),
  ];
  const groups = [...OUTCOME_GROUPS, null]
    .map((group) => ({ group, rows: visible.filter((c) => (group ? c.state?.outcome === group.outcome : !c.state)) }))
    .filter(({ rows }) => rows.length > 0);
  const select = (id: string | null) => {
    const params = new URLSearchParams(search.toString());
    if (id) params.set("check", id);
    else params.delete("check");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  // The drawer closes on Escape, like a dialog.
  const drawerOpen = !!selected && !split;
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const lastRun = (c: CheckSummary) => (c.state ? formatRelative(c.state.lastRunAt, language) : t.neverRan);

  return (
    <div className={`${APP_CONTAINER} space-y-6 py-6`}>
      <WindowToolbar>
        <div className="relative w-72 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} className="h-10 rounded-full pl-10" />
        </div>
      </WindowToolbar>
      {data && <WindowStatusBar>{t.count(checks.length)}</WindowStatusBar>}

      {/* The tiles are the filter. */}
      <StatStrip tiles={tiles} label={t.summary} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-4">
          {error ? (
            <p className="rounded-xl bg-card px-6 py-10 text-center text-body-sm text-muted-foreground shadow-border">
              {t.loadFailed}: {apiErrorCodeText(errorCode, language) ?? error}
            </p>
          ) : pending ? (
            <div className="space-y-2 rounded-xl bg-card p-4 shadow-border" aria-busy>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-12 rounded-md" />
              ))}
            </div>
          ) : checks.length === 0 ? (
            <div className="rounded-xl bg-card px-6 py-12 text-center text-body-sm text-muted-foreground shadow-border">
              <p>{t.noChecks}</p>
              <Link href="/checks/new" className="mt-2 inline-block font-medium text-primary hover:underline">
                {t.newCheck}
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-xl bg-card px-6 py-10 text-center text-body-sm text-muted-foreground shadow-border">{t.empty}</p>
          ) : (
            groups.map(({ group, rows }) => (
              <section key={group?.outcome ?? "never"} aria-label={group ? group.title[language] : t.neverRan} className="overflow-hidden rounded-xl bg-card shadow-border">
                <h2 className="border-b bg-muted/50 px-5 py-2.5 text-caption text-muted-foreground max-md:px-4">
                  <span className="font-medium text-foreground">{group ? group.title[language] : t.neverRan}</span> · {rows.length}
                  {group && <span> — {group.hint[language]}</span>}
                </h2>
                <ul>
                  {rows.map((c) => {
                    const active = shown === c.scriptId;
                    return (
                      <li key={c.scriptId} className="border-b last:border-0">
                        <Link
                          href={`/checks?check=${encodeURIComponent(c.scriptId)}`}
                          scroll={false}
                          replace
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3.5 text-body-sm transition-[background-color] duration-150 max-md:px-4 md:grid-cols-[minmax(0,1fr)_8.5rem_8rem_7rem] xl:grid-cols-[minmax(0,1fr)_auto_6.5rem]",
                            active ? "bg-primary-soft" : "hover:bg-muted/60",
                          )}
                        >
                          {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                              {c.state && <span className={cn("status-dot shrink-0", OUTCOME_DOT[c.state.outcome])} aria-label={OUTCOME_LABEL[c.state.outcome][language]} />}
                              <span className={cn("truncate text-body-md font-medium", active && "text-primary-ink")}>{name(c)}</span>
                              <Markers check={c} t={t} />
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-caption text-muted-foreground">
                              {c.scriptId}
                              {c.alerting.owner && <span className="font-sans"> · {c.alerting.owner.name}</span>}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Now check={c} t={t} />
                            <Delta check={c} />
                          </span>
                          <span className="max-md:hidden xl:hidden">
                            <Sparkline points={c.history} outcome={c.state?.outcome ?? "clean"} />
                          </span>
                          <span className="text-right whitespace-nowrap text-muted-foreground max-md:hidden" title={c.state ? formatDateTime(c.state.lastRunAt, language) : undefined}>
                            {lastRun(c)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* Beside the list on wide screens; a drawer over the page below that. */}
        {shown && (split ? (
          <aside className="sticky top-6 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl bg-card shadow-border">
            <CheckPanel key={shown} scriptId={shown} onClose={() => select(null)} />
          </aside>
        ) : (
          <div className="fixed inset-0 z-40 flex justify-end bg-foreground/30" onClick={(e) => e.target === e.currentTarget && select(null)}>
            <aside role="dialog" aria-modal="true" className="h-full w-full max-w-[520px] overflow-y-auto bg-card shadow-md">
              <CheckPanel key={shown} scriptId={shown} onClose={() => select(null)} />
            </aside>
          </div>
        ))}
      </div>
    </div>
  );
}
