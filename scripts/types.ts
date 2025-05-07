import { ObjectId } from "mongodb";
import { QueryResult } from "pg";

// 定义 SQL 检查历史记录的文档结构（用于 MongoDB）
export interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string; // 脚本 ID 或名称
  execution_time: Date; // 执行时间
  status: "success" | "failure"; // 主要的成功/失败状态
  statusType?: ExecutionStatusType; // 新增：更具体的执行状态，可选
  message: string; // 执行消息（成功或错误）
  findings: string; // 检查结果概述（例如，"发现 5 条记录" 或 "未发现匹配记录"）
  raw_results: Record<string, unknown>[]; // 查询返回的原始数据行
  github_run_id?: string | number; // 关联的 GitHub Actions 运行 ID（如果适用）
}

// 新增：定义执行状态的类型
export type ExecutionStatusType = "success" | "failure" | "attention_needed";

// 定义脚本执行结果的结构
export interface ExecutionResult {
  success: boolean; // true 代表执行过程本身没有抛出未捕获错误 (涵盖 'success' 和 'attention_needed')
  statusType: ExecutionStatusType; // 新增字段，更具体的执行状态
  message: string;
  findings: string;
  data?: QueryResult[];
}
