import { Collection } from "mongodb";
import { QueryResult } from "pg";
import mongoDbClient from "../../src/lib/mongodb"; // 调整路径
import { SqlCheckHistoryDocument } from "../types";

/**
 * 将 SQL 脚本执行结果保存到 MongoDB。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param status 执行状态 ('success' 或 'failure')。
 * @param message 执行的消息（成功信息或错误描述）。
 * @param findings 脚本执行结果的摘要（例如，"找到 5 条记录"）。
 * @param results 可选的原始查询结果数组。
 */
export async function saveResultToMongo(
  scriptId: string,
  status: "success" | "failure",
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
      status: status,
      message: message,
      findings: findings,
      raw_results: rawResults,
      github_run_id: process.env.GITHUB_RUN_ID, // 从环境变量获取 GitHub Run ID
    };

    await collection.insertOne(historyDoc);
    console.log(`结果 (${scriptId}) 已保存到 MongoDB`);
  } catch (error) {
    console.error(`将结果 (${scriptId}) 保存到 MongoDB 失败:`, error);
    // 注意：这里选择不抛出错误，以免保存失败导致整个脚本中断
  }
}
