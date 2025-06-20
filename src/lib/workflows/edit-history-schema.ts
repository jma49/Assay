// 编辑历史数据库模式定义
import { ObjectId } from "mongodb";

export interface ScriptSnapshot {
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  isScheduled?: boolean;
  cronSchedule?: string;
}

export interface EditHistoryRecord {
  _id?: ObjectId;
  // 操作信息
  operation: "create" | "update" | "delete";
  operationTime: Date;

  // 用户信息
  userId: string;
  userEmail?: string;
  userName?: string;

  // 脚本信息快照（保存当时的状态，即使脚本被删除也能查看）
  scriptSnapshot: ScriptSnapshot;

  // 变更详情
  changes?: {
    field: string;
    fieldDisplayName: string;
    fieldDisplayNameCn: string;
    oldValue: unknown;
    newValue: unknown;
  }[];

  // 操作描述
  description?: string;
  descriptionCn?: string;

  // 额外的元数据
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };

  // 索引字段（用于筛选和搜索）
  searchableAuthor: string; // 作者名称，用于搜索
  searchableScriptName: string; // 脚本名称，用于搜索
  searchableScriptNameCn: string; // 中文脚本名称，用于搜索
  operationType: string; // 操作类型，用于筛选
}

// 筛选器接口
export interface EditHistoryFilter {
  scriptName?: string; // 脚本名称筛选
  author?: string; // 作者筛选
  operation?: "create" | "update" | "delete" | "all"; // 操作类型筛选
  dateFrom?: Date; // 开始时间
  dateTo?: Date; // 结束时间
  page?: number; // 页码
  limit?: number; // 每页数量
  sortBy?: "operationTime" | "scriptName" | "author"; // 排序字段
  sortOrder?: "asc" | "desc"; // 排序顺序
}

// 用于创建索引的字段定义
export const EDIT_HISTORY_INDEXES = [
  { operationTime: -1 }, // 按时间倒序
  { searchableAuthor: 1 }, // 按作者搜索
  { searchableScriptName: 1 }, // 按脚本名搜索
  { searchableScriptNameCn: 1 }, // 按中文脚本名搜索
  { operationType: 1 }, // 按操作类型筛选
  { "scriptSnapshot.scriptId": 1 }, // 按脚本ID搜索
  { userId: 1 }, // 按用户ID搜索
  // 复合索引
  { operationTime: -1, operationType: 1 }, // 时间和操作类型
  { searchableAuthor: 1, operationTime: -1 }, // 作者和时间
] as const;
