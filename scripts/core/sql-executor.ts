import fs from "fs";
import { QueryResult } from "pg";
import db from "../../src/lib/db"; // 调整路径
import { saveResultToMongo } from "../services/mongo-service";
import { sendSlackNotification } from "../services/slack-service";
import { ExecutionResult, ExecutionStatusType } from "../types";

/**
 * 格式化查询结果，生成简短的摘要信息。
 *
 * @param results 查询结果数组。
 * @returns 格式化后的摘要字符串。
 */
function formatQueryFindings(results: QueryResult[]): string {
  let totalRows = 0;
  results.forEach((result /*, index*/) => {
    // Commented out unused index
    // console.log(`Query #${index + 1} (command: ${result.command}) actual rowCount from DB: ${result.rowCount}`); // Debug log
    if (result.rows) {
      totalRows += result.rows.length;
    }
  });
  if (totalRows > 0) {
    return `Found ${totalRows} records`;
  } else {
    return "No matching records found";
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
  const executionTimestamp = Date.now();
  console.log(
    `[EXEC ${executionTimestamp}] Starting script execution: ${scriptId} (File: ${filePath})`
  );

  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "Execution incomplete";
  let statusType: ExecutionStatusType = "failure"; // 默认失败

  // console.log(`[EXEC ${executionTimestamp}] Initializing script execution: ${scriptId} (File: ${filePath})`); // Redundant with the one above, remove or comment

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

    console.log(
      `[EXEC ${executionTimestamp}] Parsed ${queries.length} SQL queries (comments removed)`
    ); // Keep this general log

    if (queries.length === 0) {
      // 如果没有有效查询，视为成功但发出警告
      successMessage = "SQL file is empty or contains only comments.";
      findings = "No valid queries";
      statusType = "success"; // 空文件视为普通成功
      results = [];
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`
      );
      await saveResultToMongo(
        scriptId,
        statusType,
        successMessage,
        findings,
        results
      );
      // 即使没有查询，也发送通知，说明情况
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType
      );
      return { success: true, statusType, message: successMessage, findings };
    }

    // 执行查询
    results = [];
    // let queryIndex = 0; // queryIndex was only for debug logs, commented out
    for (const queryText of queries) {
      // queryIndex++; // Debug log related
      // console.log(`[EXEC ${executionTimestamp}] --------------------------------------------------`);
      // console.log(`[EXEC ${executionTimestamp}] SQL Executor: About to execute Query #${queryIndex} (from script: ${scriptId}):`);
      // console.log(queryText); // Debug log - full query text
      // console.log(`[EXEC ${executionTimestamp}] --------------------------------------------------`);
      const result = await db.query(queryText);
      results.push(result);
    }

    findings = formatQueryFindings(results); // No longer passing executionTimestamp
    successMessage = `Script ${scriptId} executed successfully. ${findings}.`;
    console.log(`[EXEC ${executionTimestamp}] ${successMessage}`);

    // 根据脚本ID和findings判断statusType
    if (
      scriptId === "check-order-duplicates" &&
      findings !== "No matching records found" &&
      findings !== "No valid queries"
    ) {
      statusType = "attention_needed";
    } else {
      statusType = "success";
    }

    // 保存成功结果并发送通知
    await saveResultToMongo(
      scriptId,
      statusType === "attention_needed" ? "success" : statusType,
      successMessage,
      findings,
      results
    );
    await sendSlackNotification(scriptId, successMessage, statusType);

    // // 调试点 2: (Commented out)
    // console.log(`[EXEC ${executionTimestamp}] Before returning from executeSqlFile - Query #1 rowCount: ${results?.[0]?.rowCount}, rows.length: ${results?.[0]?.rows?.length}`);
    // console.log(`[EXEC ${executionTimestamp}] Before returning from executeSqlFile - Query #2 rowCount: ${results?.[1]?.rowCount}, rows.length: ${results?.[1]?.rows?.length}`);

    return {
      success: true,
      statusType,
      message: successMessage,
      findings,
      data: results,
    };
  } catch (error: unknown) {
    // 统一处理执行过程中的错误
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EXEC ${executionTimestamp}] Script ${scriptId} execution failed: ${errorMessage}`, // Keep this error log
      error
    );
    findings = "Execution failed";
    statusType = "failure"; // 明确失败状态

    // 保存失败结果并发送错误通知
    // 注意：即使保存或通知失败，也不应影响主错误流程
    await saveResultToMongo(
      scriptId,
      statusType, // For failure, statusType is 'failure', which is fine
      errorMessage,
      findings,
      results
    );
    await sendSlackNotification(
      scriptId,
      `Execution failed: ${errorMessage}`,
      statusType // statusType is 'failure' here
    );

    return {
      success: false,
      statusType,
      message: errorMessage,
      findings,
      data: results,
    };
  }
}
