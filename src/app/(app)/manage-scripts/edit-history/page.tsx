"use client";

import { useCallback, useState } from "react";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations } from "@/components/business/dashboard/types";
import { EditHistoryDetailDialog } from "@/components/business/edit-history/EditHistoryDetailDialog";
import { EditHistoryPagination } from "@/components/business/edit-history/EditHistoryPagination";
import { EditHistoryTable } from "@/components/business/edit-history/EditHistoryTable";
import { EditHistoryToolbar } from "@/components/business/edit-history/EditHistoryToolbar";
import { EMPTY_FILTERS, type HistoryFilters, type OperationFilter } from "@/components/business/edit-history/edit-history";
import { useEditHistory } from "@/components/business/edit-history/useEditHistory";
import type { EditHistoryRecord } from "@/lib/workflows/edit-history-schema";

export default function GlobalEditHistoryPage() {
  const { language } = useLanguage();
  const t = useCallback(
    (key: string): string => ((dashboardTranslations[language] || dashboardTranslations.en) as Record<string, string>)[key] || key,
    [language],
  );

  const { histories, loading, error, currentPage, totalPages, totalRecords, fetchHistories } = useEditHistory();
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [selectedHistory, setSelectedHistory] = useState<EditHistoryRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const updateFilters = (changes: Partial<HistoryFilters>) => setFilters((current) => ({ ...current, ...changes }));

  const changeOperation = (operation: OperationFilter) => {
    const next = { ...filters, operation };
    setFilters(next);
    fetchHistories(next, 1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchHistories(EMPTY_FILTERS, 1);
  };

  const viewDetails = (history: EditHistoryRecord) => {
    setSelectedHistory(history);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6 animate-fadeIn">
          <PageHeader title={t("allScriptsHistory")} description={t("editHistoryDescGlobal")} />
          <WindowStatusBar>
            {language === "zh" ? `共 ${totalRecords} 次修改` : `${totalRecords} changes`}
          </WindowStatusBar>

          <EditHistoryToolbar
            filters={filters}
            loading={loading}
            language={language}
            t={t}
            onFiltersChange={updateFilters}
            onOperationChange={changeOperation}
            onApply={() => fetchHistories(filters, 1)}
            onReset={resetFilters}
          />

          <Card className="relative overflow-hidden gap-0 py-0">
            <CardContent className="relative p-0">
              <EditHistoryTable
                histories={histories}
                loading={loading}
                error={error}
                language={language}
                t={t}
                onRetry={() => fetchHistories()}
                onViewDetails={viewDetails}
              />
            </CardContent>
            {totalPages > 1 && !loading && histories.length > 0 && (
              <EditHistoryPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                loading={loading}
                t={t}
                onPageChange={(page) => fetchHistories(filters, page)}
              />
            )}
          </Card>
        </div>
      </div>

      <EditHistoryDetailDialog
        history={selectedHistory}
        open={isDetailDialogOpen}
        language={language}
        t={t}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}
