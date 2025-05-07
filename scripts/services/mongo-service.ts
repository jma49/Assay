import { Collection } from "mongodb";
import { QueryResult } from "pg";
import mongoDbClient from "../../src/lib/mongodb"; // 调整路径
import { SqlCheckHistoryDocument, ExecutionStatusType } from "../types";

/**
 * 将 SQL 脚本执行结果保存到 MongoDB。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param status 执行状态 ('success' 或 'failure') - 这是用于 MongoDB 文档中基本 status 字段的值。
 * @param statusType 更具体的执行状态类型。
 * @param message 执行的消息（成功信息或错误描述）。
 * @param findings 脚本执行结果的摘要（例如，"找到 5 条记录"）。
 * @param results 可选的原始查询结果数组。
 */
export async function saveResultToMongo(
  scriptId: string,
  status: "success" | "failure", // 这个 status 仍然是基本的成功/失败
  statusType: ExecutionStatusType, // 新增参数
  message: string,
  findings: string,
  results?: QueryResult[]
): Promise<void> {
  try {
    const db = await mongoDbClient.getDb();
    const collection: Collection<SqlCheckHistoryDocument> =
      db.collection("result"); // 假设集合名称是 'result'

    const rawResults: Record<string, unknown>[] = results
      ? results.map((r) => r.rows || []).flat()
      : [];

    const historyDoc: SqlCheckHistoryDocument = {
      script_name: scriptId,
      execution_time: new Date(),
      status: status, // 使用传入的基本 status
      statusType: statusType, // 保存更具体的 statusType
      message: message,
      findings: findings,
      raw_results: rawResults,
      github_run_id: process.env.GITHUB_RUN_ID, // 从环境变量获取 GitHub Run ID
    };

    await collection.insertOne(historyDoc);
    console.log(
      `结果 (${scriptId}) 已保存到 MongoDB (status: ${status}, statusType: ${statusType})`
    );
  } catch (error) {
    console.error(`将结果 (${scriptId}) 保存到 MongoDB 失败:`, error);
    // 注意：这里选择不抛出错误，以免保存失败导致整个脚本中断
  }
}
