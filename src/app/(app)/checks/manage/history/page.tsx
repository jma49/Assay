"use client";

import { APP_CONTAINER } from "@/components/layout/app-container";
import { useState } from "react";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Pagination } from "@/components/common/Pagination";
import { ITEMS_PER_PAGE } from "@/components/runs/types";
import { EditHistoryDetailDialog } from "@/components/edit-history/EditHistoryDetailDialog";
import { EditHistoryTable } from "@/components/edit-history/EditHistoryTable";
import { EditHistoryToolbar } from "@/components/edit-history/EditHistoryToolbar";
import { editHistoryCopy } from "@/components/edit-history/copy";
import { EMPTY_FILTERS, formatPageInfo, type HistoryFilters, type OperationFilter } from "@/components/edit-history/edit-history";
import { useEditHistory } from "@/components/edit-history/useEditHistory";
import type { EditHistoryRecord } from "@/contracts/edit-history";

export default function GlobalEditHistoryPage() {
  const { language } = useLanguage();
  const t = editHistoryCopy(language);

  const { histories, loading, error, currentPage, totalPages, totalRecords, totalCapped, fetchHistories, retry } = useEditHistory();
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [selectedHistory, setSelectedHistory] = useState<EditHistoryRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const updateFilters = (changes: Partial<HistoryFilters>) => setFilters((current) => ({ ...current, ...changes }));

  const changeOperation = (operation: OperationFilter) => {
    const next = { ...filters, operation };
    setFilters(next);
    void fetchHistories(next, 1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    void fetchHistories(EMPTY_FILTERS, 1);
  };

  const viewDetails = (history: EditHistoryRecord) => {
    setSelectedHistory(history);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <div className={`${APP_CONTAINER} py-6`}>
        <div className="space-y-6 animate-fadeIn">
          <PageHeader title={t.pageTitle} description={t.pageDescription} />
          <WindowStatusBar>
            {language === "zh" ? `共 ${totalRecords}${totalCapped ? "+" : ""} 次修改` : `${totalRecords}${totalCapped ? "+" : ""} changes`}
          </WindowStatusBar>

          <EditHistoryToolbar
            filters={filters}
            loading={loading}
            language={language}
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
                onRetry={retry}
                onViewDetails={viewDetails}
              />
            </CardContent>
            {totalPages > 1 && !loading && histories.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                pageInfo={formatPageInfo(language, { currentPage, totalPages, totalRecords, totalCapped, pageSize: ITEMS_PER_PAGE })}
                onPageChange={(page) => fetchHistories(filters, page)}
                disabled={loading}
              />
            )}
          </Card>
        </div>
      </div>

      <EditHistoryDetailDialog
        history={selectedHistory}
        open={isDetailDialogOpen}
        language={language}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}
