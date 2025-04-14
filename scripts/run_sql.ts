import fs from "fs";
import path from "path";
import axios from "axios";
import { QueryResult } from "pg";
import db from "../src/lib/db";
import mongoDbClient from "../src/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

// Define types (consider sharing with API route later)
interface ScriptManifestEntry {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

// Load environment variables FIRST!
// Note: dotenv/config is preloaded via ts-node -r, no need for explicit dotenv.config() here
// unless running this script directly without the preload.
console.log("信息：尝试加载环境变量 (期望由 ts-node -r dotenv/config 预加载)");
if (!process.env.MONGODB_URI) {
  console.warn(
    "警告：MONGODB_URI 未定义。确保使用 'ts-node -r dotenv/config' 运行或已手动设置环境变量。"
  );
} else {
  console.log(
    "信息：MONGODB_URI 已设置。",
    process.env.MONGODB_URI ? "(有值)" : "(无值，检查 .env.local)"
  );
}
if (!process.env.DATABASE_URL) {
  console.warn("警告：DATABASE_URL 未定义。");
} else {
  console.log("信息：DATABASE_URL 已设置。");
}
if (!process.env.SLACK_WEBHOOK_URL) {
  console.warn("警告：SLACK_WEBHOOK_URL 未定义。");
} else {
  console.log("信息：SLACK_WEBHOOK_URL 已设置。");
}

// --- Load Script Manifest ---
let scriptManifest: ScriptManifestEntry[] = [];
const manifestPath = path.resolve(__dirname, "sql_scripts", "manifest.json");
try {
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    scriptManifest = JSON.parse(manifestContent);
    console.log(
      `信息：成功加载 ${scriptManifest.length} 个脚本从 manifest.json`
    );
  } else {
    console.error(`错误：脚本清单文件未找到于 ${manifestPath}`);
    // Decide if this is a fatal error depending on script usage
    // process.exit(1);
  }
} catch (error) {
  console.error("错误：加载或解析 manifest.json 失败:", error);
  // process.exit(1);
}

interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string; // Will use script ID/name from manifest
  execution_time: Date;
  status: "success" | "failure";
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  data?: QueryResult[] | undefined;
}

async function saveResultToMongo(
  scriptId: string, // Changed from scriptName
  status: "success" | "failure",
  message: string,
  findings: string,
  results?: QueryResult[]
): Promise<void> {
  try {
    const db = await mongoDbClient.getDb();
    const collection: Collection<SqlCheckHistoryDocument> =
      db.collection("result");

    const rawResults: Record<string, unknown>[] = results
      ? results.map((r) => r.rows || []).flat()
      : [];

    // Find the friendly name from the manifest if possible
    const scriptEntry = scriptManifest.find((s) => s.id === scriptId);
    const nameToSave = scriptEntry ? scriptEntry.name : scriptId; // Fallback to ID if not found

    const historyDoc: SqlCheckHistoryDocument = {
      script_name: nameToSave, // Use the resolved name
      execution_time: new Date(),
      status: status,
      message: message,
      findings: findings,
      raw_results: rawResults,
      github_run_id: process.env.GITHUB_RUN_ID,
    };

    await collection.insertOne(historyDoc);
    console.log(`执行结果 (${nameToSave}) 已保存到 MongoDB`);
  } catch (error) {
    console.error(`保存结果 (${scriptId}) 到 MongoDB 失败:`, error);
    // Avoid crashing the script just because saving failed
  }
}

async function sendSlackNotification(
  scriptId: string, // Changed from scriptName
  message: string,
  isError = false
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL 未配置, 跳过通知");
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Chicago", // Keep or make configurable?
      hour12: false,
    });

    const githubLogUrl =
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : "本地执行无日志链接";

    const status = isError ? "❌ 失败" : "✅ 成功";

    // Find the friendly name from the manifest
    const scriptEntry = scriptManifest.find((s) => s.id === scriptId);
    const nameToNotify = scriptEntry ? scriptEntry.name : scriptId; // Fallback to ID

    const payload: Record<string, string> = {
      script_name: nameToNotify,
      status: status,
      github_log_url: githubLogUrl,
      Time_when_workflow_started: timestamp,
    };

    if (message) {
      payload.message = message; // Keep the detailed message
    }

    console.log(`发送 Slack 通知 (${nameToNotify}):`, payload);

    await axios.post(webhookUrl, payload);
    console.log(`Slack 通知 (${nameToNotify}) 已发送`);
  } catch (error) {
    console.error(`发送 Slack 通知 (${scriptId}) 失败:`, error);
    // Avoid crashing the script just because notification failed
  }
}

function formatQueryFindings(results: QueryResult[]): string {
  let totalRows = 0;
  results.forEach((result) => {
    if (result.rows) {
      totalRows += result.rows.length;
    }
  });
  if (totalRows > 0) {
    return `${totalRows} 条记录被查出`;
  } else {
    return "未查出相关记录";
  }
}

