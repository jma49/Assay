import { pickEditable, readVersion } from "./check-fields";
import { getMongoDbClient } from "../database/mongodb";
import { Collection, Document, Db } from "mongodb";
import { UserRole, Permission, hasPermission } from "../auth/rbac";
import { createCheck, deleteCheck, updateCheck } from "@/server/services/check-writes";
import { COLLECTIONS } from "@/lib/database/collections";

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
  DRAFT = "draft", // a developer may still edit it
}

// How far a script reaches; every check is read-only today, the rest is kept for the classification.
export enum ScriptType {
  READ_ONLY = "read_only",
  DATA_MODIFICATION = "data_modification",
  STRUCTURE_CHANGE = "structure_change",
  SYSTEM_ADMIN = "system_admin",
}

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
  requiredApprovers: string[]; // roles or user ids that must approve
  currentApprovers: string[]; // user ids that have approved

  operationType: "create" | "update" | "delete";
  originalData?: Record<string, unknown>; // the change itself; only its editable fields are applied
  sqlContent?: string; // kept separately so reviewers can read it
}

/** The outcome of approving or rejecting; a refusal carries a stable code for the client. */
export type ReviewResult = { success: true; message: string } | { success: false; code: string; message: string };

let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (!cachedDb) {
    const mongoDbClient = getMongoDbClient();
    cachedDb = await mongoDbClient.getDb();
  }
  return cachedDb;
}

async function getApprovalRequestsCollection(): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection(COLLECTIONS.approvalRequests);
}

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `req_${timestamp}_${random}`;
}

/**
 * Classifies a script by its SQL. Only read-only checks are allowed today; the other classes are kept for the approval rules.
 */
export function analyzeScriptType(sqlContent: string): ScriptType {
  const upperSql = sqlContent.toUpperCase().trim();


  const systemAdminKeywords = [
    "GRANT",
    "REVOKE",
    "CREATE USER",
    "DROP USER",
    "ALTER USER",
    "BACKUP",
    "RESTORE",
    "SHUTDOWN",
    "KILL",
  ];
  if (systemAdminKeywords.some((keyword) => upperSql.includes(keyword))) {
    return ScriptType.SYSTEM_ADMIN;
  }

  const structureChangeKeywords = [
    "CREATE TABLE",
    "DROP TABLE",
    "ALTER TABLE",
    "CREATE INDEX",
    "DROP INDEX",
    "CREATE DATABASE",
    "DROP DATABASE",
  ];
  if (structureChangeKeywords.some((keyword) => upperSql.includes(keyword))) {
    return ScriptType.STRUCTURE_CHANGE;
  }

  const dataModificationKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "MERGE",
  ];
  if (dataModificationKeywords.some((keyword) => upperSql.includes(keyword))) {
    return ScriptType.DATA_MODIFICATION;
  }

  return ScriptType.READ_ONLY;
}

/**
 * Admins' changes apply at once; everyone else's wait for an admin.
 */
export function isAutoApprovalEligible(
  scriptType: ScriptType,
  requesterRole: UserRole,
  operationType: "create" | "update" | "delete" = "create"
): boolean {

  if (requesterRole === UserRole.ADMIN) {
    console.log(
      `[Approval] Admin change applies without review: ${operationType} - ${scriptType}`
    );
    return true;
  }

  console.log(
    `[Approval] Change needs review: ${operationType} - ${scriptType}`
  );
  return false;
}

export function getRequiredApprovers(
  scriptType: ScriptType,
  operationType: "create" | "update" | "delete" = "create"
): string[] {
  console.log(
    `[Approval] Required approvers: ${operationType} - ${scriptType} -> ${UserRole.ADMIN}`
  );
  return [UserRole.ADMIN];
}

