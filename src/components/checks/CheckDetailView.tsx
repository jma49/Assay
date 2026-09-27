"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Pencil, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { Button } from "@/components/ui/button";
import { useApi } from "@/client/use-api";
import type { CheckDetail, LatestRun, RunListItem } from "@/contracts/checks";
import type { Triage } from "@/lib/ai/triage";
import { useMe } from "@/lib/auth/use-me";
import { nextScheduledRun } from "@/lib/scheduling/schedule";
import { tableReferences } from "@/lib/sql/table-references";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { Sparkline } from "./Sparkline";
import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_PILL, scheduleLabel } from "./status";

type Tab = "result" | "history" | "definition" | "triage";

const COPY = {
  en: {
    since: (when: string) => `since ${when}`,
    neverRan: "Not run yet",
    runNow: "Run now",
    running: "Running…",
    edit: "Edit",
    lastRuns: (n: number) => `Last ${n} runs`,
    rowsFlagged: "Rows flagged",
    now: "now",
    previous: "previous run",
    high: "30-run high",
    tabs: { result: "Latest result", history: "Run history", definition: "Query & schedule", triage: "AI triage" },
    compared: "Compared with the previous run",
    firstRun: "First run: nothing to compare with yet",
    newRows: (n: number) => `${n} new`,
    stillRows: (n: number) => `${n} still open`,
    fixedRows: (n: number) => `${n} fixed`,
    markNew: "New",
    markStill: "Still open",
    markFixed: "Fixed",
    shownOf: (shown: number, total: number) => `Showing ${shown} of ${total} rows. The full set is in the report.`,
    fullReport: "Full report",
    noRows: "No rows returned",
    passed: "This check passed.",
    failed: "The query failed",
    notRun: "This check has not run yet. Run it to see what it finds.",
    run: "Run",
    trigger: "Trigger",
    result: "Result",
    change: "Change",
    duration: "Duration",
    triggers: { manual: "Manual", schedule: "Scheduled", batch: "Batch", api: "API" } as Record<string, string>,
    queryError: "Query error",
    rows: (n: number) => (n === 1 ? "1 row" : `${n} rows`),
    query: "Query",
    readOnly: "Read-only",
    schedule: "Schedule",
    nextRun: (when: string) => `Next run ${when}`,
    reads: "Reads",
    tags: "Tags",
    scope: "Scope",
    author: "Author",
    created: "Created",
    triageIntro: "AI reads the query, the schema and the shape of the returned rows (never their values) and suggests what to look at.",
    triageRun: "Triage the latest run",
    triaging: "Triaging…",
    triageOff: "AI is switched off in this workspace.",
    triageClean: "The latest run is clean. There is nothing to triage.",
    kind: { data_issue: "Data issue", check_error: "Problem in the check", needs_review: "Needs review" } as Record<string, string>,
    causes: "Likely causes",
    nextSteps: "Next steps",
    fixedSql: "Corrected query",
    notFound: "No check with this id.",
    back: "Back to checks",
    runFailed: "Could not run the check",
    ran: "Run finished",
  },
  zh: {
    since: (when: string) => `${when}起`,
    neverRan: "尚未执行",
    runNow: "立即执行",
    running: "执行中…",
    edit: "编辑",
    lastRuns: (n: number) => `最近 ${n} 次执行`,
    rowsFlagged: "标出的行数",
    now: "当前",
    previous: "上一次",
    high: "30 次最高",
    tabs: { result: "最新结果", history: "执行历史", definition: "查询与定时", triage: "AI 分诊" },
    compared: "与上一次执行对比",
    firstRun: "首次执行，暂无可对比的结果",
    newRows: (n: number) => `新增 ${n}`,
    stillRows: (n: number) => `仍未解决 ${n}`,
    fixedRows: (n: number) => `已修复 ${n}`,
    markNew: "新增",
    markStill: "仍未解决",
    markFixed: "已修复",
    shownOf: (shown: number, total: number) => `显示 ${total} 行中的前 ${shown} 行，完整结果见报告。`,
    fullReport: "完整报告",
    noRows: "没有返回任何行",
    passed: "这个检查通过了。",
    failed: "查询执行失败",
    notRun: "这个检查还没有执行过，执行一次看看它能发现什么。",
    run: "执行",
    trigger: "触发方式",
    result: "结果",
    change: "变化",
    duration: "耗时",
    triggers: { manual: "手动", schedule: "定时", batch: "批量", api: "API" } as Record<string, string>,
    queryError: "查询出错",
    rows: (n: number) => `${n} 行`,
    query: "查询",
    readOnly: "只读",
    schedule: "定时",
    nextRun: (when: string) => `下次执行：${when}`,
    reads: "读取的表",
    tags: "标签",
    scope: "范围",
    author: "作者",
    created: "创建时间",
    triageIntro: "AI 会读取查询、表结构和返回行的形态（不读取具体数值），给出排查方向。",
    triageRun: "分诊最新一次执行",
    triaging: "分诊中…",
    triageOff: "这个工作区没有开启 AI。",
    triageClean: "最新一次执行是正常的，不需要分诊。",
    kind: { data_issue: "数据问题", check_error: "检查本身有误", needs_review: "需要人工判断" } as Record<string, string>,
    causes: "可能原因",
    nextSteps: "下一步",
    fixedSql: "修正后的查询",
    notFound: "找不到这个检查。",
    back: "返回检查列表",
    runFailed: "执行失败",
    ran: "执行完成",
  },
};

