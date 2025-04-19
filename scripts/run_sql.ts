import fs from "fs";
import path from "path";
import axios from "axios";
import { QueryResult } from "pg";
import db from "../src/lib/db";
import mongoDbClient from "../src/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

// Define types (consider sharing with API route later)
// Removed ScriptManifestEntry interface as manifest.json is no longer used

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

// --- Manifest Loading Removed ---
// Script discovery is now based on the provided script ID argument matching a .sql file name.

export interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string; // Will use script ID/name from manifest
  execution_time: Date;
  status: "success" | "failure";
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  findings: string;
  data?: QueryResult[] | undefined;
}

// --- Type definition for Slack Block Kit payload ---
interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
}

interface SlackPayload {
  text: string; // Fallback text
  blocks: SlackBlock[];
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

    // Use scriptId directly as manifest is removed
    const nameToSave = scriptId;

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
        : "(手动触发或本地执行)"; // Adjust message for non-GH runs

    const status = isError ? "❌ 失败" : "✅ 成功";

    // Use scriptId directly as manifest is removed
    const nameToNotify = scriptId;

    // Construct a typed payload
    const payload: SlackPayload = {
      text: `*脚本执行通知:* ${nameToNotify} - ${status}`, // More informative fallback text
      blocks: [
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*脚本名称:*\\n${nameToNotify}` },
            { type: "mrkdwn", text: `*状态:*\\n${status}` },
            { type: "mrkdwn", text: `*执行时间:*\\n${timestamp} (CST)` },
            {
              type: "mrkdwn",
              text: `*来源:*\\n${
                process.env.GITHUB_ACTIONS
                  ? `<${githubLogUrl}|GitHub Action>`
                  : "手动触发/本地"
              }`,
            }, // Updated Source Field
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*消息/结果:*\\n\`\`\`${message}\`\`\``,
          },
        },
      ],
    };

    console.log(
      `发送 Slack 通知 (${nameToNotify}):`,
      JSON.stringify(payload).substring(0, 200) + "..."
    );

    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`Slack 通知 (${nameToNotify}) 已发送`);
  } catch (error: unknown) {
    // Check for Axios error using property check (more robust across versions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    if (axiosError?.isAxiosError) {
      console.error(
        `发送 Slack 通知 (${scriptId}) 失败 (Axios Error ${
          axiosError.code || "N/A"
        }):`,
        axiosError.response?.data || axiosError.message
      );
    } else {
      console.error(
        `发送 Slack 通知 (${scriptId}) 失败 (Non-Axios Error):`,
        error
      );
    }
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

export async function executeSqlFile(
  scriptId: string,
  filePath: string
): Promise<ExecutionResult> {
  // const fileName = path.basename(filePath); // We'll use scriptId for logging/saving now
  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "执行未完成";

  // Use scriptId directly as manifest is removed
  const scriptDisplayName = scriptId;

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

    // --- 修改后的 SQL 解析逻辑 ---
    // 1. 移除块注释 /* ... */ (非贪婪匹配, s 标志使 . 匹配换行符)
    let processedContent = sqlContent.replace(/\/\*.*?\*\//gs, "");
    // 2. 移除行注释 -- ... (到行尾)
    processedContent = processedContent.replace(/--.*/g, "");

    // 3. 分割语句
    const queries = processedContent
      .split(";")
      .map((q) => q.trim()) // Trim whitespace
      .filter((q) => q.length > 0); // Filter only empty strings after trimming
    // --- 结束修改后的 SQL 解析逻辑 ---

    console.log(`找到 ${queries.length} 个查询语句（已移除注释）`);

    if (queries.length === 0) {
      // Allow files with no executable queries (maybe just comments or setup)
      console.warn(
        `警告: 在 ${scriptDisplayName} (${filePath}) 中移除注释后未找到可执行的 SQL 查询语句。`
      );
      successMessage = `SQL 脚本 ${scriptDisplayName} 执行完成，但移除注释后未找到可执行查询。`;
      findings = "无查询执行（移除注释后）"; // 更新 findings 消息
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
      findings: findings,
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
      findings: findings,
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
  const executionContext = process.env.GITHUB_ACTIONS
    ? "[GitHub Action]"
    : "[CLI]";

  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      throw new Error(
        `${executionContext} 错误：必须提供一个脚本 ID 作为命令行参数。`
      );
    }

    // Argument provided, assume it's the script_id
    scriptToExecuteId = args[0];
    console.log(
      `${executionContext} 信息：接收到参数，尝试执行脚本 ID: ${scriptToExecuteId}`
    );

    // Construct the absolute path for the script file based on the ID
    // Assumes the script file is located in 'sql_scripts' relative to this script's directory
    // and the filename matches the ID with a .sql extension.
    const scriptFilePath = path.resolve(
      __dirname,
      "sql_scripts",
      `${scriptToExecuteId}.sql`
    );

    // Check if the derived file path actually exists before proceeding
    if (!fs.existsSync(scriptFilePath)) {
      throw new Error(
        `${executionContext} 错误：无法找到与 ID '${scriptToExecuteId}' 对应的 SQL 文件于: ${scriptFilePath}`
      );
    }

    // Execute the found script
    const result = await executeSqlFile(scriptToExecuteId, scriptFilePath);

    if (!result.success) {
      console.error(`${executionContext} 脚本执行失败: ${result.message}`);
      exitCode = 1; // Indicate failure
    } else {
      console.log(`${executionContext} 脚本执行成功: ${result.message}`);
    }
  } catch (error) {
    console.error(`${executionContext} 主程序执行错误:`, error);
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
    console.log(`${executionContext} 执行流程结束，尝试关闭 MongoDB 连接...`);
    await mongoDbClient
      .closeConnection()
      .catch((err) =>
        console.error(`${executionContext} 关闭 MongoDB 连接时出错:`, err)
      );
    console.log(`${executionContext} 脚本以退出码 ${exitCode} 结束。`);
    process.exit(exitCode);
  }
}

// Execute main only if the script is run directly
if (require.main === module) {
  main();
}

// Keep export if needed by other modules (though likely not anymore)
// export { sendSlackNotification };