export async function createApprovalRequest(
  scriptId: string,
  requesterId: string,
  requesterEmail: string,
  requesterRole: UserRole,
  sqlContent: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent" = "medium",
  operationType: "create" | "update" | "delete" = "create",
  originalData?: Record<string, unknown>
): Promise<string | null> {
  try {
    const collection = await getApprovalRequestsCollection();

    const scriptType = analyzeScriptType(sqlContent);
    const autoApprovalEligible = isAutoApprovalEligible(
      scriptType,
      requesterRole,
      operationType
    );
    const requiredApprovers = getRequiredApprovers(scriptType, operationType);

    const requestId = generateRequestId();
    const now = new Date();

    const approvalRequest: ApprovalRequest = {
      requestId,
      scriptId,
      requesterId,
      requesterEmail,
      scriptType,
      status: autoApprovalEligible
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.PENDING,
      priority,
      title,
      description,
      requestedAt: now,
      submittedAt: autoApprovalEligible ? now : undefined,
      reviewedAt: autoApprovalEligible ? now : undefined,
      reviewedBy: autoApprovalEligible ? "system" : undefined,
      reviewerEmail: autoApprovalEligible ? "system@auto-approval" : undefined,
      reviewComment: autoApprovalEligible ? "Approved automatically" : undefined,
      updatedAt: now,
      autoApprovalEligible,
      requiredApprovers,
      currentApprovers: autoApprovalEligible ? ["system"] : [],

      operationType,
      originalData,
      sqlContent,
    };

    const result = await collection.insertOne(approvalRequest);

    if (result.acknowledged) return requestId;

    return null;
  } catch (error) {
    console.error("[Approval] Creating an approval request failed:", error);
    return null;
  }
}

