"use client";

import { useId } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalSql } from "./ApprovalSql";
import { approvalCopy, type ApprovalAction, type ApprovalRequest, type Language } from "./approvals";

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
}

/**
 * Confirms an approve or reject decision with the SQL in view: an optional
 * comment to approve, a required reason to reject (the API refuses one without).
 */
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
}: ApprovalDecisionDialogProps) {
  const approving = action === "approve";
  const copy = approvalCopy(language);
  const commentId = useId();
  const missingReason = !approving && comment.trim() === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{approving ? copy.approveTitle : copy.rejectTitle}</DialogTitle>
          {approval && (
            <DialogDescription>
              {approval.scriptName} · <span className="font-mono">{approval.scriptId}</span>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          {approval && <ApprovalSql key={approval.id} approval={approval} copy={copy} defaultOpen />}
          <div className="space-y-1.5">
            <Label htmlFor={commentId}>{approving ? copy.commentLabel : copy.rejectLabel}</Label>
            <Textarea
              id={commentId}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder={approving ? copy.commentPlaceholder : copy.rejectPlaceholder}
              required={!approving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            variant={approving ? "default" : "destructive"}
            onClick={onSubmit}
            disabled={submitting || missingReason}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {approving ? copy.approve : copy.reject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
