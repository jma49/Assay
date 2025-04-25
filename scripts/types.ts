import { ObjectId } from "mongodb";
import { QueryResult } from "pg";

// 定义 SQL 检查历史记录的文档结构（用于 MongoDB）
export interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string; // 脚本 ID 或名称
  execution_time: Date; // 执行时间
  status: "success" | "failure"; // 执行状态
  message: string; // 执行消息（成功或错误）
  findings: string; // 检查结果概述（例如，"发现 5 条记录" 或 "未发现匹配记录"）
  raw_results: Record<string, unknown>[]; // 查询返回的原始数据行
  github_run_id?: string | number; // 关联的 GitHub Actions 运行 ID（如果适用）
}

// 定义脚本执行结果的结构
export interface ExecutionResult {
  success: boolean; // 是否成功
  message: string; // 执行消息
  findings: string; // 检查结果概述
  data?: QueryResult[] | undefined; // 原始查询结果（可选）
}
