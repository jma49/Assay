"use client";

import { AlertCircle, Calendar, History, Loader2, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/components/common/LanguageProvider";
import { editHistoryCopy, type EditHistoryCopy } from "@/components/business/edit-history/copy";
import { EMPTY_FILTERS, fieldLabel, formatChangeValue, historyDescription } from "@/components/business/edit-history/edit-history";
import { OperationBadge, OperationIcon } from "@/components/business/edit-history/OperationBadge";
import { useEditHistory } from "@/components/business/edit-history/useEditHistory";
import type { EditHistoryRecord } from "@/contracts/edit-history";
import { formatDateTime } from "@/lib/utils/datetime";

interface EditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptId?: string;
}

const PAGE_SIZE = 20;
/** The dialog is wider than the history table, so it shows more of a changed value. */
const VALUE_LENGTH = 100;

/** One create, update or delete, with the fields it changed. */
function HistoryEntry({ history, t, language, last }: { history: EditHistoryRecord; t: EditHistoryCopy; language: string; last: boolean }) {
  const description = historyDescription(history, language);
  return (
    <Card className="relative mx-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OperationIcon operation={history.operation} />
            <div>
              <CardTitle className="text-body-md">
                <OperationBadge operation={history.operation} />
              </CardTitle>
              <div className="flex items-center gap-4 text-caption text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{history.userName || history.userEmail || history.userId}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDateTime(history.operationTime, language)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {history.changes && history.changes.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <h4 className="text-body-md font-medium text-foreground">{t.changesDetails}：</h4>
            {history.changes.map((change, index) => (
              <div key={index} className="bg-muted rounded-lg p-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-body-md font-medium text-foreground">{fieldLabel(change, language) || change.field}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-caption">
                  <div>
                    <span className="text-muted-foreground">{t.originalValue}：</span>
                    <div className="mt-1 p-2 bg-failure/10 border border-failure/30 rounded text-failure font-mono">
                      {formatChangeValue(change.oldValue, t, VALUE_LENGTH)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.newValue}：</span>
                    <div className="mt-1 p-2 bg-success/10 border border-success/30 rounded text-success font-mono">
                      {formatChangeValue(change.newValue, t, VALUE_LENGTH)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {description && (
        <CardContent className="pt-0">
          <div className="text-body-md text-muted-foreground">
            <span className="font-medium">{t.description}：</span>
            {description}
          </div>
        </CardContent>
      )}

      {!last && <Separator className="mt-2" />}
    </Card>
  );
}

/** One check's edit history, from the manage page. */
export function EditHistoryDialog({ open, onOpenChange, scriptId }: EditHistoryDialogProps) {
  const { language } = useLanguage();
  const t = editHistoryCopy(language);
  const { histories, loading, error, currentPage, totalPages, fetchHistories } = useEditHistory({
    scriptId,
    pageSize: PAGE_SIZE,
    enabled: open && Boolean(scriptId),
  });
  const goTo = (page: number) => fetchHistories(EMPTY_FILTERS, page);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader className="px-1">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t.dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {t.dialogDescription} {scriptId || ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-2">
          <div className="px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>{t.loading}</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-failure">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>{error}</span>
              </div>
            ) : histories.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <History className="w-6 h-6 mr-2" />
                <span>{t.noHistory}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((history, index) => (
                  <HistoryEntry
                    key={String(history._id ?? index)}
                    history={history}
                    t={t}
                    language={language}
                    last={index === histories.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <Button variant="outline" size="sm" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1 || loading}>
              {t.previous}
            </Button>
            <span className="text-body-md text-muted-foreground">
              {t.pageInfoShort} {currentPage}/{totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages || loading}>
              {t.next}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
