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
      `[Approval] 管理员操作自动通过: ${operationType} - ${scriptType}`
    );
    return true;
  }

  console.log(
    `[Approval] 普通用户操作需要审批: ${operationType} - ${scriptType}`
  );
  return false;
}

export function getRequiredApprovers(
  scriptType: ScriptType,
  operationType: "create" | "update" | "delete" = "create"
): string[] {
  console.log(
    `[Approval] 操作需要审批人: ${operationType} - ${scriptType} -> ${UserRole.ADMIN}`
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
      reviewComment: autoApprovalEligible ? "自动审批通过" : undefined,
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
    console.error("[Approval] 创建审批请求失败:", error);
    return null;
  }
}

export async function approveScript(
  requestId: string,
  approverId: string,
  approverEmail: string,
  comment?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const collection = await getApprovalRequestsCollection();

    const hasApprovalPermission = await hasPermission(
      approverId,
      Permission.SCRIPT_APPROVE
    );
    if (!hasApprovalPermission) {
      return { success: false, message: "权限不足：无审批权限" };
    }

    const request = await collection.findOne({ requestId });
    if (!request) {
      return { success: false, message: "审批请求不存在" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return {
        success: false,
        message: `审批请求当前状态为 ${request.status}，无法审批`,
      };
    }

    // Separation of duties: whoever asked for a change cannot approve it.
    if (request.requesterId === approverId) {
      return { success: false, message: "不能审批自己提交的申请" };
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
        return { success: false, message: "审批已通过，但应用变更失败，请查看审批记录" };
      }

      return { success: true, message: "脚本审批通过" };
    }

    return { success: false, message: "这条申请已被其他人处理" };
  } catch (error) {
    console.error("[Approval] 审批脚本失败:", error);
    return { success: false, message: "审批处理时发生错误" };
  }
}

export async function rejectScript(
  requestId: string,
  reviewerId: string,
  reviewerEmail: string,
  comment: string
): Promise<{ success: boolean; message: string }> {
  try {
    const collection = await getApprovalRequestsCollection();

    const hasRejectPermission = await hasPermission(
      reviewerId,
      Permission.SCRIPT_REJECT
    );
    if (!hasRejectPermission) {
      return { success: false, message: "权限不足：无拒绝权限" };
    }

    const request = await collection.findOne({ requestId });
    if (!request) {
      return { success: false, message: "审批请求不存在" };
    }

    if (request.status !== ApprovalStatus.PENDING) {
      return {
        success: false,
        message: `审批请求当前状态为 ${request.status}，无法拒绝`,
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

      console.log(`[Approval] 脚本已被拒绝: ${requestId} by ${reviewerEmail}`);
      return { success: true, message: "脚本已被拒绝" };
    }

    return { success: false, message: "这条申请已被其他人处理" };
  } catch (error) {
    console.error("[Approval] 拒绝脚本失败:", error);
    return { success: false, message: "拒绝处理时发生错误" };
  }
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
    console.error("[Approval] 获取待审批列表失败:", error);
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
    console.error("[Approval] 获取已完成审批列表失败:", error);
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
        "脚本创建（审批通过）",
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
        "脚本更新（审批通过）",
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
