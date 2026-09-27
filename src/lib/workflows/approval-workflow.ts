import { pickEditable, readVersion, versionFilter } from "./check-fields";
import { getMongoDbClient } from "../database/mongodb";
import { Collection, Document, Db } from "mongodb";
import { UserRole, Permission, hasPermission } from "../auth/rbac";
import { clearScriptsCache } from "../cache/cache-utils";
import { createScriptVersion } from "./version-control";
import { recordEditHistoryOnServer } from "./edit-history-store";

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

export interface ApprovalHistory {
  historyId: string;
  requestId: string;
  scriptId: string;
  action: "submit" | "approve" | "reject" | "withdraw" | "request_changes";
  actionBy: string;
  actionByEmail: string;
  actionAt: Date;
  previousStatus: ApprovalStatus;
  newStatus: ApprovalStatus;
  comment?: string;
  metadata?: Record<string, unknown>;
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
  return db.collection("approval_requests");
}

async function getApprovalHistoryCollection(): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection("approval_history");
}

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `req_${timestamp}_${random}`;
}

function generateHistoryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `hist_${timestamp}_${random}`;
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

    if (result.acknowledged) {
      await recordApprovalHistory(
        requestId,
        scriptId,
        autoApprovalEligible ? "approve" : "submit",
        autoApprovalEligible ? "system" : requesterId,
        autoApprovalEligible ? "system@auto-approval" : requesterEmail,
        ApprovalStatus.DRAFT,
        autoApprovalEligible ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        autoApprovalEligible ? "自动审批通过" : undefined
      );

      console.log(
        `[Approval] 审批请求已创建: ${requestId}, 状态: ${approvalRequest.status}, 操作类型: ${operationType}`
      );
      return requestId;
    }

    return null;
  } catch (error) {
    console.error("[Approval] 创建审批请求失败:", error);
    return null;
  }
}