type Copy = (typeof COPY)["en"];

const ISO_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/;

/** A cell as text; ISO timestamps lose their milliseconds and the T. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") {
    const iso = ISO_TIMESTAMP.exec(value);
    if (iso) return `${iso[1]} ${iso[2]}`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function LatestResult({ latest, t }: { latest: LatestRun; t: Copy }) {
  if (latest.outcome === "error") {
    return (
      <div className="space-y-3 p-5">
        <p className="text-[13px] font-medium text-failure">{t.failed}</p>
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
        <Link href={`/view-execution-result/${latest.runId}`} className="ml-auto inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
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
              <tr key={`fixed-${i}`} className="border-b text-subtle-foreground last:border-0">
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

function RunHistory({ runs, t, language }: { runs: RunListItem[]; t: Copy; language: "en" | "zh" }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b text-[12px] text-muted-foreground">
            <th className="w-8 px-4 py-2" />
            <th className="px-3 py-2 text-left font-medium">{t.run}</th>
            <th className="px-3 py-2 text-left font-medium">{t.trigger}</th>
            <th className="px-3 py-2 text-left font-medium">{t.result}</th>
            <th className="px-3 py-2 text-left font-medium max-sm:hidden">{t.change}</th>
            <th className="px-4 py-2 text-right font-medium max-sm:hidden">{t.duration}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.runId}
              className="cursor-pointer border-b transition-[background-color] duration-150 last:border-0 hover:bg-muted/60"
              onClick={() => router.push(`/view-execution-result/${run.runId}`)}
            >
              <td className="px-4 py-2.5">
                <span className={cn("status-dot", OUTCOME_DOT[run.outcome])} aria-label={OUTCOME_LABEL[run.outcome][language]} />
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap" title={formatDateTime(run.at, language)}>
                <Link href={`/view-execution-result/${run.runId}`} className="hover:underline">
                  {formatRelative(run.at, language)}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{run.trigger ? (t.triggers[run.trigger] ?? run.trigger) : "—"}</td>
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {run.outcome === "error" ? <span className="text-failure">{t.queryError}</span> : t.rows(run.rowCount)}
              </td>
              <td className="px-3 py-2.5 text-[12px] whitespace-nowrap max-sm:hidden">
                {run.diff ? (
                  <span className="space-x-2">
                    {run.diff.added > 0 && <span className="text-failure">+{run.diff.added}</span>}
                    {run.diff.fixed > 0 && <span className="text-success">−{run.diff.fixed}</span>}
                    {run.diff.added === 0 && run.diff.fixed === 0 && <span className="text-subtle-foreground">—</span>}
                  </span>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums max-sm:hidden">
                {run.durationMs === null ? "—" : `${(run.durationMs / 1000).toFixed(1)} s`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Definition({ check, t, language }: { check: CheckDetail; t: Copy; language: "en" | "zh" }) {
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

function TriagePanel({ check, t, language }: { check: CheckDetail; t: Copy; language: "en" | "zh" }) {
  const me = useMe();
  const [triage, setTriage] = useState<Triage | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = check.latest;

  if (!me?.ai) return <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t.triageOff}</p>;
  if (!latest || latest.outcome === "clean") {
    return <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t.triageClean}</p>;
  }

  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: latest.runId, language }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? body.error ?? response.statusText);
      setTriage(body.triage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      {!triage ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-[60ch] text-[13px] text-muted-foreground">{t.triageIntro}</p>
          <Button onClick={start} disabled={busy}>
            <Sparkles />
            {busy ? t.triaging : t.triageRun}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-[13.5px]">
          <p>
            <span className="mr-2 rounded-md bg-primary-soft px-1.5 py-0.5 text-[12px] font-medium text-primary">{t.kind[triage.kind]}</span>
            {triage.summary}
          </p>
          {triage.causes.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] font-medium tracking-wider text-muted-foreground uppercase">{t.causes}</p>
              <ul className="list-disc space-y-1 pl-5">{triage.causes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {triage.nextSteps.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] font-medium tracking-wider text-muted-foreground uppercase">{t.nextSteps}</p>
              <ul className="list-disc space-y-1 pl-5">{triage.nextSteps.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {triage.fixedSql && (
            <div>
              <p className="mb-1 text-[12px] font-medium tracking-wider text-muted-foreground uppercase">{t.fixedSql}</p>
              <pre className="overflow-x-auto rounded-lg bg-code p-4 font-mono text-[12.5px] leading-6">
                {triage.fixedSql.split("\n").map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {line ? <HighlightedLine text={line} language="sql" /> : " "}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One check: how it stands, how it got there, and what it found last. */
