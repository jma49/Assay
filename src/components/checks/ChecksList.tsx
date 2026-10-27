"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BellOff, Hand, Search } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { PageHeader } from "@/components/layout/PageHeader";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import { pageTitle } from "@/components/layout/app-shell-routes";
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
import { OUTCOME_GROUPS, OUTCOME_LABEL, OUTCOME_TEXT } from "./status";
import { OutcomeGlyph } from "./OutcomeGlyph";

type Filter = "all" | RunOutcome;

const COPY = {
  en: {
    search: "Search checks, tags, scopes",
    summary: "Checks by outcome",
    broken: "Broken",
    brokenHint: "Queries that fail",
    issues: "Issues",
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
    rows: (n: number) => (n === 1 ? "1 row" : `${n} rows`),
    neverRan: "Not run yet",
    empty: "No check matches. Clear the search or choose another tile.",
    noChecks: "No checks yet. A check is a read-only query whose rows are problems.",
    newCheck: "Write your first check",
    loadFailed: "Could not load checks",
    count: (n: number) => (n === 1 ? "1 check" : `${n} checks`),
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
    rows: (n: number) => `${n} 行`,
    neverRan: "尚未执行",
    empty: "没有匹配的检查。清空搜索，或换一个筛选。",
    noChecks: "还没有检查。检查就是一条只读查询，它返回的行就是问题。",
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
    return <span className="text-ink-3">—</span>;
  }
  const diff = state.rowCount - state.previousRowCount;
  if (diff === 0) return <span className="text-ink-3 tabular-nums">0</span>;
  // More flagged rows is more to look at; fewer is progress. Never the safelight.
  return (
    <span className={cn("font-medium tabular-nums", diff > 0 ? "text-attention" : "text-ink-2")}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff)}
    </span>
  );
}

/** What the check found on its last run: the outcome word, never a coloured pill. */
function Now({ check, t, language }: { check: CheckSummary; t: Copy; language: "en" | "zh" }) {
  const state = check.state;
  if (!state) return <span className="text-ink-3">—</span>;
  const text = state.outcome === "error" ? OUTCOME_LABEL.error[language] : t.rows(state.rowCount);
  return <span className={cn("font-medium whitespace-nowrap tabular-nums", OUTCOME_TEXT[state.outcome])}>{text}</span>;
}

