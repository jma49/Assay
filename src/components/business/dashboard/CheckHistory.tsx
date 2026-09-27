import React, { useMemo } from "react";
import { Pagination } from "@/components/common/Pagination";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatPageInfo } from "@/lib/utils/pagination";
import { collectHashtags } from "./manual-trigger/script-search";
import { HistoryFilters } from "./runs/HistoryFilters";
import { HistoryTable } from "./runs/HistoryTable";
import { scriptDisplayNames, type SortConfig } from "./runs/runs";
import type { Check, DashboardTranslationKeys, ScriptInfo } from "./types";

/** The jump box only pays off once there are more pages than the shortcuts cover. */
const JUMP_BOX_MIN_PAGES = 6;

interface CheckHistoryProps {
  paginatedChecks: Check[];
  allChecksCount: number;
  totalUnfilteredCount: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  selectedHashtags?: string[];
  sortConfig: SortConfig;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setSearchTerm: (term: string) => void;
  setSelectedHashtags?: (hashtags: string[]) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: keyof Check) => void;
  startIndex: number;
  endIndex: number;
  availableScripts?: ScriptInfo[];
  isLoading?: boolean;
}

/** The run history card: filters, the table of runs and the pager. */
export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalUnfilteredCount,
  totalPages,
  currentPage,
  searchTerm,
  selectedHashtags = [],
  sortConfig,
  language,
  t,
  setSearchTerm,
  setSelectedHashtags,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex,
  availableScripts = [],
  isLoading = false,
}) => {
  const displayNames = useMemo(() => scriptDisplayNames(availableScripts, language), [availableScripts, language]);
  const availableHashtags = useMemo(() => collectHashtags(availableScripts), [availableScripts]);

  return (
    <Card className="relative gap-0 overflow-hidden py-0">
      <CardHeader className="relative border-b px-6 py-4">
        <CardDescription className="text-[13px]">
          {t("historyDesc").replace("%s", String(totalUnfilteredCount))} · {t("viewAndManageAllRecords")}
        </CardDescription>
        <HistoryFilters
          t={t}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          availableHashtags={availableHashtags}
          selectedHashtags={selectedHashtags}
          onHashtagsChange={setSelectedHashtags}
        />
      </CardHeader>

      <CardContent className="relative p-0">
        <HistoryTable
          checks={paginatedChecks}
          displayNames={displayNames}
          sortConfig={sortConfig}
          requestSort={requestSort}
          isLoading={isLoading}
          language={language}
          t={t}
        />
      </CardContent>
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageInfo={formatPageInfo(t("pageInfo"), {
            start: startIndex + 1,
            end: Math.min(endIndex, allChecksCount),
            totalItems: allChecksCount,
            page: currentPage,
            totalPages,
          })}
          t={t}
          onPageChange={setCurrentPage}
          jumpMinPages={JUMP_BOX_MIN_PAGES}
        />
      )}
    </Card>
  );
};
