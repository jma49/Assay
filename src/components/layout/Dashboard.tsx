"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DashboardSkeleton } from "@/components/common/PageSkeletons";
import { CheckHistory } from "@/components/business/dashboard/CheckHistory";
import { LoadingError } from "@/components/business/dashboard/LoadingError";
import { StatusTiles } from "@/components/business/dashboard/StatusTiles";
import { CHECK_HISTORY_ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import { runsCopy } from "@/components/business/dashboard/runs/copy";
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
const Dashboard = ({ initialSearch = "" }: { initialSearch?: string }) => {
  const { language } = useLanguage();
  const copy = runsCopy(language);

  // Offer only what this user may do; the run API enforces it regardless.
  const me = useMe();
  const canExecute = me?.permissions.includes("check:execute") ?? false;
  const demoRuns = !canExecute && me?.demo ? me.demo.runsPerHour : null;

  // The Run sheet, opened from the toolbar.
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [runSheetMode, setRunSheetMode] = useState<"single" | "bulk">("single");
  const openRunSheet = useCallback((mode: "single" | "bulk") => {
    setRunSheetMode(mode);
    setRunSheetOpen(true);
  }, []);

  const runs = useRunsPage(language, initialSearch);
  const { history, overallStats, availableChecks, loading, isFetchingScripts } = runs;
  const trigger = useTriggerCheck(availableChecks, runs.refresh, language === "zh" ? "zh" : "en");
  useFadeInStyle();

  const { startIndex, endIndex } = pageRange(history.currentPage, history.pagination.total, CHECK_HISTORY_ITEMS_PER_PAGE);

  if (loading && history.checks.length === 0 && isFetchingScripts) {
    return <DashboardSkeleton />;
  }

  if (runs.error) {
    return <LoadingError error={runs.error} />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="sr-only">{copy.pageTitle}</h1>

      <RunsHeader
        language={language}
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
        availableChecks={availableChecks}
        selectedScriptId={trigger.selectedScriptId}
        selectedCheck={trigger.selectedCheck}
        isTriggering={trigger.isTriggering}
        isFetchingScripts={isFetchingScripts}
        loading={loading && isFetchingScripts}
        triggerMessage={trigger.triggerMessage}
        triggerMessageType={trigger.triggerMessageType}
        language={language}
        setSelectedScriptId={trigger.setSelectedScriptId}
        handleTriggerCheck={trigger.handleTriggerCheck}
      />

      <section id="execution-history" className="scroll-mt-20" aria-label={copy.historyTitle}>
        <CheckHistory
          paginatedChecks={history.checks}
          allChecksCount={history.pagination.total}
          totalCapped={history.pagination.totalCapped}
          totalUnfilteredCount={overallStats.totalCount}
          totalPages={history.pagination.totalPages}
          currentPage={history.currentPage}
          searchTerm={history.searchTerm}
          selectedHashtags={history.selectedHashtags}
          sortConfig={history.sortConfig}
          language={language}
          setSearchTerm={history.changeSearch}
          setSelectedHashtags={history.changeHashtags}
          setCurrentPage={history.changePage}
          requestSort={history.requestSort}
          startIndex={startIndex}
          endIndex={endIndex}
          availableChecks={availableChecks}
          isLoading={history.isLoadingChecks || loading}
        />
      </section>
    </div>
  );
};

export default Dashboard;
