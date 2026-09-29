import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { UserRole } from "@/lib/auth/rbac";
import { ApprovalStatus, ScriptType } from "@/lib/types/approval";
import { pickEditable, readVersion } from "@/lib/workflows/check-fields";
import { ApiError } from "@/server/http/route";
import {
  currentSqlOf,
  decideApprovalRequest,
  findApprovalRequest,
  insertApprovalRequest,
  listDecidedRequests,
  listPendingRequests,
  recordApplyError,
  type ApprovalRequest,
  type ChangeKind,
} from "@/server/repos/approval-store";
import { toApprovalDto } from "./approval-dto";
import { createCheck, deleteCheck, updateCheck, type CheckActor } from "./check-writes";

/**
 * Review of check changes: who needs it, filing a request, and approving or
 * rejecting one. An approved change is applied through the same writes as a
 * direct edit (check-writes.ts).
 */

/**
 * Classifies a script by its SQL. Only read-only checks can be saved today
 * (the validator refuses the rest); the classes stay for the review record.
 */
function analyzeScriptType(sqlContent: string): ScriptType {
  const upperSql = sqlContent.toUpperCase().trim();
  const has = (keywords: string[]) => keywords.some((keyword) => upperSql.includes(keyword));
  if (has(["GRANT", "REVOKE", "CREATE USER", "DROP USER", "ALTER USER", "BACKUP", "RESTORE", "SHUTDOWN", "KILL"])) {
    return ScriptType.SYSTEM_ADMIN;
  }
  if (has(["CREATE TABLE", "DROP TABLE", "ALTER TABLE", "CREATE INDEX", "DROP INDEX", "CREATE DATABASE", "DROP DATABASE"])) {
    return ScriptType.STRUCTURE_CHANGE;
  }
  if (has(["INSERT", "UPDATE", "DELETE", "TRUNCATE", "MERGE"])) return ScriptType.DATA_MODIFICATION;
  return ScriptType.READ_ONLY;
}

/** Admins' changes apply at once; everyone else's wait for an admin. */
export function needsReview(role: UserRole): boolean {
  return role !== UserRole.ADMIN;
}

export interface ChangeRequest {
  scriptId: string;
  requester: CheckActor;
  role: UserRole;
  sqlContent: string;
  title: string;
  description: string;
  priority: ApprovalRequest["priority"];
  operationType: ChangeKind;
  originalData: Record<string, unknown>;
}