async function recordApprovalHistory(
  requestId: string,
  scriptId: string,
  action: ApprovalHistory["action"],
  actionBy: string,
  actionByEmail: string,
  previousStatus: ApprovalStatus,
  newStatus: ApprovalStatus,
  comment?: string
): Promise<void> {
  try {
    const collection = await getApprovalHistoryCollection();

    const history: ApprovalHistory = {
      historyId: generateHistoryId(),
      requestId,
      scriptId,
      action,
      actionBy,
      actionByEmail,
      actionAt: new Date(),
      previousStatus,
      newStatus,
      comment,
    };

    await collection.insertOne(history);
  } catch (error) {
    console.error("[Approval] 记录审批历史失败:", error);
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
      await recordApprovalHistory(
        requestId,
        request.scriptId,
        "approve",
        approverId,
        approverEmail,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
        comment
      );

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
      await recordApprovalHistory(
        requestId,
        request.scriptId,
        "reject",
        reviewerId,
        reviewerEmail,
        ApprovalStatus.PENDING,
        ApprovalStatus.REJECTED,
        comment
      );

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

export async function getApprovalHistory(
  scriptId?: string,
  requestId?: string
): Promise<ApprovalHistory[]> {
  try {
    const collection = await getApprovalHistoryCollection();

    const query: Record<string, unknown> = {};
    if (scriptId) query.scriptId = scriptId;
    if (requestId) query.requestId = requestId;

    const history = await collection
      .find(query)
      .sort({ actionAt: -1 })
      .toArray();

    return history.map((doc) => ({
      historyId: doc.historyId,
      requestId: doc.requestId,
      scriptId: doc.scriptId,
      action: doc.action,
      actionBy: doc.actionBy,
      actionByEmail: doc.actionByEmail,
      actionAt: doc.actionAt,
      previousStatus: doc.previousStatus,
      newStatus: doc.newStatus,
      comment: doc.comment,
      metadata: doc.metadata,
    })) as ApprovalHistory[];
  } catch (error) {
    console.error("[Approval] 获取审批历史失败:", error);
    return [];
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
 * Applies an approved change to the check it is about.
 */
async function executeApprovedOperation(
  request: ApprovalRequest
): Promise<void> {
  try {
    console.log(
      `[Approval] 开始执行审批操作: ${request.operationType} for ${request.scriptId}`
    );

    const scriptsDb = await getDb();
    const collection = scriptsDb.collection("sql_scripts");

    switch (request.operationType) {
      case "create":
        if (!request.originalData) {
          throw new Error("创建操作缺少原始数据");
        }

        // Only the fields people may set; the requester is recorded from the request, not the payload.
        const createData = {
          ...pickEditable(request.originalData as Record<string, unknown>),
          scriptId: request.scriptId,
          createdBy: { id: request.requesterId, email: request.requesterEmail },
          updatedBy: { id: request.requesterId, email: request.requesterEmail },
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          approvalStatus: ApprovalStatus.APPROVED,
          approvalRequestId: request.requestId,
        };

        await collection.insertOne(createData);

        await createScriptVersion(
          request.scriptId,
          {
            name: (request.originalData as Record<string, unknown>)
              .name as string,
            cnName: (request.originalData as Record<string, unknown>).cnName as
              | string
              | undefined,
            description: (request.originalData as Record<string, unknown>)
              .description as string | undefined,
            cnDescription: (request.originalData as Record<string, unknown>)
              .cnDescription as string | undefined,
            scope: (request.originalData as Record<string, unknown>).scope as
              | string
              | undefined,
            cnScope: (request.originalData as Record<string, unknown>)
              .cnScope as string | undefined,
            author: (request.originalData as Record<string, unknown>)
              .author as string,
            hashtags: (request.originalData as Record<string, unknown>)
              .hashtags as string[] | undefined,
            sqlContent: (request.originalData as Record<string, unknown>)
              .sqlContent as string,
          },
          request.requesterId,
          request.requesterEmail,
          "create",
          "脚本创建（审批通过）",
          "minor"
        );

        await recordEditHistoryOnServer(
          {
            scriptId: request.scriptId,
            operation: "create",
            newData: request.originalData,
          },
          {
            id: request.requesterId,
            email: request.requesterEmail,
            name: request.requesterEmail.split("@")[0],
          }
        );

        console.log(`[Approval] 脚本创建完成: ${request.scriptId}`);
        break;

      case "update":
        if (!request.originalData) {
          throw new Error("更新操作缺少原始数据");
        }

        const existingScript = await collection.findOne({
          scriptId: request.scriptId,
        });

        const updateData = {
          ...pickEditable(request.originalData as Record<string, unknown>),
          updatedBy: { id: request.requesterId, email: request.requesterEmail },
          updatedAt: new Date(),
          approvalStatus: ApprovalStatus.APPROVED,
          approvalRequestId: request.requestId,
        };

        const baseVersion = readVersion((request.originalData as Record<string, unknown>).baseVersion);
        const updateResult = await collection.updateOne(
          { scriptId: request.scriptId, ...versionFilter(baseVersion) },
          { $set: updateData, $inc: { version: 1 } }
        );

        if (updateResult.matchedCount === 0) {
          const stillThere = await collection.countDocuments({ scriptId: request.scriptId }, { limit: 1 });
          throw new Error(
            stillThere
              ? "The check changed after this request was made; submit the change again against the current version"
              : `脚本不存在: ${request.scriptId}`,
          );
        }

        const updatedScript = await collection.findOne({
          scriptId: request.scriptId,
        });
        if (updatedScript) {
          await createScriptVersion(
            request.scriptId,
            {
              name: updatedScript.name as string,
              cnName: updatedScript.cnName as string | undefined,
              description: updatedScript.description as string | undefined,
              cnDescription: updatedScript.cnDescription as string | undefined,
              scope: updatedScript.scope as string | undefined,
              cnScope: updatedScript.cnScope as string | undefined,
              author: updatedScript.author as string,
              hashtags: updatedScript.hashtags as string[] | undefined,
              sqlContent: updatedScript.sqlContent as string,
            },
            request.requesterId,
            request.requesterEmail,
            "update",
            "脚本更新（审批通过）",
            "patch"
          );
        }

        await recordEditHistoryOnServer(
          {
            scriptId: request.scriptId,
            operation: "update",
            oldData: existingScript as unknown as Record<string, unknown>,
            newData: request.originalData,
          },
          {
            id: request.requesterId,
            email: request.requesterEmail,
            name: request.requesterEmail.split("@")[0],
          }
        );

        console.log(`[Approval] 脚本更新完成: ${request.scriptId}`);
        break;

      case "delete":
        const scriptToDelete = await collection.findOne({
          scriptId: request.scriptId,
        });
        if (!scriptToDelete) {
          throw new Error(`要删除的脚本不存在: ${request.scriptId}`);
        }

        const deleteResult = await collection.deleteOne({
          scriptId: request.scriptId,
        });

        if (deleteResult.deletedCount === 0) {
          throw new Error(`删除脚本失败: ${request.scriptId}`);
        }

        await recordEditHistoryOnServer(
          {
            scriptId: request.scriptId,
            operation: "delete",
            oldData: scriptToDelete as unknown as Record<string, unknown>,
          },
          {
            id: request.requesterId,
            email: request.requesterEmail,
            name: request.requesterEmail.split("@")[0],
          }
        );

        console.log(`[Approval] 脚本删除完成: ${request.scriptId}`);
        break;

      default:
        throw new Error(`不支持的操作类型: ${request.operationType}`);
    }

    await clearScriptsCache();

    console.log(
      `[Approval] 审批操作执行完成: ${request.operationType} for ${request.scriptId}`
    );
  } catch (error) {
    console.error(
      `[Approval] 执行审批操作失败: ${request.operationType} for ${request.scriptId}`,
      error
    );
    throw error;
  }
}
