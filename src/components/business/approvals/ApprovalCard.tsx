"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalStatus } from "@/lib/types/approval";
import {
  SCRIPT_TYPE_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  statusTone,
  type ApprovalAction,
  type ApprovalRequest,
  type Translate,
} from "./approvals";

interface ApprovalCardProps {
  approval: ApprovalRequest;
  language: "en" | "zh";
  t: Translate;
  busy: boolean;
  onDecide: (approval: ApprovalRequest, action: ApprovalAction) => void;
}

export function ApprovalCard({ approval, language, t, busy, onDecide }: ApprovalCardProps) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const tone = statusTone(approval.status);

  return (
    <article className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{approval.scriptName}</h3>
            <Badge variant="secondary">{t(SCRIPT_TYPE_LABEL_KEYS[approval.scriptType])}</Badge>
            <span className={`inline-flex items-center gap-1.5 text-[13px] ${tone.text}`}>
              <span className={`status-dot ${tone.dot}`} aria-hidden />
              {t(STATUS_LABEL_KEYS[approval.status])}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {approval.requesterEmail} · {new Date(approval.createdAt).toLocaleString(locale)} ·{" "}
            <span className="font-mono">{approval.scriptId}</span>
          </p>
        </div>

        {approval.status === ApprovalStatus.PENDING && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => onDecide(approval, "reject")} disabled={busy}>
              {t("reject")}
            </Button>
            <Button size="sm" onClick={() => onDecide(approval, "approve")} disabled={busy}>
              {t("approve")}
            </Button>
          </div>
        )}
      </div>

      {approval.reason && (
        <blockquote className="mt-4 border-l-2 pl-3 text-sm text-muted-foreground">{approval.reason}</blockquote>
      )}

      {approval.currentApprovers.length > 0 && (
        <ul className="mt-4 space-y-1 border-t pt-3 text-[13px]">
          {approval.currentApprovers.map((approver, index) => (
            <li key={index} className="flex flex-wrap gap-x-2">
              <span className={approver.decision === "approved" ? "text-success" : "text-failure"}>
                {approver.decision === "approved" ? t("approved") : t("rejected")}
              </span>
              <span>{approver.email}</span>
              <span className="text-muted-foreground">{new Date(approver.timestamp).toLocaleString(locale)}</span>
              {approver.comment && <span className="text-muted-foreground">· {approver.comment}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
