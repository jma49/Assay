import { Edit, FileText, History, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils/datetime";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EditHistoryRecord } from "@/contracts/edit-history";
import {
  fieldLabel,
  formatChangeValue,
  historyDescription,
  operationLabel,
  operationTimeIso,
  type FieldChange,
  type Translate,
} from "./edit-history";
import { OperationBadge, OperationIcon } from "./OperationBadge";

interface EditHistoryDetailDialogProps {
  history: EditHistoryRecord | null;
  open: boolean;
  language: string;
  t: Translate;
  onOpenChange: (open: boolean) => void;
}

/** Who changed which check when, and a before/after view of every changed field. */
export function EditHistoryDetailDialog({ history, open, language, t, onOpenChange }: EditHistoryDetailDialogProps) {
  const description = history ? historyDescription(history, language) : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t("editHistoryDetails")}
          </DialogTitle>
          <DialogDescription>
            {history && (
              <span>
                {operationLabel(history.operation, t)} •{" "}
                {history.scriptSnapshot?.name || history.scriptSnapshot?.scriptId} •{" "}
                {formatDateTime(operationTimeIso(history), language)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {history && (
          <div className="space-y-6 py-4">
            <BasicInfo history={history} t={t} />
            <CheckListItem snapshot={history.scriptSnapshot} t={t} />
            {history.changes && history.changes.length > 0 && (
              <ChangeList changes={history.changes} language={language} t={t} />
            )}
            {description && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">{t("description")}</h4>
                <p className="text-body-md text-muted-foreground">{description}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BasicInfo({ history, t }: { history: EditHistoryRecord; t: Translate }) {
  const user = history.userName || history.userEmail || t("unknownUser");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
      <div>
        <label className="text-body-md font-medium text-muted-foreground">{t("operationType")}</label>
        <div className="flex items-center gap-2 mt-1">
          <OperationIcon operation={history.operation} />
          <OperationBadge operation={history.operation} t={t} />
        </div>
      </div>
      <div>
        <label className="text-body-md font-medium text-muted-foreground">{t("operationUser")}</label>
        <div className="flex items-center gap-2 mt-1">
          <User className="w-4 h-4" />
          <span className="text-body-md truncate" title={user}>
            {user}
          </span>
        </div>
      </div>
    </div>
  );
}

function CheckListItem({ snapshot, t }: { snapshot: EditHistoryRecord["scriptSnapshot"] | undefined; t: Translate }) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t("scriptDetails")}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-md">
        <div>
          <label className="text-muted-foreground">{t("scriptName")}</label>
          <p className="font-medium">{snapshot?.name || t("unknown")}</p>
        </div>
        <div>
          <label className="text-muted-foreground">{t("scriptNameCn")}</label>
          <p className="font-medium">{snapshot?.cnName || t("unknown")}</p>
        </div>
        <div>
          <label className="text-muted-foreground">{t("fieldScriptId")}</label>
          <p className="font-mono text-caption">{snapshot?.scriptId || t("unknown")}</p>
        </div>
        <div>
          <label className="text-muted-foreground">{t("author")}</label>
          <p className="font-medium">{snapshot?.author || t("unknown")}</p>
        </div>
      </div>
    </div>
  );
}

function ChangeList({ changes, language, t }: { changes: FieldChange[]; language: string; t: Translate }) {
  return (
    <div>
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Edit className="w-4 h-4" />
        {t("changesDetails")} ({changes.length})
      </h4>
      <div className="space-y-4">
        {changes.map((change, index) => (
          <div key={index} className="border border-border/30 rounded-lg p-4 bg-background/50">
            <div className="font-medium mb-3 text-body-md">{fieldLabel(change, language)}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-caption text-muted-foreground font-medium">{t("originalValue")}</label>
                <div className="mt-1 p-3 bg-failure/10 border border-failure/30 rounded text-failure font-mono text-caption break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {formatChangeValue(change.oldValue, t)}
                </div>
              </div>
              <div>
                <label className="text-caption text-muted-foreground font-medium">{t("newValue")}</label>
                <div className="mt-1 p-3 bg-success/10 border border-success/30 rounded text-success font-mono text-caption break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {formatChangeValue(change.newValue, t)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
