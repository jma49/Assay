// import path from "path"; // No longer needed
// import fs from "fs"; // No longer needed for reading files
import db from "../src/lib/db"; // For closing PG pool
import mongoDbClient from "../src/lib/mongodb"; // For MongoDB operations
import { Collection, Document } from "mongodb"; // For types
// Import the refactored function
import { executeSqlScriptFromDb } from "./core/sql-executor";
import { sendSlackNotification } from "./services/slack-service";

// --- 环境变量检查 (保持在此处或移至 utils/env-loader.ts) ---
// 简单的检查，确保必要的环境变量存在
function checkEnvVariables() {
  const requiredVars = ["DATABASE_URL", "MONGODB_URI", "SLACK_WEBHOOK_URL"];
  let allSet = true;
  console.log("检查环境变量...");
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.warn(`警告: 环境变量 ${varName} 未定义`);
      allSet = false;
    } else {
      console.log(`  - ${varName}: 已设置`);
    }
  });
  if (!allSet) {
    console.error("错误: 缺少必要的环境变量，脚本可能无法正常运行。");
    // 在关键变量缺失时可以选择退出
    // process.exit(1);
  }
}
checkEnvVariables();
// --- 环境变量检查结束 ---

// Helper function to get MongoDB collection (similar to other places)
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb(); // Assumes MONGODB_URI points to sql_script_result
  return db.collection("sql_scripts");
}

/**
 * 主函数，处理命令行参数，从数据库获取脚本内容，并执行。
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("错误: 请提供要执行的 SQL 脚本的 ID。"); // Updated message
    console.log("用法: ts-node scripts/run-sql.ts <scriptId>");
    process.exit(1);
  }

  const scriptId = args[0];
  console.log(`[CLI] 请求执行脚本 ID: ${scriptId}`);

  try {
    // Get MongoDB collection
    const collection = await mongoDbClient.getSqlScriptsCollection();

    // Find the script by scriptId
    const scriptDoc = await collection.findOne({ scriptId: scriptId });

    if (!scriptDoc) {
      console.error(`脚本 '${scriptId}' 在数据库中未找到。`);
      await sendSlackNotification(
        scriptId,
        `脚本未找到: ${scriptId}`,
        "failure"
      );
      process.exit(1);
    }

    // Extract SQL content and hashtags from the document
    const sqlContent = scriptDoc.sqlContent as string;
    const scriptHashtags = scriptDoc.hashtags as string[] | undefined; // 获取hashtags信息

    if (!sqlContent || sqlContent.trim() === "") {
      console.warn(`脚本 '${scriptId}' 没有SQL内容。`);
      await sendSlackNotification(
        scriptId,
        `脚本没有SQL内容: ${scriptId}`,
        "failure",
        undefined,
        scriptHashtags?.join(", ") // 传递标签信息
      );
      process.exit(1);
    }

    console.log(
      `找到脚本 '${scriptId}'，开始执行...${
        scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
      }`
    );

    // Use executeSqlScriptFromDb with scriptId, sqlContent, and hashtags
    const result = await executeSqlScriptFromDb(
      scriptId,
      sqlContent,
      scriptHashtags
    );

    if (result.success) {
      console.log(`脚本 ${scriptId} 执行成功！状态: ${result.statusType}`);
    } else {
      console.error(`脚本 ${scriptId} 执行失败: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    // Catch errors from DB fetch or execution
    const errorMsg =
      error instanceof Error ? error.message : "发生未知的顶层错误";
    console.error(`[CLI] 执行脚本 ${scriptId} 时发生错误:`, errorMsg);
    // Try to send Slack notification even for fetch errors
    await sendSlackNotification(scriptId, `执行失败: ${errorMsg}`, "failure");
    // process.exit(1); // Decide if CLI should exit on error
  } finally {
    // Ensure connections are closed
    console.log("尝试关闭数据库连接...");
    await db.closePool();
    await mongoDbClient.closeConnection();
    console.log("数据库连接已关闭。");
  }
}

// Execute main function
main().catch((error) => {
  console.error("主函数执行过程中发生未捕获的错误:", error);
  process.exit(1);
});
