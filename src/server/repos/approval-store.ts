import type { Db, Document } from "mongodb";
import { ApprovalStatus, type ScriptType } from "@/lib/types/approval";
import { COLLECTIONS } from "@/lib/database/collections";

export type ChangeKind = "create" | "update" | "delete";

/** A change to a check waiting for, or past, review (collection `approval_requests`). */
export interface ApprovalRequest {
  requestId: string;
  scriptId: string;
  requesterId: string;
  requesterEmail: string;
  scriptType: ScriptType;
  status: ApprovalStatus;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  description: string;
  changesSummary?: string;
  requestedAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerEmail?: string;
  reviewComment?: string;
  updatedAt: Date;
  autoApprovalEligible: boolean;
  /** Roles or user ids that must approve. */
  requiredApprovers: string[];
  /** User ids that have approved. */
  currentApprovers: string[];
  operationType: ChangeKind;
  /** The change itself; only its editable fields are ever applied. */
  originalData?: Record<string, unknown>;
  /** Kept separately so reviewers can read it. */
  sqlContent?: string;
}

export interface RequestPage {
  data: ApprovalRequest[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const requests = (db: Db) => db.collection<ApprovalRequest>(COLLECTIONS.approvalRequests);

export async function insertApprovalRequest(db: Db, request: ApprovalRequest): Promise<void> {
  await requests(db).insertOne(request);
}

export async function findApprovalRequest(db: Db, requestId: string): Promise<ApprovalRequest | null> {
  return requests(db).findOne({ requestId });
}

/**
 * Moves a pending request to `status`. The status only leaves pending once:
 * of two reviewers, or an approve racing a reject, exactly one gets true.
 */
export async function decideApprovalRequest(
  db: Db,
  requestId: string,
  status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED,
  reviewer: { id: string; email: string },
  comment: string | undefined,
): Promise<boolean> {
  const now = new Date();
  const update: Document = {
    $set: { status, reviewedAt: now, reviewedBy: reviewer.id, reviewerEmail: reviewer.email, reviewComment: comment, updatedAt: now },
  };
  if (status === ApprovalStatus.APPROVED) update.$addToSet = { currentApprovers: reviewer.id };
  const { modifiedCount } = await requests(db).updateOne({ requestId, status: ApprovalStatus.PENDING }, update);
  return modifiedCount > 0;
}

/** Records on the request why its approved change could not be applied, instead of only in a log. */
export async function recordApplyError(db: Db, requestId: string, message: string): Promise<void> {
  await requests(db).updateOne({ requestId }, { $set: { applyError: message, updatedAt: new Date() } });
}

async function pageOf(db: Db, filter: Document, sort: Record<string, 1 | -1>, page: number, limit: number): Promise<RequestPage> {
  const [data, total] = await Promise.all([
    requests(db)
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    requests(db).countDocuments(filter),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** Requests waiting for review, the most urgent and newest first. */
export function listPendingRequests(db: Db, page: number, limit: number): Promise<RequestPage> {
  return pageOf(db, { status: ApprovalStatus.PENDING }, { priority: -1, requestedAt: -1 }, page, limit);
}

/** Decided or withdrawn requests, the latest first. */
export function listDecidedRequests(db: Db, page: number, limit: number): Promise<RequestPage> {
  const decided = [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.WITHDRAWN];
  return pageOf(db, { status: { $in: decided } }, { updatedAt: -1 }, page, limit);
}

/** The live SQL of the given checks, by scriptId; checks that no longer exist are left out. */
export async function currentSqlOf(db: Db, scriptIds: string[]): Promise<Map<string, string>> {
  if (scriptIds.length === 0) return new Map();
  const checks = await db
    .collection(COLLECTIONS.checks)
    .find({ scriptId: { $in: scriptIds } }, { projection: { scriptId: 1, sqlContent: 1 } })
    .toArray();
  return new Map(checks.map((check) => [String(check.scriptId), String(check.sqlContent ?? "")]));
}
