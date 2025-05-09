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
 * 执行从数据库获取的 SQL 脚本内容。
 * 该函数负责解析并执行 SQL 内容，
 * 然后调用服务保存结果到 MongoDB 并发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param sqlContent SQL 脚本的完整内容。
 * @returns 返回一个包含执行结果的 Promise 对象。
 */
export async function executeSqlScriptFromDb(
  scriptId: string,
  sqlContent: string // Changed from filePath
): Promise<ExecutionResult> {
  const executionTimestamp = Date.now();
  console.log(
    // Updated log message
    `[EXEC ${executionTimestamp}] Starting script execution: ${scriptId} (from DB content)`
  );

  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "Execution incomplete";
  let statusType: ExecutionStatusType = "failure"; // 默认失败
  let mongoResultId: string | undefined = undefined;

  try {
    // Removed: if (!fs.existsSync(filePath)) { ... }

    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    // Removed: const sqlContentFromFile = fs.readFileSync(filePath, "utf8");
    // sqlContent is now a parameter

    if (!sqlContent || sqlContent.trim() === "") {
      successMessage = "SQL content is empty.";
      findings = "No SQL content provided";
      statusType = "success"; // Or perhaps a specific status like 'no_content'
      results = [];
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`
      );
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
      }
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType,
        mongoResultId
      );
      return {
        success: true, // Technically not a failure, but script didn't run SQL
        statusType,
        message: successMessage,
        findings,
        mongoResultId,
      };
    }

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
      successMessage =
        "SQL content is empty or contains only comments after processing."; // Adjusted message
      findings = "No valid queries after processing";
      statusType = "success";
      results = [];
      // ... (rest of the block for no queries is the same as original)
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`
      );
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
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType,
        mongoResultId
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

    statusType = determineStatusType(scriptId, findings, results);

    const mongoSaveResultOnSuccess = await saveResultToMongo(
      scriptId,
      statusType === "attention_needed" ? "success" : statusType,
      statusType,
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

    try {
      const mongoSaveResultOnError = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        errorMessage,
        findings,
        results
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
