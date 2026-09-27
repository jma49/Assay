"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalAction, ApprovalRequest, Language, Translate } from "./approvals";

interface ApprovalDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: ApprovalRequest | null;
  action: ApprovalAction;
  comment: string;
  onCommentChange: (comment: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  language: Language;
  t: Translate;
}

/** Confirms an approve or reject decision with an optional comment. */
export function ApprovalDecisionDialog({
  open,
  onOpenChange,
  approval,
  action,
  comment,
  onCommentChange,
  submitting,
  onSubmit,
  language,
  t,
}: ApprovalDecisionDialogProps) {
  const approving = action === "approve";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approving ? t("approveScript") : t("rejectScript")}</DialogTitle>
          <DialogDescription>
            {approval && `${language === "zh" ? "脚本" : "Script"}: ${approval.scriptName} (${approval.scriptId})`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {approving ? t("approvalReason") : t("rejectReasonPlaceholder")}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder={approving ? t("approvalReasonPlaceholder") : t("rejectReasonPlaceholder")}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className={approving ? "bg-success hover:bg-success" : "bg-failure hover:bg-failure"}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {approving ? t("approve") : t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
