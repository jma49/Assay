import React, { useMemo } from "react";
import { Pagination } from "@/components/common/Pagination";
import { paginationCopy } from "@/components/common/pagination-copy";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatPageInfo } from "@/lib/utils/pagination";
import { collectHashtags } from "./manual-trigger/script-search";
import { runsCopy } from "./history/copy";
import { HistoryFilters } from "./history/HistoryFilters";
import { HistoryTable } from "./history/HistoryTable";
import { scriptDisplayNames, type SortConfig } from "./history/runs";
import type { HistoryRun, CheckListItem } from "./types";
import type { SortKey } from "./history/runs";

/** The jump box only pays off once there are more pages than the shortcuts cover. */
const JUMP_BOX_MIN_PAGES = 6;

interface CheckHistoryProps {
  paginatedChecks: HistoryRun[];
  allChecksCount: number;
  totalUnfilteredCount: number;
  totalPages: number;
  /** allChecksCount is the server's counting cap; more runs match. */
  totalCapped?: boolean;
  currentPage: number;
  searchTerm: string;
  selectedHashtags?: string[];
  sortConfig: SortConfig;
  language: string;
  setSearchTerm: (term: string) => void;
  setSelectedHashtags?: (hashtags: string[]) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: SortKey) => void;
  startIndex: number;
  endIndex: number;
  availableChecks?: CheckListItem[];
  isLoading?: boolean;
}

/** The run history card: filters, the table of runs and the pager. */
export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalUnfilteredCount,
  totalPages,
  totalCapped = false,
  currentPage,
  searchTerm,
  selectedHashtags = [],
  sortConfig,
  language,
  setSearchTerm,
  setSelectedHashtags,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex,
  availableChecks = [],
  isLoading = false,
}) => {
  const displayNames = useMemo(() => scriptDisplayNames(availableChecks, language), [availableChecks, language]);
  const availableHashtags = useMemo(() => collectHashtags(availableChecks), [availableChecks]);

  return (
    <Card className="relative gap-0 overflow-hidden py-0">
      <CardHeader className="relative border-b px-6 py-4">
        <CardDescription className="text-body-sm">
          {runsCopy(language).historyDesc(totalUnfilteredCount)}
        </CardDescription>
        <HistoryFilters
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
        />
      </CardContent>
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageInfo={formatPageInfo(paginationCopy(language).pageInfo, {
            start: startIndex + 1,
            end: Math.min(endIndex, allChecksCount),
            totalItems: allChecksCount,
            page: currentPage,
            totalPages,
            totalCapped,
          })}
          onPageChange={setCurrentPage}
          jumpMinPages={JUMP_BOX_MIN_PAGES}
        />
      )}
    </Card>
  );
};