function Markers({ check, t }: { check: CheckSummary; t: Copy }) {
  return (
    <>
      {check.alerting.acknowledged && (
        <Hand className="size-3.5 shrink-0 text-ink-2" aria-label={t.acknowledgedBy(check.alerting.acknowledged.by)} />
      )}
      {check.alerting.mutedUntil && <BellOff className="size-3.5 shrink-0 text-ink-3" aria-label={t.muted} />}
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

  // On a wide screen the most urgent check opens beside the list, so the panel is never empty.
  const shown = selected ?? (split ? (checks.find((c) => c.state?.outcome === "error") ?? checks.find((c) => c.state?.outcome === "issues") ?? checks[0])?.scriptId : null) ?? null;

  const name = (c: CheckSummary) => (zh ? c.cnName || c.name : c.name);
  const pending = loading && !data;
  const tile = (key: Filter, label: string, value: number, hint: string, glyph: RunOutcome | null): StatTile => ({
    key,
    label,
    glyph,
    value: pending ? "–" : value,
    hint: pending ? " " : hint,
    pressed: filter === key,
    onClick: () => setFilter(filter === key && key !== "all" ? "all" : key),
  });
  const tiles: StatTile[] = [
    tile("all", t.allChecks, checks.length, t.allHint(checks.length), null),
    tile("error", t.broken, counts.error, t.brokenHint, "error"),
    tile("issues", t.issues, counts.issues, t.issuesHint(counts.rows), "issues"),
    tile("clean", t.clean, counts.clean, t.cleanHint, "clean"),
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
    <div className={`${APP_CONTAINER} space-y-4 py-6`}>
      <PageHeader title={pageTitle("/checks")?.[language] ?? "Checks"} />
      <WindowToolbar>
        <div className="relative w-72 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            aria-label={t.search}
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 rounded-sm border-line-2 bg-white/45 pl-9"
          />
        </div>
      </WindowToolbar>
      {data && <WindowStatusBar>{t.count(checks.length)}</WindowStatusBar>}

      {/* The tiles are the filter. */}
      <StatStrip tiles={tiles} label={t.summary} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-4">
          {error ? (
            <div className="face-note px-6 py-10 text-center text-body-sm text-ink-2">
              <p className="font-medium text-ink">{t.loadFailed}</p>
              <p className="mt-1">{apiErrorCodeText(errorCode, language) ?? String(error)}</p>
            </div>
          ) : pending ? (
            <div className="space-y-px overflow-hidden rounded-sm border border-line-2" aria-busy>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-14" />
              ))}
            </div>
          ) : checks.length === 0 ? (
            <div className="face-note px-6 py-12 text-center text-body-sm text-ink-2">
              <p>{t.noChecks}</p>
              <Link href="/checks/new" className="mt-2 inline-block font-medium text-ink underline underline-offset-4">
                {t.newCheck}
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <p className="face-note px-6 py-10 text-center text-body-sm text-ink-2">{t.empty}</p>
          ) : (
            groups.map(({ group, rows }) => (
              <section key={group?.outcome ?? "never"} aria-label={group ? group.title[language] : t.neverRan}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 pb-2">
                  <h2 className="lead text-ink-2">{group ? group.title[language] : t.neverRan}</h2>
                  <span className="font-mono text-caption text-ink-3 tabular-nums">{rows.length}</span>
                  {group && <span className="text-caption text-ink-3">{group.hint[language]}</span>}
                </div>
                <ul className="overflow-hidden rounded-sm border border-line-2 bg-white/30">
                  {rows.map((c) => {
                    const active = shown === c.scriptId;
                    return (
                      <li key={c.scriptId} className="border-b border-line last:border-0">
                        <Link
                          href={`/checks?check=${encodeURIComponent(c.scriptId)}`}
                          scroll={false}
                          replace
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 text-body-sm transition-[background-color] duration-150 max-md:px-3 md:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem] xl:grid-cols-[minmax(0,1fr)_auto_6.5rem]",
                            active ? "bg-face-hi" : "hover:bg-white/50",
                          )}
                        >
                          {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-ink" aria-hidden />}
                          <span className="flex min-w-0 items-start gap-2.5">
                            <OutcomeGlyph outcome={c.state?.outcome ?? null} className="mt-1" />
                            <span className="min-w-0">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={cn("truncate text-body-md font-medium text-ink", active && "text-ink")}>{name(c)}</span>
                                <Markers check={c} t={t} />
                              </span>
                              <span className="mt-0.5 block truncate font-mono text-caption text-ink-3">
                                {c.scriptId}
                                {c.alerting.owner && <span className="font-sans"> · {c.alerting.owner.name}</span>}
                              </span>
                            </span>
                          </span>
                          <span className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Now check={c} t={t} language={language} />
                            <Delta check={c} />
                          </span>
                          <span className="max-md:hidden xl:hidden">
                            <Sparkline points={c.history} outcome={c.state?.outcome ?? "clean"} />
                          </span>
                          <span
                            className="text-right whitespace-nowrap text-caption text-ink-3 max-md:hidden"
                            title={c.state ? formatDateTime(c.state.lastRunAt, language) : undefined}
                          >
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
        {shown &&
          (split ? (
            <aside className="panel-sheet sticky top-4 max-h-[calc(100dvh-6rem)] overflow-y-auto">
              <CheckPanel key={shown} scriptId={shown} onClose={() => select(null)} />
            </aside>
          ) : (
            <div className="fixed inset-0 z-40 flex justify-end bg-room-950/45" onClick={(e) => e.target === e.currentTarget && select(null)}>
              <aside role="dialog" aria-modal="true" className="h-full w-full max-w-[520px] overflow-y-auto bg-face-hi shadow-md">
                <CheckPanel key={shown} scriptId={shown} onClose={() => select(null)} />
              </aside>
            </div>
          ))}
      </div>
    </div>
  );
}