export async function approveScript(
  requestId: string,
  approverId: string,
  approverEmail: string,
  comment?: string
): Promise<ReviewResult> {
  try {
    const collection = await getApprovalRequestsCollection();

    const hasApprovalPermission = await hasPermission(
      approverId,
      Permission.SCRIPT_APPROVE
    );
    if (!hasApprovalPermission) {
      return { success: false, code: "forbidden", message: "You may not approve requests" };
    }

    const request = await collection.findOne({ requestId });
    if (!request) {
      return { success: false, code: "request_not_found", message: "No request with this id" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return {
        success: false,
        code: "already_decided",
        message: `The request is ${request.status}, not pending`,
      };
    }

    // Separation of duties: whoever asked for a change cannot approve it.
    if (request.requesterId === approverId) {
      return { success: false, code: "own_request", message: "You cannot approve your own request" };
    }

    // The status only moves from pending once: of two approvers, or an
    // approve racing a reject, exactly one wins and only it applies the change.
    const now = new Date();
    const updateResult = await collection.updateOne(
      { requestId, status: ApprovalStatus.PENDING },
      {
        $set: {
          status: ApprovalStatus.APPROVED,
          reviewedAt: now,
          reviewedBy: approverId,
          reviewerEmail: approverEmail,
          reviewComment: comment,
          updatedAt: now,
        },
        $addToSet: {
          currentApprovers: approverId,
        },
      }
    );

    if (updateResult.modifiedCount > 0) {

      try {
        await executeApprovedOperation(request as unknown as ApprovalRequest);
      } catch (error) {
        // The request stays approved; the failure is recorded on it instead of only in a log.
        console.error(`[Approval] Applying ${requestId} failed:`, error);
        await collection.updateOne(
          { requestId },
          { $set: { applyError: error instanceof Error ? error.message : String(error), updatedAt: new Date() } },
        );
        return { success: false, code: "apply_failed", message: "Approved, but applying the change failed; see the request" };
      }

      return { success: true, message: "Approved" };
    }

    return { success: false, code: "already_decided", message: "Someone else already decided this request" };
  } catch (error) {
    console.error("[Approval] Approving failed:", error);
    return { success: false, code: "internal", message: "Approving failed" };
  }
}

export async function rejectScript(
  requestId: string,
  reviewerId: string,
  reviewerEmail: string,
  comment: string
): Promise<ReviewResult> {
  try {
    const collection = await getApprovalRequestsCollection();

    const hasRejectPermission = await hasPermission(
      reviewerId,
      Permission.SCRIPT_REJECT
    );
    if (!hasRejectPermission) {
      return { success: false, code: "forbidden", message: "You may not reject requests" };
    }

    const request = await collection.findOne({ requestId });
    if (!request) {
      return { success: false, code: "request_not_found", message: "No request with this id" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return {
        success: false,
        code: "already_decided",
        message: `The request is ${request.status}, not pending`,
      };
    }

    const now = new Date();
    const updateResult = await collection.updateOne(
      { requestId, status: ApprovalStatus.PENDING },
      {
        $set: {
          status: ApprovalStatus.REJECTED,
          reviewedAt: now,
          reviewedBy: reviewerId,
          reviewerEmail: reviewerEmail,
          reviewComment: comment,
          updatedAt: now,
        },
      }
    );

    if (updateResult.modifiedCount > 0) {

      console.log(`[Approval] Rejected ${requestId} by ${reviewerEmail}`);
      return { success: true, message: "Rejected" };
    }

    return { success: false, code: "already_decided", message: "Someone else already decided this request" };
  } catch (error) {
    console.error("[Approval] Rejecting failed:", error);
    return { success: false, code: "internal", message: "Rejecting failed" };
  }
}

/** The live SQL of the given checks, by scriptId; checks that no longer exist are left out. */
export async function getCurrentSql(scriptIds: string[]): Promise<Map<string, string>> {
  if (scriptIds.length === 0) return new Map();
  const db = await getDb();
  const checks = await db
    .collection(COLLECTIONS.checks)
    .find({ scriptId: { $in: scriptIds } }, { projection: { scriptId: 1, sqlContent: 1 } })
    .toArray();
  return new Map(checks.map((check) => [String(check.scriptId), String(check.sqlContent ?? "")]));
}

export async function getPendingApprovals(
  approverId?: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  data: ApprovalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  try {
    const collection = await getApprovalRequestsCollection();

    const query: Record<string, unknown> = {
      status: ApprovalStatus.PENDING,
    };

    // Every pending request for now; filtering by the approver's scope can come later.

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      collection
        .find(query)
        .sort({ priority: -1, requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const data = requests.map((doc) => ({
      requestId: doc.requestId,
      scriptId: doc.scriptId,
      requesterId: doc.requesterId,
      requesterEmail: doc.requesterEmail,
      scriptType: doc.scriptType,
      status: doc.status,
      priority: doc.priority,
      title: doc.title,
      description: doc.description,
      changesSummary: doc.changesSummary,
      requestedAt: doc.requestedAt,
      submittedAt: doc.submittedAt,
      reviewedAt: doc.reviewedAt,
      reviewedBy: doc.reviewedBy,
      reviewerEmail: doc.reviewerEmail,
      reviewComment: doc.reviewComment,
      updatedAt: doc.updatedAt,
      autoApprovalEligible: doc.autoApprovalEligible,
      requiredApprovers: doc.requiredApprovers,
      currentApprovers: doc.currentApprovers,
      operationType: doc.operationType,
      originalData: doc.originalData,
      sqlContent: doc.sqlContent,
    })) as ApprovalRequest[];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("[Approval] Listing pending requests failed:", error);
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}

export async function getCompletedApprovals(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: ApprovalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  try {
    const collection = await getApprovalRequestsCollection();

    const query: Record<string, unknown> = {
      status: {
        $in: [
          ApprovalStatus.APPROVED,
          ApprovalStatus.REJECTED,
          ApprovalStatus.WITHDRAWN,
        ],
      },
    };

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const data = requests.map((doc) => ({
      requestId: doc.requestId,
      scriptId: doc.scriptId,
      requesterId: doc.requesterId,
      requesterEmail: doc.requesterEmail,
      scriptType: doc.scriptType,
      status: doc.status,
      priority: doc.priority,
      title: doc.title,
      description: doc.description,
      changesSummary: doc.changesSummary,
      requestedAt: doc.requestedAt,
      submittedAt: doc.submittedAt,
      reviewedAt: doc.reviewedAt,
      reviewedBy: doc.reviewedBy,
      reviewerEmail: doc.reviewerEmail,
      reviewComment: doc.reviewComment,
      updatedAt: doc.updatedAt,
      autoApprovalEligible: doc.autoApprovalEligible,
      requiredApprovers: doc.requiredApprovers,
      currentApprovers: doc.currentApprovers,
      operationType: doc.operationType,
      originalData: doc.originalData,
      sqlContent: doc.sqlContent,
    })) as ApprovalRequest[];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("[Approval] Listing decided requests failed:", error);
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Applies an approved change to the check it is about, through the same
 * writes a direct edit uses. An update only lands on the version the request
 * was made against.
 */
async function executeApprovedOperation(request: ApprovalRequest): Promise<void> {
  const db = await getDb();
  const actor = { id: request.requesterId, email: request.requesterEmail };
  const data = (request.originalData ?? {}) as Record<string, unknown>;

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
      throw new Error(`Unsupported operation: ${request.operationType}`);
  }
}
