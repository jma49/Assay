import { AlertCircle, Calendar, Eye, History, RotateCcw, User } from "lucide-react";
import { SkeletonTable } from "@/components/common/PageSkeletons";
import { formatDateTime } from "@/lib/utils/datetime";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EditHistoryRecord } from "@/contracts/edit-history";
import { cn } from "@/lib/utils/utils";
import { editHistoryCopy } from "./copy";
import { changesPreview, operationTimeIso } from "./edit-history";
import { OperationBadge, OperationIcon } from "./OperationBadge";

interface EditHistoryTableProps {
  histories: EditHistoryRecord[];
  loading: boolean;
  error: string | null;
  language: string;
  onRetry: () => void;
  onViewDetails: (history: EditHistoryRecord) => void;
}

const HEAD_CLASS = "h-11 px-4 text-body-sm font-normal text-muted-foreground";

/** The history list, or its loading, error or empty state. */
export function EditHistoryTable({ histories, loading, error, language, onRetry, onViewDetails }: EditHistoryTableProps) {
  const t = editHistoryCopy(language);
  if (loading) return <SkeletonTable rows={6} withTitle={false} className="rounded-none border-0" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="p-6 rounded-lg border border-failure/30 max-w-md mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-failure mx-auto mb-4" />
          <p className="text-title-sm font-medium text-failure mb-2">{t.errorTitle}</p>
          <p className="text-body-md text-failure mb-4">{error}</p>
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t.retry}
          </Button>
        </div>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="p-6 rounded-lg border border-dashed border-muted-foreground/20 max-w-md mx-auto text-center">
          <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-title-sm font-medium text-muted-foreground mb-2">{t.noHistory}</p>
          <p className="text-body-md text-muted-foreground/70">{t.noHistoryHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/20">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 px-6 text-body-sm font-normal text-muted-foreground">
                <div className="flex items-center gap-2">{t.operationType}</div>
              </TableHead>
              <TableHead className={HEAD_CLASS}>
                <div className="flex items-center gap-2">{t.scriptName}</div>
              </TableHead>
              <TableHead className={HEAD_CLASS}>
                <div className="flex items-center gap-2">{t.operationUser}</div>
              </TableHead>
              <TableHead className={HEAD_CLASS}>
                <div className="flex items-center gap-2">{t.operationTime}</div>
              </TableHead>
              <TableHead className={HEAD_CLASS}>
                <div className="flex items-center gap-2">{t.fieldChanges}</div>
              </TableHead>
              <TableHead className="h-11 px-6 text-right text-body-sm font-normal text-muted-foreground">
                <div className="flex items-center justify-end gap-2">{t.actions}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/20">
            {histories.map((history, index) => (
              <TableRow
                key={history._id?.toString() || index}
                className={cn(
                  "group/row transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200",
                  index % 2 === 0 ? "bg-card" : "bg-muted/5",
                )}
              >
                <TableCell className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <OperationIcon operation={history.operation} />
                    <OperationBadge operation={history.operation} className="font-medium px-2 py-1 text-caption" />
                  </div>
                </TableCell>
                <TableCell
                  className="px-4 py-3 font-medium max-w-56 leading-relaxed"
                  title={history.scriptSnapshot?.name || history.scriptSnapshot?.scriptId}
                >
                  <div className="space-y-1">
                    <div className="truncate font-semibold group-hover/row:text-primary transition-colors duration-200">
                      {history.scriptSnapshot?.name || history.scriptSnapshot?.scriptId || t.unknownScript}
                    </div>
                    {history.scriptSnapshot?.cnName && (
                      <div className="text-caption text-muted-foreground truncate">{history.scriptSnapshot.cnName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className="px-4 py-3 text-muted-foreground max-w-32 leading-relaxed"
                  title={history.userName || history.userEmail}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span className="truncate text-body-md">
                      {history.userName || history.userEmail || history.scriptSnapshot?.author || t.unknownUser}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-40 px-4 py-3 text-body-sm text-muted-foreground tabular-nums">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span className="truncate">{formatDateTime(operationTimeIso(history), language)}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground max-w-48 leading-relaxed">
                  <div className="truncate text-body-md">{changesPreview(history.changes, language)}</div>
                </TableCell>
                <TableCell className="px-6 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(history)}
                    className="-mr-2 size-8 p-0 text-muted-foreground hover:text-foreground"
                    title={t.viewDetails}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
