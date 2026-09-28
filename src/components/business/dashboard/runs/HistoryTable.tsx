import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";
import type { DashboardTranslationKeys, HistoryRun } from "../types";
import { HistoryRow } from "./HistoryRow";
import type { SortConfig, SortKey } from "./runs";

type Translate = (key: DashboardTranslationKeys) => string;

const SORT_ICON_TRANSITION = "transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300";

function SortableHead({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "cursor-pointer hover:text-foreground transition-colors px-4 text-[13px] font-normal text-muted-foreground group/sort",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-3">
        {label}
        <div className="flex flex-col items-center">
          {sortConfig.key === sortKey && (
            <span className="text-primary">
              {sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          )}
          <ChevronUp className={cn("h-3 w-3 opacity-20 group-hover/sort:opacity-50", SORT_ICON_TRANSITION)} />
        </div>
      </div>
    </TableHead>
  );
}

function SkeletonRows() {
  return Array.from({ length: 3 }).map((_, index) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell className="px-4 py-4">
        <div className="flex justify-center">
          <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-4">
        <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
      </TableCell>
      <TableCell className="hidden lg:table-cell px-4 py-4">
        <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
      </TableCell>
      <TableCell className="hidden md:table-cell px-4 py-4">
        <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
      </TableCell>
      <TableCell className="text-center px-4 py-4">
        <div className="flex justify-center">
          <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
        </div>
      </TableCell>
    </TableRow>
  ));
}

function EmptyRow({ t }: { t: Translate }) {
  return (
    <TableRow>
      <TableCell colSpan={5} className="h-48 text-center  ">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="p-8 rounded-lg border border-dashed border-muted-foreground/30 ">
              <Database className="h-16 w-16 text-muted-foreground/60 mx-auto" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
          </div>
          <div className="space-y-3 text-center">
            <p className="text-xl font-semibold text-muted-foreground">{t("noDataFound")}</p>
            <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
              {t("noMatchingExecutionRecords")}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface HistoryTableProps {
  checks: HistoryRun[];
  displayNames: Map<string, string>;
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
  isLoading: boolean;
  language: string;
  t: Translate;
}

/** The runs on this page, sortable by check name and time. */
export function HistoryTable({ checks, displayNames, sortConfig, requestSort, isLoading, language, t }: HistoryTableProps) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 px-6 text-[13px] font-normal text-muted-foreground w-36">
                <div className="flex items-center gap-2">{t("tableStatus")}</div>
              </TableHead>
              <SortableHead
                label={t("tableScriptName")}
                sortKey="checkId"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="w-64"
              />
              <SortableHead
                label={t("tableExecutionTime")}
                sortKey="finishedAt"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="hidden lg:table-cell w-52"
              />
              <TableHead className="hidden md:table-cell px-4 text-[13px] font-normal text-muted-foreground">
                <div className="flex items-center gap-2">{t("tableFindings")}</div>
              </TableHead>
              <TableHead className="px-6 text-right text-[13px] font-normal text-muted-foreground w-44">
                <div className="flex items-center justify-end gap-2">{t("tableActions")}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : checks.length === 0 ? (
              <EmptyRow t={t} />
            ) : (
              checks.map((check) => (
                <HistoryRow
                  key={check._id}
                  check={check}
                  displayName={displayNames.get(check.checkId) ?? check.checkId}
                  language={language}
                  t={t}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
