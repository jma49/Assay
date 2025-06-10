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

// 前端使用的审批请求接口
export interface ApprovalRequestDto {
  id: string;
  scriptId: string;
  scriptName: string;
  scriptType: ScriptType;
  status: ApprovalStatus;
  requesterEmail: string;
  requesterId: string;
  createdAt: string;
  updatedAt: string;
  requiredApprovers: string[];
  currentApprovers: Array<{
    userId: string;
    email: string;
    role: string;
    decision: "approved" | "rejected";
    comment?: string;
    timestamp: string;
  }>;
  isComplete: boolean;
  comment?: string;
  reason?: string;
}

// 用户角色枚举
export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  DEVELOPER = "developer",
  VIEWER = "viewer",
}
