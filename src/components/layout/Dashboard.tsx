"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DashboardSkeleton } from "@/components/common/PageSkeletons";
import { CheckHistory } from "@/components/business/dashboard/CheckHistory";
import { LoadingError } from "@/components/business/dashboard/LoadingError";
import { StatusTiles } from "@/components/business/dashboard/StatusTiles";
import {
  CHECK_HISTORY_ITEMS_PER_PAGE,
  dashboardTranslations,
  type DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { RunSheet } from "@/components/business/dashboard/runs/RunSheet";
import { RunsHeader } from "@/components/business/dashboard/runs/RunsHeader";
import { pageRange, passRate } from "@/components/business/dashboard/runs/runs";
import { useRunsPage } from "@/components/business/dashboard/runs/useRunsPage";
import { useTriggerCheck } from "@/components/business/dashboard/runs/useTriggerCheck";
import { useMe } from "@/lib/auth/use-me";

/** Keeps the page's slower fade-in while it is mounted. */
function useFadeInStyle() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);
}

/** The Runs page: overall numbers, the run history and the Run sheet. */
const Dashboard = () => {
  const { language } = useLanguage();
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  // Offer only what this user may do; the run API enforces it regardless.
  const me = useMe();
  const canExecute = me?.permissions.includes("script:execute") ?? false;
  const demoRuns = !canExecute && me?.demo ? me.demo.runsPerHour : null;

  // The Run sheet, opened from the toolbar.
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [runSheetMode, setRunSheetMode] = useState<"single" | "bulk">("single");
  const openRunSheet = useCallback((mode: "single" | "bulk") => {
    setRunSheetMode(mode);
    setRunSheetOpen(true);
  }, []);

  const runs = useRunsPage(language);
  const { history, overallStats, availableScripts, loading, isFetchingScripts } = runs;
  const trigger = useTriggerCheck(availableScripts, runs.refresh);
  useFadeInStyle();

  const { startIndex, endIndex } = pageRange(history.currentPage, history.pagination.total, CHECK_HISTORY_ITEMS_PER_PAGE);

  if (loading && history.checks.length === 0 && isFetchingScripts) {
    return <DashboardSkeleton />;
  }

  if (runs.error) {
    return <LoadingError error={runs.error} t={t} />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="sr-only">{t("dashboardTitle")}</h1>

      <RunsHeader
        language={language}
        t={t}
        canExecute={canExecute}
        demoRuns={demoRuns}
        totalRuns={overallStats.totalCount}
        passRate={passRate(overallStats)}
        nextScheduled={runs.nextScheduled}
        onOpenRunSheet={openRunSheet}
      />

      {/* The numbers people come for, first; each tile filters the history. */}
      <StatusTiles
        total={overallStats.totalCount}
        success={overallStats.successCount}
        attention={overallStats.needsAttentionCount}
        failure={overallStats.failureCount}
        active={history.filterStatus}
        onSelect={history.changeStatus}
        language={language === "zh" ? "zh" : "en"}
      />

      <RunSheet
        open={runSheetOpen}
        onOpenChange={setRunSheetOpen}
        mode={runSheetMode}
        canExecute={canExecute}
        demoRuns={demoRuns}
        availableScripts={availableScripts}
        selectedScriptId={trigger.selectedScriptId}
        selectedScript={trigger.selectedScript}
        isTriggering={trigger.isTriggering}
        isFetchingScripts={isFetchingScripts}
        loading={loading && isFetchingScripts}
        triggerMessage={trigger.triggerMessage}
        triggerMessageType={trigger.triggerMessageType}
        language={language}
        t={t}
        setSelectedScriptId={trigger.setSelectedScriptId}
        handleTriggerCheck={trigger.handleTriggerCheck}
      />

      <section id="execution-history" className="scroll-mt-20" aria-label={t("checkHistoryTitle")}>
        <CheckHistory
          paginatedChecks={history.checks}
          allChecksCount={history.pagination.total}
          totalUnfilteredCount={overallStats.totalCount}
          totalPages={history.pagination.totalPages}
          currentPage={history.currentPage}
          searchTerm={history.searchTerm}
          selectedHashtags={history.selectedHashtags}
          sortConfig={history.sortConfig}
          language={language}
          t={t}
          setSearchTerm={history.changeSearch}
          setSelectedHashtags={history.changeHashtags}
          setCurrentPage={history.changePage}
          requestSort={history.requestSort}
          startIndex={startIndex}
          endIndex={endIndex}
          availableScripts={availableScripts}
          isLoading={history.isLoadingChecks || loading}
        />
      </section>
    </div>
  );
};

export default Dashboard;
