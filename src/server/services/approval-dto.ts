import type { ApprovalRequestDto } from "@/lib/types/approval";
import type { ApprovalRequest } from "@/server/repos/approval-store";

/** The SQL a request carries: its own copy, or the one inside the change for older requests. */
function requestSql(request: Pick<ApprovalRequest, "sqlContent" | "originalData">): string | undefined {
  if (request.sqlContent) return request.sqlContent;
  const fromData = request.originalData?.sqlContent;
  return typeof fromData === "string" ? fromData : undefined;
}

/**
 * The name of the check a request changes, from the change itself. The
 * request's title is generated text ("Create check: …", "创建脚本: …" on
 * older ones), so it is only the fallback.
 */
function changedCheckName(request: Pick<ApprovalRequest, "originalData" | "title" | "scriptId">): string {
  const name = request.originalData?.name;
  return (typeof name === "string" && name) || request.title || request.scriptId;
}

/**
 * The approval request as the Approvals page receives it. `currentSql` is the
 * check's live SQL, passed for pending edits and deletes so the page can show
 * what changes.
 */
export function toApprovalDto(request: ApprovalRequest, currentSql?: string): ApprovalRequestDto {
  const decided = request.status === "approved" || request.status === "rejected";
  return {
    id: request.requestId,
    scriptId: request.scriptId,
    scriptName: changedCheckName(request),
    scriptType: request.scriptType,
    status: request.status,
    requesterEmail: request.requesterEmail,
    requesterId: request.requesterId,
    createdAt: request.requestedAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    requiredApprovers: request.requiredApprovers,
    currentApprovers:
      decided && request.reviewedBy
        ? [
            {
              userId: request.reviewedBy,
              email: request.reviewerEmail || "unknown",
              role: "reviewer",
              decision: request.status === "approved" ? "approved" : "rejected",
              comment: request.reviewComment,
              timestamp: (request.reviewedAt ?? request.updatedAt).toISOString(),
            },
          ]
        : [],
    isComplete: request.status !== "pending",
    comment: request.reviewComment,
    operationType: request.operationType,
    sqlContent: requestSql(request),
    ...(typeof request.originalData?.dataSourceId === "string" && { dataSourceId: request.originalData.dataSourceId }),
    ...(currentSql !== undefined && { currentSqlContent: currentSql }),
  };
}
