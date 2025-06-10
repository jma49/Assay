import mongoDbClient from "./mongodb";
import { Collection, Document } from "mongodb";
import { UserRole, Permission, hasPermission } from "./rbac";

// 审批状态枚举
export enum ApprovalStatus {
  PENDING = "pending", // 待审批
  APPROVED = "approved", // 已批准
  REJECTED = "rejected", // 已拒绝
  WITHDRAWN = "withdrawn", // 已撤回
  DRAFT = "draft", // 草稿状态（开发者可继续编辑）
}

// 脚本类型枚举（用于确定审批级别）
export enum ScriptType {
  READ_ONLY = "read_only", // 只读查询脚本
  DATA_MODIFICATION = "data_modification", // 数据修改脚本
  STRUCTURE_CHANGE = "structure_change", // 结构变更脚本
  SYSTEM_ADMIN = "system_admin", // 系统管理脚本
}

// 审批请求接口
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
  requiredApprovers: string[]; // 必需的审批人角色或用户ID
  currentApprovers: string[]; // 已审批的用户ID
}

// 审批历史接口
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

// 获取审批请求集合
async function getApprovalRequestsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("approval_requests");
}

// 获取审批历史集合
async function getApprovalHistoryCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("approval_history");
}

/**
 * 生成唯一的请求ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `req_${timestamp}_${random}`;
}

/**
 * 生成唯一的历史记录ID
 */
function generateHistoryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `hist_${timestamp}_${random}`;
}

/**
 * 确定脚本类型（基于SQL内容分析）- 更严格的版本
 */
export function analyzeScriptType(sqlContent: string): ScriptType {
  const upperSql = sqlContent.toUpperCase().trim();

  // 在新的安全策略下，系统只允许查询操作
  // 但我们仍然保留分类逻辑以备将来使用

  // 系统管理类脚本关键词
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

  // 结构变更类脚本关键词
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

  // 数据修改类脚本关键词
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

  // 在严格安全策略下，所有脚本都应该是只读查询
  return ScriptType.READ_ONLY;
}

/**
 * 确定是否符合自动审批条件 - 简化的审批策略
 */
export function isAutoApprovalEligible(
  scriptType: ScriptType,
  requesterRole: UserRole,
  operationType: "create" | "update" | "delete" = "create"
): boolean {
  // 新的审批策略：
  // 1. 新建脚本 - 不需要审批（自动通过）
  // 2. 修改别人的脚本 - 需要管理员审批
  // 3. 删除任意脚本 - 需要管理员审批

  // 新建脚本总是自动通过
  if (operationType === "create") {
    return true;
  }

  // 删除和修改操作：只有管理员可以自动通过
  if (operationType === "delete" || operationType === "update") {
    return requesterRole === UserRole.ADMIN;
  }

  // 默认不自动通过
  return false;
}

/**
 * 获取所需的审批人角色 - 简化的审批策略
 */
export function getRequiredApprovers(
  scriptType: ScriptType,
  operationType: "create" | "update" | "delete" = "create"
): string[] {
  // 新建脚本不需要审批
  if (operationType === "create") {
    return [];
  }

  // 修改和删除操作都需要管理员审批
  if (operationType === "update" || operationType === "delete") {
    return [UserRole.ADMIN];
  }

  // 默认需要管理员审批
  return [UserRole.ADMIN];
}

/**
 * 创建审批请求
 */
export async function createApprovalRequest(
  scriptId: string,
  requesterId: string,
  requesterEmail: string,
  requesterRole: UserRole,
  sqlContent: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent" = "medium",
  operationType: "create" | "update" | "delete" = "create"
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
    };

    const result = await collection.insertOne(approvalRequest);

    if (result.acknowledged) {
      // 记录历史
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

/**
 * 记录审批历史
 */
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

/**
 * 审批脚本
 */
export async function approveScript(
  requestId: string,
  approverId: string,
  approverEmail: string,
  comment?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const collection = await getApprovalRequestsCollection();

    // 检查审批人权限
    const hasApprovalPermission = await hasPermission(
      approverId,
      Permission.SCRIPT_APPROVE
    );
    if (!hasApprovalPermission) {
      return { success: false, message: "权限不足：无审批权限" };
    }

    // 获取审批请求
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

    // 更新审批请求状态
    const now = new Date();
    const updateResult = await collection.updateOne(
      { requestId },
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
      // 记录历史
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

      console.log(
        `[Approval] 脚本已审批通过: ${requestId} by ${approverEmail}`
      );
      return { success: true, message: "脚本审批通过" };
    }

    return { success: false, message: "更新审批状态失败" };
  } catch (error) {
    console.error("[Approval] 审批脚本失败:", error);
    return { success: false, message: "审批处理时发生错误" };
  }
}

/**
 * 拒绝脚本
 */
export async function rejectScript(
  requestId: string,
  reviewerId: string,
  reviewerEmail: string,
  comment: string
): Promise<{ success: boolean; message: string }> {
  try {
    const collection = await getApprovalRequestsCollection();

    // 检查审批人权限
    const hasRejectPermission = await hasPermission(
      reviewerId,
      Permission.SCRIPT_REJECT
    );
    if (!hasRejectPermission) {
      return { success: false, message: "权限不足：无拒绝权限" };
    }

    // 获取审批请求
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

    // 更新审批请求状态
    const now = new Date();
    const updateResult = await collection.updateOne(
      { requestId },
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
      // 记录历史
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

    return { success: false, message: "更新审批状态失败" };
  } catch (error) {
    console.error("[Approval] 拒绝脚本失败:", error);
    return { success: false, message: "拒绝处理时发生错误" };
  }
}

/**
 * 获取待审批列表
 */
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

    // 如果指定了审批人，可以根据权限过滤
    // 这里暂时返回所有待审批的请求

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

/**
 * 获取审批历史
 */
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

/**
 * 获取已完成的审批请求列表
 */
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
