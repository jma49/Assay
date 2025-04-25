import fs from "fs";
import { QueryResult } from "pg";
import db from "../../src/lib/db"; // 调整路径
import { saveResultToMongo } from "../services/mongo-service";
import { sendSlackNotification } from "../services/slack-service";
import { ExecutionResult } from "../types";

/**
 * 格式化查询结果，生成简短的摘要信息。
 *
 * @param results 查询结果数组。
 * @returns 格式化后的摘要字符串。
 */
function formatQueryFindings(results: QueryResult[]): string {
  let totalRows = 0;
  results.forEach((result) => {
    if (result.rows) {
      totalRows += result.rows.length;
    }
  });
  if (totalRows > 0) {
    return `Found ${totalRows} records`; // 中文提示
  } else {
    return "No matching records found"; // 中文提示
  }
}

/**
 * 执行指定的 SQL 文件。
 * 该函数负责读取 SQL 文件，解析并执行其中的查询，
 * 然后调用服务保存结果到 MongoDB 并发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param filePath SQL 文件的完整路径。
 * @returns 返回一个包含执行结果的 Promise 对象。
 */
export async function executeSqlFile(
  scriptId: string,
  filePath: string
): Promise<ExecutionResult> {
  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "Execution incomplete"; // 默认提示

  console.log(`Starting script execution: ${scriptId} (File: ${filePath})`);

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }

    // 测试数据库连接
    const isConnected = await db.testConnection(); // db.ts 中已有中文日志
    if (!isConnected) {
      throw new Error("Database connection failed"); // testConnection 内部已有日志
    }

    const sqlContent = fs.readFileSync(filePath, "utf8");

    // --- SQL 解析逻辑 ---
    // 1. 移除块注释 /* ... */
    let processedContent = sqlContent.replace(/\/\*.*?\*\//gs, "");
    // 2. 移除行注释 -- ...
    processedContent = processedContent.replace(/--.*/g, "");
    // 3. 按分号分割语句，并清理空语句
    const queries = processedContent
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
    // --- SQL 解析逻辑结束 ---

    console.log(`Parsed ${queries.length} SQL queries (comments removed)`);

    if (queries.length === 0) {
      // 如果没有有效查询，视为成功但发出警告
      successMessage = "SQL file is empty or contains only comments.";
      findings = "No valid queries";
      results = [];
      console.warn(`${scriptId}: ${successMessage}`);
      await saveResultToMongo(
        scriptId,
        "success",
        successMessage,
        findings,
        results
      );
      // 即使没有查询，也发送通知，说明情况
      await sendSlackNotification(scriptId, `${successMessage} (${findings})`);
      return { success: true, message: successMessage, findings };
    }

    // 执行查询
    results = [];
    for (const queryText of queries) {
      console.log(`Executing query: ${queryText.substring(0, 100)}...`); // 日志中截断长查询
      // db.query 内部有错误处理和日志
      const result = await db.query(queryText);
      results.push(result);
    }

    // 查询成功完成
    findings = formatQueryFindings(results);
    successMessage = `Script ${scriptId} executed successfully. ${findings}.`;
    console.log(successMessage);

    // 保存成功结果并发送通知
    await saveResultToMongo(
      scriptId,
      "success",
      successMessage,
      findings,
      results
    );
    await sendSlackNotification(scriptId, successMessage);

    return { success: true, message: successMessage, findings, data: results };
  } catch (error: unknown) {
    // 统一处理执行过程中的错误
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `Script ${scriptId} execution failed: ${errorMessage}`,
      error
    );
    findings = "Execution failed";

    // 保存失败结果并发送错误通知
    // 注意：即使保存或通知失败，也不应影响主错误流程
    await saveResultToMongo(
      scriptId,
      "failure",
      errorMessage,
      findings,
      results // 可能部分执行有结果
    );
    await sendSlackNotification(
      scriptId,
      `Execution failed: ${errorMessage}`,
      true
    );

    return { success: false, message: errorMessage, findings, data: results };
  }
}
