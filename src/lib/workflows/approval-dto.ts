import type { ApprovalRequestDto } from "@/lib/types/approval";
import type { ApprovalRequest } from "./approval-workflow";

/** The SQL a request carries: its own copy, or the one inside the change for older requests. */
export function requestSql(request: Pick<ApprovalRequest, "sqlContent" | "originalData">): string | undefined {
  if (request.sqlContent) return request.sqlContent;
  const fromData = request.originalData?.sqlContent;
  return typeof fromData === "string" ? fromData : undefined;
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
    scriptName: request.title || request.scriptId,
    scriptType: request.scriptType as string as ApprovalRequestDto["scriptType"],
    status: request.status as string as ApprovalRequestDto["status"],
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
    reason: request.description,
    operationType: request.operationType,
    sqlContent: requestSql(request),
    ...(currentSql !== undefined && { currentSqlContent: currentSql }),
  };
}