async function executeSqlFile(
  scriptId: string,
  filePath: string
): Promise<ExecutionResult> {
  // const fileName = path.basename(filePath); // We'll use scriptId for logging/saving now
  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "执行未完成";

  const scriptEntry = scriptManifest.find((s) => s.id === scriptId);
  const scriptDisplayName = scriptEntry ? scriptEntry.name : scriptId;

  console.log(
    `开始执行脚本: ${scriptDisplayName} (ID: ${scriptId}) 从文件: ${filePath}`
  );

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL 文件未找到: ${filePath}`);
    }

    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("数据库连接失败");
    }

    const sqlContent = fs.readFileSync(filePath, "utf8");
    // Simple split by semicolon, ignoring comments or complex cases for now
    // WARNING: This is a basic split and might fail with complex SQL (e.g., semicolons in strings/comments)
    // Consider a more robust SQL parser if needed.
    const queries = sqlContent
      .split(";")
      .map((q) => q.trim())
      .filter(
        (q) => q.length > 0 && !q.startsWith("--") && !q.startsWith("/*")
      );

    console.log(`找到 ${queries.length} 个查询语句`);

    if (queries.length === 0) {
      // Allow files with no executable queries (maybe just comments or setup)
      console.warn(
        `警告: 在 ${scriptDisplayName} (${filePath}) 中未找到可执行的 SQL 查询语句。`
      );
      successMessage = `SQL 脚本 ${scriptDisplayName} 执行完成，但未找到可执行查询。`;
      findings = "无查询执行";
      results = []; // Ensure results is an empty array
    } else {
      // Check for forbidden statements before executing anything
      const forbiddenPatterns = [
        /UPDATE\s/i,
        /DELETE\s/i,
        /INSERT\s/i,
        /ALTER\s/i,
        /DROP\s/i,
        /TRUNCATE\s/i,
      ];
      for (const query of queries) {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(query)) {
            throw new Error(
              `安全限制：脚本 ${scriptDisplayName} 包含禁止的操作 (${pattern.source})`
            );
          }
        }
      }

      results = [];
      for (const query of queries) {
        console.log(`执行查询: ${query.substring(0, 100)}...`);
        const result = await db.query(query);
        results.push(result);
      }

      successMessage = `SQL 脚本 ${scriptDisplayName} 执行成功`;
      findings = formatQueryFindings(results);
      console.log(successMessage);
      console.log(`发现: ${findings}`);
    }

    // Use scriptId for notifications and saving
    await sendSlackNotification(
      scriptId,
      `${successMessage} - ${findings}`,
      false
    );

    await saveResultToMongo(
      scriptId,
      "success",
      successMessage,
      findings,
      results
    );

    return {
      success: true,
      message: successMessage,
      data: results,
    };
  } catch (error: Error | unknown) {
    errorMessage = `SQL 脚本 ${scriptDisplayName} (ID: ${scriptId}) 执行失败: ${
      error instanceof Error ? error.message : String(error)
    }`;
    findings = "执行失败";
    console.error(errorMessage);

    // Use scriptId for notifications and saving
    await sendSlackNotification(scriptId, errorMessage, true);

    await saveResultToMongo(
      scriptId,
      "failure",
      errorMessage,
      findings,
      results // Pass results even on failure, might contain partial data
    );

    return {
      success: false,
      message: errorMessage,
    };
  } finally {
    // Ensure pool is closed even if DB connection failed initially
    await db
      .closePool()
      .catch((err) => console.error("关闭数据库连接池时出错:", err));
  }
}

async function main(): Promise<void> {
  let scriptToExecuteId: string | null = null;
  let exitCode = 0;

  try {
    const args = process.argv.slice(2);

    if (args.length > 0) {
      // Argument provided, assume it's the script_id
      scriptToExecuteId = args[0];
      console.log(
        `信息：接收到命令行参数，尝试执行脚本 ID: ${scriptToExecuteId}`
      );
    } else {
      // No argument, assume default cron job behavior
      // Find the default script (e.g., the first one in the manifest or a specific ID)
      const defaultScriptId = "check_order_duplicates"; // Or use scriptManifest[0]?.id
      if (scriptManifest.some((s) => s.id === defaultScriptId)) {
        scriptToExecuteId = defaultScriptId;
        console.log(
          `信息：无命令行参数，执行默认脚本 ID: ${scriptToExecuteId}`
        );
      } else {
        throw new Error(
          "错误：未提供脚本 ID 参数，且无法找到默认脚本 'check_order_duplicates'。请检查 manifest.json。"
        );
      }
    }

    // Find the script details in the manifest
    const scriptEntry = scriptManifest.find((s) => s.id === scriptToExecuteId);

    if (!scriptEntry) {
      throw new Error(
        `错误：未在 manifest.json 中找到 ID 为 '${scriptToExecuteId}' 的脚本条目。`
      );
    }

    // Construct the absolute path for the script file
    const scriptFilePath = path.resolve(__dirname, scriptEntry.filePath);

    // Execute the found script
    const result = await executeSqlFile(scriptEntry.id, scriptFilePath);

    if (!result.success) {
      console.error(`脚本执行失败: ${result.message}`);
      exitCode = 1; // Indicate failure
    }
  } catch (error) {
    console.error("主程序执行错误:", error);
    exitCode = 1; // Indicate failure
    // Attempt to send a notification for the main error if possible
    await sendSlackNotification(
      scriptToExecuteId || "unknown_script",
      `主程序执行失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
      true
    );
  } finally {
    console.log("执行流程结束，尝试关闭 MongoDB 连接...");
    await mongoDbClient
      .closeConnection()
      .catch((err) => console.error("关闭 MongoDB 连接时出错:", err));
    console.log(`脚本以退出码 ${exitCode} 结束。`);
    process.exit(exitCode);
  }
}

// Execute main only if the script is run directly
if (require.main === module) {
  main();
}

// Keep export if needed by other modules (though likely not anymore)
// export { sendSlackNotification };