export function CheckDetailView({ scriptId }: { scriptId: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const zh = language === "zh";
  const me = useMe();
  const { data, error, loading, reload } = useApi<{ check: CheckDetail }>(`/api/checks/${encodeURIComponent(scriptId)}`);
  const [tab, setTab] = useState<Tab>("result");
  const [running, setRunning] = useState(false);
  const check = data?.check;

  const canRun = !!me && (me.permissions.includes("script:execute") || !!me.demo);
  const canEdit = !!me?.permissions.includes("script:update");

  const runNow = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error?.message ?? response.statusText);
      toast.success(t.ran, { description: body.findings });
      setTab("result");
      reload();
    } catch (cause) {
      toast.error(t.runFailed, { description: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setRunning(false);
    }
  };

  if (error) {
    return (
      <div className={`${APP_CONTAINER} py-16 text-center`}>
        <p className="text-[14px]">{error === "No check with this id" ? t.notFound : error}</p>
        <Link href="/checks" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
          {t.back}
        </Link>
      </div>
    );
  }

  if (loading && !check) {
    return (
      <div className={`${APP_CONTAINER} space-y-4 py-6`} aria-busy>
        <div className="skeleton-shimmer h-20 rounded-xl" />
        <div className="skeleton-shimmer h-28 rounded-xl" />
        <div className="skeleton-shimmer h-64 rounded-xl" />
      </div>
    );
  }
  if (!check) return null;

  const state = check.state;
  const name = zh ? check.cnName || check.name : check.name;
  const description = zh ? check.cnDescription || check.description : check.description;
  const history = check.history;
  const high = Math.max(0, ...history.map((p) => (p.outcome === "error" ? 0 : p.rowCount)));

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        {canRun && (
          <Button size="sm" onClick={runNow} disabled={running}>
            <Play />
            {running ? t.running : t.runNow}
          </Button>
        )}
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/manage-scripts?scriptId=${encodeURIComponent(check.scriptId)}`}>
              <Pencil />
              {t.edit}
            </Link>
          </Button>
        )}
      </WindowToolbar>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          {state ? (
            <>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium", OUTCOME_PILL[state.outcome])}>
                <span className={cn("status-dot", OUTCOME_DOT[state.outcome])} aria-hidden />
                {OUTCOME_LABEL[state.outcome][language]}
              </span>
              <span className="text-muted-foreground" title={formatDateTime(state.since, language)}>
                {t.since(formatRelative(state.since, language))}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{t.neverRan}</span>
          )}
        </div>
        <h1 className="text-[28px] leading-tight font-bold">{name}</h1>
        {description && <p className="max-w-[70ch] text-pretty text-[14px] text-muted-foreground">{description}</p>}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="font-mono">{check.scriptId}</span>
          <span>{scheduleLabel(check.schedule, language)}</span>
          {state && <span title={formatDateTime(state.lastRunAt, language)}>{formatRelative(state.lastRunAt, language)}</span>}
        </p>
      </header>

      {history.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-xl bg-card p-4 shadow-border">
            <div className="mb-2.5 flex justify-between text-[12px] text-muted-foreground">
              <span>{t.lastRuns(history.length)}</span>
              <span>{t.now}</span>
            </div>
            {/* Always 30 slots, newest on the right, so the strip reads the same for every check. */}
            <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
              {Array.from({ length: 30 - history.length }, (_, i) => (
                <span key={`empty-${i}`} className="h-7 rounded-[3px] bg-muted" />
              ))}
              {history.map((point, i) => (
                <span
                  key={i}
                  title={`${formatDateTime(point.at, language)} · ${point.outcome === "error" ? t.queryError : t.rows(point.rowCount)}`}
                  className={cn(
                    "h-7 rounded-[3px]",
                    point.outcome === "error" ? "bg-failure" : point.outcome === "issues" ? "bg-attention" : "bg-success",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-border">
            <p className="mb-2 text-[12px] text-muted-foreground">{t.rowsFlagged}</p>
            <div className="flex items-end justify-between gap-4">
              <dl className="flex gap-5">
                {[
                  [t.now, state?.outcome === "error" ? "—" : state?.rowCount ?? "—"],
                  [t.previous, state?.previousRowCount ?? "—"],
                  [t.high, high],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dd className="text-[20px] leading-tight font-semibold tabular-nums">{value}</dd>
                    <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
              <Sparkline points={history} outcome={state?.outcome ?? "clean"} width={120} height={36} />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        <div role="tablist" aria-label={name} className="flex gap-1 overflow-x-auto border-b px-2">
          {(Object.keys(t.tabs) as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-[color,border-color] duration-150",
                tab === key ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.tabs[key]}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {tab === "result" &&
            (check.latest ? (
              <LatestResult latest={check.latest} t={t} />
            ) : (
              <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t.notRun}</p>
            ))}
          {tab === "history" &&
            (check.runs.length ? (
              <RunHistory runs={check.runs} t={t} language={language} />
            ) : (
              <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{t.notRun}</p>
            ))}
          {tab === "definition" && <Definition check={check} t={t} language={language} />}
          {tab === "triage" && <TriagePanel check={check} t={t} language={language} />}
        </div>
      </div>
    </div>
  );
}
