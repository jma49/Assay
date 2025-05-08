import fs from "fs";
import { QueryResult } from "pg";
import db from "../../src/lib/db"; // 调整路径
import { saveResultToMongo } from "../services/mongo-service";
import { sendSlackNotification } from "../services/slack-service";
import { ExecutionResult, ExecutionStatusType } from "../types";

/**
 * 确定脚本是否属于检查或验证类型
 * @param scriptId 脚本ID
 * @returns 如果脚本是检查或验证类型则返回true
 */
function isCheckOrValidateScript(scriptId: string): boolean {
  const checkPrefixes = ["check-", "validate-", "monitor-", "audit-"];
  return checkPrefixes.some((prefix) => scriptId.startsWith(prefix));
}

/**
 * 确定基于查询结果决定脚本执行状态
 * @param scriptId 脚本ID
 * @param findings 查询结果摘要
 * @param results 详细查询结果
 * @returns 执行的状态类型
 */
function determineStatusType(
  scriptId: string,
  findings: string,
  results?: QueryResult[]
): ExecutionStatusType {
  // 如果是检查类脚本且发现了问题，则标记为需要关注
  if (
    isCheckOrValidateScript(scriptId) &&
    findings !== "No matching records found" &&
    findings !== "No valid queries" &&
    results?.some((r) => r.rows && r.rows.length > 0)
  ) {
    return "attention_needed";
  }

  return "success";
}

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
  let mongoResultId: string | undefined = undefined; // 用于存储MongoDB返回的_id

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }

    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    const sqlContent = fs.readFileSync(filePath, "utf8");
    let processedContent = sqlContent.replace(/\/\*.*?\*\//gs, "");
    processedContent = processedContent.replace(/--.*/g, "");
    const queries = processedContent
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    console.log(
      `[EXEC ${executionTimestamp}] Parsed ${queries.length} SQL queries (comments removed)`
    );

    if (queries.length === 0) {
      successMessage = "SQL file is empty or contains only comments.";
      findings = "No valid queries";
      statusType = "success";
      results = [];
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`
      );
      // 保存到MongoDB并获取ID - 即使是空查询，我们也保存结果记录并传递ID
      const mongoSaveResult = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        successMessage,
        findings,
        results
      );
      if (mongoSaveResult && mongoSaveResult.insertedId) {
        mongoResultId = mongoSaveResult.insertedId.toString();
        console.log(
          `[EXEC ${executionTimestamp}] 保存结果到MongoDB，ID: ${mongoResultId}`
        );
      }

      // 对所有脚本类型都传递mongoResultId，无论状态如何
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType,
        mongoResultId // 总是传递 mongoResultId，即使是空查询
      );

      return {
        success: true,
        statusType,
        message: successMessage,
        findings,
        mongoResultId,
      };
    }

    results = [];
    for (const queryText of queries) {
      const result = await db.query(queryText);
      results.push(result);
    }

    findings = formatQueryFindings(results);
    successMessage = `Script ${scriptId} executed successfully. ${findings}.`;
    console.log(`[EXEC ${executionTimestamp}] ${successMessage}`);

    // 使用通用函数决定状态类型
    statusType = determineStatusType(scriptId, findings, results);

    // 保存结果到MongoDB并获取ID - 注意：我们对所有脚本执行结果都保存记录
    const mongoSaveResultOnSuccess = await saveResultToMongo(
      scriptId,
      statusType === "attention_needed" ? "success" : statusType, // base status
      statusType, // actual statusType
      successMessage,
      findings,
      results
    );

    if (mongoSaveResultOnSuccess && mongoSaveResultOnSuccess.insertedId) {
      mongoResultId = mongoSaveResultOnSuccess.insertedId.toString();
      console.log(
        `[EXEC ${executionTimestamp}] 保存结果到MongoDB，ID: ${mongoResultId}`
      );
    }

    // 对所有脚本类型都传递mongoResultId，不仅限于检查/验证脚本
    await sendSlackNotification(
      scriptId,
      successMessage,
      statusType,
      mongoResultId
    );

    return {
      success: true,
      statusType,
      message: successMessage,
      findings,
      data: results,
      mongoResultId,
    };
  } catch (error: unknown) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EXEC ${executionTimestamp}] Script ${scriptId} execution failed: ${errorMessage}`,
      error
    );
    findings = "Execution failed";
    statusType = "failure";

    // 尝试保存失败结果并获取ID
    try {
      const mongoSaveResultOnError = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        errorMessage,
        findings,
        results // results 可能为 undefined，saveResultToMongo 应能处理
      );
      if (mongoSaveResultOnError && mongoSaveResultOnError.insertedId) {
        mongoResultId = mongoSaveResultOnError.insertedId.toString();
        console.log(
          `[EXEC ${executionTimestamp}] 保存错误结果到MongoDB，ID: ${mongoResultId}`
        );
      }
    } catch (mongoError) {
      console.error(
        `[EXEC ${executionTimestamp}] Failed to save error result to MongoDB for ${scriptId}:`,
        mongoError
      );
    }

    // 即使是失败的结果，也传递mongoResultId
    await sendSlackNotification(
      scriptId,
      `Execution failed: ${errorMessage}`,
      statusType,
      mongoResultId
    );

    return {
      success: false,
      statusType,
      message: errorMessage,
      findings,
      data: results,
      mongoResultId,
    };
  }
}