/** Files a change for review and returns its request id. An admin's is recorded as approved by the system. */
export async function fileChangeRequest(db: Db, change: ChangeRequest): Promise<string> {
  const requestId = `req_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
  const auto = !needsReview(change.role);
  const now = new Date();
  await insertApprovalRequest(db, {
    requestId,
    scriptId: change.scriptId,
    requesterId: change.requester.id,
    requesterEmail: change.requester.email,
    scriptType: analyzeScriptType(change.sqlContent),
    status: auto ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
    priority: change.priority,
    title: change.title,
    description: change.description,
    requestedAt: now,
    submittedAt: auto ? now : undefined,
    reviewedAt: auto ? now : undefined,
    reviewedBy: auto ? "system" : undefined,
    reviewerEmail: auto ? "system@auto-approval" : undefined,
    reviewComment: auto ? "Approved automatically" : undefined,
    updatedAt: now,
    autoApprovalEligible: auto,
    requiredApprovers: [UserRole.ADMIN],
    currentApprovers: auto ? ["system"] : [],
    operationType: change.operationType,
    originalData: change.originalData,
    sqlContent: change.sqlContent,
  });
  return requestId;
}

/** Pending requests as the Approvals page shows them; edits and deletes carry the check's live SQL to compare with. */
export async function pendingApprovals(db: Db, page: number, limit: number) {
  const { data, pagination } = await listPendingRequests(db, page, limit);
  const changesExisting = (request: ApprovalRequest) => request.operationType !== "create";
  const currentSql = await currentSqlOf(db, data.filter(changesExisting).map((request) => request.scriptId));
  return {
    data: data.map((request) => toApprovalDto(request, changesExisting(request) ? currentSql.get(request.scriptId) : undefined)),
    pagination,
  };
}

/** Decided and withdrawn requests, the latest first. */
export async function decidedApprovals(db: Db, page: number, limit: number) {
  const { data, pagination } = await listDecidedRequests(db, page, limit);
  return { data: data.map((request) => toApprovalDto(request)), pagination };
}

/** The pending request, or the refusal a reviewer gets for it. */
async function pendingRequest(db: Db, requestId: string): Promise<ApprovalRequest> {
  const request = await findApprovalRequest(db, requestId);
  if (!request) throw new ApiError(400, "request_not_found", "No request with this id");
  if (request.status !== ApprovalStatus.PENDING) {
    throw new ApiError(400, "already_decided", `The request is ${request.status}, not pending`);
  }
  return request;
}

const decidedElsewhere = () => new ApiError(400, "already_decided", "Someone else already decided this request");

/**
 * Approves a pending request and applies its change. Whoever asked for a
 * change cannot approve it. If applying fails, the request stays approved
 * and records why.
 */
export async function approveRequest(db: Db, requestId: string, reviewer: CheckActor, comment?: string): Promise<void> {
  const request = await pendingRequest(db, requestId);
  // Separation of duties.
  if (request.requesterId === reviewer.id) throw new ApiError(400, "own_request", "You cannot approve your own request");
  if (!(await decideApprovalRequest(db, requestId, ApprovalStatus.APPROVED, reviewer, comment))) throw decidedElsewhere();

  try {
    await applyChange(db, request);
  } catch (error) {
    console.error(`[Approval] Applying ${requestId} failed:`, error);
    await recordApplyError(db, requestId, error instanceof Error ? error.message : String(error));
    throw new ApiError(400, "apply_failed", "Approved, but applying the change failed; see the request");
  }
}

/** Rejects a pending request; the reason is kept on it. */
export async function rejectRequest(db: Db, requestId: string, reviewer: CheckActor, comment: string): Promise<void> {
  await pendingRequest(db, requestId);
  if (!(await decideApprovalRequest(db, requestId, ApprovalStatus.REJECTED, reviewer, comment))) throw decidedElsewhere();
}

/**
 * Applies an approved change to the check it is about, through the same
 * writes a direct edit uses. An update only lands on the version the request
 * was made against.
 */
async function applyChange(db: Db, request: ApprovalRequest): Promise<void> {
  const actor = { id: request.requesterId, email: request.requesterEmail };
  const data = request.originalData ?? {};

  switch (request.operationType) {
    case "create": {
      if (!request.originalData) throw new Error("A create request has no data");
      const now = new Date();
      // Only the fields people may set; the requester comes from the request, not the payload.
      await createCheck(
        db,
        {
          ...pickEditable(data),
          scriptId: request.scriptId,
          createdBy: actor,
          updatedBy: actor,
          version: 1,
          createdAt: now,
          updatedAt: now,
          approvalStatus: ApprovalStatus.APPROVED,
          approvalRequestId: request.requestId,
        },
        actor,
        "Created (approved)",
        "minor",
      );
      return;
    }
    case "update": {
      if (!request.originalData) throw new Error("An update request has no data");
      const result = await updateCheck(
        db,
        request.scriptId,
        { ...pickEditable(data), approvalStatus: ApprovalStatus.APPROVED, approvalRequestId: request.requestId },
        readVersion(data.baseVersion),
        actor,
        "Updated (approved)",
      );
      if (result.kind === "conflict") {
        throw new Error("The check changed after this request was made; submit the change again against the current version");
      }
      if (result.kind === "missing") throw new Error(`The check ${request.scriptId} no longer exists`);
      return;
    }
    case "delete":
      if (!(await deleteCheck(db, request.scriptId, actor))) throw new Error(`The check ${request.scriptId} no longer exists`);
      return;
    default:
      throw new Error(`Unsupported operation: ${String(request.operationType)}`);
  }
}
