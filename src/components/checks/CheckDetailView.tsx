"use client";

import Link from "next/link";
import { useState } from "react";
import { Maximize2, Pencil, Play, X } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { NotFoundState } from "@/components/common/NotFoundState";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { Button } from "@/components/ui/button";
import type { CheckDetail } from "@/contracts/checks";
import { formatDateTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { AlertBadges, AlertMenu } from "./AlertControls";
import { CheckHeader } from "./detail/CheckHeader";
import { COPY, type Copy, type Tab } from "./detail/copy";
import { Definition } from "./detail/Definition";
import { LatestResult } from "./detail/LatestResult";
import { RecentRuns } from "./detail/RecentRuns";
import { RunHistory } from "./detail/RunHistory";
import { TriagePanel } from "./detail/TriagePanel";
import { useCheckDetail } from "./detail/useCheckDetail";
import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_PILL, scheduleLabel } from "./status";

/** The four tabs under a check, shared by its page and the side panel on the Checks page. */
function CheckTabs({ check, name, t, language, tab, setTab, flush }: { check: CheckDetail; name: string; t: Copy; language: "en" | "zh"; tab: Tab; setTab: (tab: Tab) => void; flush?: boolean }) {
  return (
    <div className={cn(!flush && "overflow-hidden rounded-xl bg-card shadow-border")}>
      <div role="tablist" aria-label={name} className={cn("flex gap-1 overflow-x-auto border-b [scrollbar-width:none]", flush ? "-mx-1" : "px-2")}>
        {(Object.keys(t.tabs) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-body-sm whitespace-nowrap transition-[color,border-color] duration-150",
              tab === key ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.tabs[key]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className={cn(flush && "-mx-6 [&_table]:min-w-0")}>
        {tab === "result" &&
          (check.latest ? <LatestResult latest={check.latest} t={t} /> : <p className="px-6 py-10 text-center text-body-sm text-muted-foreground">{t.notRun}</p>)}
        {tab === "history" &&
          (check.runs.length ? <RunHistory runs={check.runs} t={t} language={language} /> : <p className="px-6 py-10 text-center text-body-sm text-muted-foreground">{t.notRun}</p>)}
        {tab === "definition" && <Definition check={check} t={t} language={language} />}
        {tab === "triage" && <TriagePanel check={check} t={t} language={language} />}
      </div>
    </div>
  );
}

/** The last 30 runs as one strip, newest on the right, for the side panel. */
function RunStrip({ check, t, language }: { check: CheckDetail; t: Copy; language: "en" | "zh" }) {
  const history = check.history;
  return (
    <div>
      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
        {Array.from({ length: 30 - history.length }, (_, i) => (
          <span key={`empty-${i}`} className="h-6 rounded-[3px] bg-muted" />
        ))}
        {history.map((point, i) => (
          <span
            key={i}
            title={`${formatDateTime(point.at, language)} · ${point.outcome === "error" ? t.queryError : t.rows(point.rowCount)}`}
            className={cn("h-6 rounded-[3px]", point.outcome === "error" ? "bg-failure" : point.outcome === "issues" ? "bg-attention" : "bg-success")}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-caption text-muted-foreground">
        <span>{t.lastRuns(history.length)}</span>
        <span>{t.now}</span>
      </div>
    </div>
  );
}

/** One check in the Checks page's side panel: its standing, its actions and the same four tabs as its page. */
export function CheckPanel({ scriptId, onClose }: { scriptId: string; onClose: () => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const zh = language === "zh";
  const [tab, setTab] = useState<Tab>("result");
  const { check, error, loading, reload, running, runNow, canRun, canAlert } = useCheckDetail(scriptId, language, { onRan: () => setTab("result"), nameTab: false });

  if (error) return <p className="px-6 py-10 text-center text-body-sm text-muted-foreground">{error}</p>;
  if (loading && !check) {
    return (
      <div className="space-y-4 p-6" aria-busy>
        <div className="skeleton-shimmer h-16 rounded-lg" />
        <div className="skeleton-shimmer h-8 rounded-lg" />
        <div className="skeleton-shimmer h-48 rounded-lg" />
      </div>
    );
  }
  if (!check) return null;

  const name = zh ? check.cnName || check.name : check.name;
  const state = check.state;
  const href = `/checks/${encodeURIComponent(check.scriptId)}`;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-caption">
            {state ? (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium", OUTCOME_PILL[state.outcome])}>
                <span className={cn("status-dot", OUTCOME_DOT[state.outcome])} aria-hidden />
                {OUTCOME_LABEL[state.outcome][language]}
              </span>
            ) : (
              <span className="text-muted-foreground">{t.neverRan}</span>
            )}
            <AlertBadges alerting={check.alerting} />
          </div>
          <h2 className="mt-3 text-headline">{name}</h2>
          <p className="mt-1 text-caption text-muted-foreground">
            <span className="font-mono">{check.scriptId}</span> · {scheduleLabel(check.schedule, language)}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button asChild size="icon" variant="ghost" aria-label={t.openPage}>
            <Link href={href}>
              <Maximize2 />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" aria-label={t.close} onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      {(canRun || canAlert) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canRun && (
            <Button size="sm" onClick={runNow} disabled={running}>
              <Play />
              {running ? t.running : t.runNow}
            </Button>
          )}
          {canAlert && <AlertMenu scriptId={check.scriptId} alerting={check.alerting} state={check.state} onChanged={reload} />}
        </div>
      )}

      {check.history.length > 0 && (
        <div className="mt-5">
          <RunStrip check={check} t={t} language={language} />
        </div>
      )}

      <div className="mt-6">
        <CheckTabs check={check} name={name} t={t} language={language} tab={tab} setTab={setTab} flush />
      </div>
    </div>
  );
}

/** One check: how it stands, how it got there, and what it found last. */
export function CheckDetailView({ scriptId }: { scriptId: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const zh = language === "zh";
  const [tab, setTab] = useState<Tab>("result");
  const { check, error, loading, reload, running, runNow, canRun, canEdit, canAlert } = useCheckDetail(scriptId, language, {
    onRan: () => setTab("result"),
  });

  if (error) {
    return <NotFoundState title={error} backHref="/checks" backLabel={t.back} />;
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

  const name = zh ? check.cnName || check.name : check.name;
  const description = zh ? check.cnDescription || check.description : check.description;

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        {canRun && (
          <Button size="sm" onClick={runNow} disabled={running}>
            <Play />
            {running ? t.running : t.runNow}
          </Button>
        )}
        {canAlert && <AlertMenu scriptId={check.scriptId} alerting={check.alerting} state={check.state} onChanged={reload} />}
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/checks/manage?scriptId=${encodeURIComponent(check.scriptId)}`}>
              <Pencil />
              {t.edit}
            </Link>
          </Button>
        )}
      </WindowToolbar>

      <CheckHeader check={check} name={name} description={description} t={t} language={language} />

      {check.history.length > 0 && <RecentRuns history={check.history} state={check.state} t={t} language={language} />}

      <CheckTabs check={check} name={name} t={t} language={language} tab={tab} setTab={setTab} />
    </div>
  );
}
