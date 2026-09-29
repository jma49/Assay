"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Play } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { NotFoundState } from "@/components/common/NotFoundState";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { AlertMenu } from "./AlertControls";
import { CheckHeader } from "./detail/CheckHeader";
import { COPY, type Tab } from "./detail/copy";
import { Definition } from "./detail/Definition";
import { LatestResult } from "./detail/LatestResult";
import { RecentRuns } from "./detail/RecentRuns";
import { RunHistory } from "./detail/RunHistory";
import { TriagePanel } from "./detail/TriagePanel";
import { useCheckDetail } from "./detail/useCheckDetail";

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
  const history = check.history;

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

      {history.length > 0 && <RecentRuns history={history} state={check.state} t={t} language={language} />}

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
