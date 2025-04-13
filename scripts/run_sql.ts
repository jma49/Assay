import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";
import { QueryResult } from "pg";
import db from "../src/lib/db";
import mongoDbClient from "../src/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

// Load environment variables FIRST!
dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
  override: true,
});
// Check if MONGODB_URI is loaded immediately after config
if (!process.env.MONGODB_URI) {
  console.error(
    "错误：dotenv 加载后 MONGODB_URI 仍然未定义！检查路径和文件内容。"
  );
  // You might want to exit here depending on required functionality
  // process.exit(1);
} else {
  console.log("信息：dotenv 加载成功，MONGODB_URI 已设置。");
}

interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string;
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
  scriptName: string,
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

    const historyDoc: SqlCheckHistoryDocument = {
      script_name: scriptName,
      execution_time: new Date(),
      status: status,
      message: message,
      findings: findings,
      raw_results: rawResults,
      github_run_id: process.env.GITHUB_RUN_ID,
    };

    await collection.insertOne(historyDoc);
    console.log("执行结果已保存到 MongoDB");
  } catch (error) {
    console.error("保存结果到 MongoDB 失败:", error);
  }
}

async function sendSlackNotification(
  scriptName: string,
  message: string,
  isError = false
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL 未配置");
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour12: false,
    });

    const githubLogUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

    const status = isError ? "❌ 失败" : "✅ 成功";

    const payload: Record<string, string> = {
      script_name: scriptName,
      status: status,
      github_log_url: githubLogUrl || "本地执行无日志链接",
      Time_when_workflow_started: timestamp,
    };

    if (message) {
      payload.message = message;
    }

    console.log("发送的Slack通知数据:", payload);

    await axios.post(webhookUrl, payload);
    console.log("Slack通知已发送");
  } catch (error) {
    console.error("发送Slack通知失败:", error);
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

async function executeSqlFile(filePath: string): Promise<ExecutionResult> {
  const fileName = path.basename(filePath);
  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "执行未完成";

  try {
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("数据库连接失败");
    }

    const sqlContent = fs.readFileSync(filePath, "utf8");
    const queryRegex = /(?:WITH[\s\S]*?SELECT[\s\S]*?;)|(?:SELECT[\s\S]*?;)/gi;
    const queries = [];
    let match;
    while ((match = queryRegex.exec(sqlContent)) !== null) {
      queries.push(match[0]);
    }
    if (queries.length === 0) {
      throw new Error("未找到有效的SQL查询");
    }

    results = [];
    for (const query of queries) {
      console.log(`执行查询: ${query.substring(0, 100)}...`);
      const result = await db.query(query);
      results.push(result);
    }

    successMessage = `SQL脚本 ${fileName} 执行成功`;
    findings = formatQueryFindings(results);
    console.log(successMessage);
    console.log(`发现: ${findings}`);

    await sendSlackNotification(
      fileName,
      `${successMessage} - ${findings}`,
      false
    );

    await saveResultToMongo(
      fileName,
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
    errorMessage = `SQL脚本 ${fileName} 执行失败: ${
      error instanceof Error ? error.message : String(error)
    }`;
    findings = "执行失败";
    console.error(errorMessage);

    await sendSlackNotification(fileName, errorMessage, true);

    await saveResultToMongo(
      fileName,
      "failure",
      errorMessage,
      findings,
      results
    );

    return {
      success: false,
      message: errorMessage,
    };
  } finally {
    await db.closePool();
  }
}

async function executeCheckOrderDuplicates(): Promise<void> {
  const scriptPath = path.resolve(
    __dirname,
    "sql_scripts",
    "check_order_duplicates.sql"
  );
  console.log(`执行脚本: ${scriptPath}`);

  const result = await executeSqlFile(scriptPath);
  if (!result.success) {
    console.error(result.message);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      await executeCheckOrderDuplicates();
      return;
    }
    const scriptName = args[0];
    if (scriptName === "check_order_duplicates") {
      await executeCheckOrderDuplicates();
      return;
    }
    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.error("SQL文件不存在:", filePath);
      process.exit(1);
    }
    const result = await executeSqlFile(filePath);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("主程序执行错误:", error);
    process.exit(1);
  } finally {
    console.log("尝试关闭 MongoDB 连接...");
    await mongoDbClient.closeConnection();
  }
}

if (require.main === module) {
  main();
}

export { sendSlackNotification };
