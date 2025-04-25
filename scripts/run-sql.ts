import path from "path";
import fs from "fs";
import db from "../src/lib/db";
import mongoDbClient from "../src/lib/mongodb";
import { executeSqlFile } from "./core/sql-executor";
import { sendSlackNotification } from "./services/slack-service"; // 导入通知服务，以备直接调用

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

/**
 * 主函数，处理命令行参数并执行相应的 SQL 脚本。
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2); // 获取命令行参数，排除 'ts-node' 和脚本文件名

  if (args.length === 0) {
    console.error("错误: 请提供要执行的 SQL 脚本的 ID (不带 .sql 后缀)。");
    console.log("用法: ts-node scripts/run-sql.ts <scriptId>");
    process.exit(1);
  }

  const scriptId = args[0];
  console.log(`请求执行脚本 ID: ${scriptId}`);

  // 构建 SQL 文件的预期路径
  const scriptFileName = `${scriptId}.sql`;
  const scriptFilePath = path.resolve(
    __dirname, // 使用 __dirname 来定位相对于当前脚本的路径
    "sql_scripts",
    scriptFileName
  );

  console.log(`查找 SQL 文件: ${scriptFilePath}`);

  // 检查文件是否存在（虽然 executeSqlFile 内部也会检查，但在这里先检查可以提供更早的反馈）
  if (!fs.existsSync(scriptFilePath)) {
    const errorMsg = `错误: 未找到指定的 SQL 文件: ${scriptFileName}`;
    console.error(errorMsg);
    // 在文件未找到时也尝试发送通知
    await sendSlackNotification(
      scriptId,
      `执行失败: ${errorMsg} (路径: ${scriptFilePath})`,
      true
    );
    process.exit(1);
  }

  try {
    // 调用核心执行函数
    const result = await executeSqlFile(scriptId, scriptFilePath);

    if (result.success) {
      console.log(`脚本 ${scriptId} 执行完成。状态: 成功`);
    } else {
      console.warn(`脚本 ${scriptId} 执行完成。状态: 失败`);
      // 失败的通知和 MongoDB 记录已在 executeSqlFile 内部处理
    }
  } catch (error) {
    // 捕获 executeSqlFile 未能处理的意外错误（理论上不应发生）
    const errorMsg =
      error instanceof Error ? error.message : "发生未知的顶层错误";
    console.error(`执行脚本 ${scriptId} 时发生意外错误:`, errorMsg);
    await sendSlackNotification(scriptId, `意外错误: ${errorMsg}`, true);
    process.exit(1); // 发生意外错误时退出
  } finally {
    // 无论成功或失败，最后尝试关闭数据库连接
    console.log("尝试关闭数据库连接...");
    await db.closePool();
    await mongoDbClient.closeConnection();
    console.log("数据库连接已关闭。");
  }
}

// 执行主函数
main().catch((error) => {
  // 捕获主函数中未处理的 Promise 拒绝
  console.error("主函数执行过程中发生未捕获的错误:", error);
  process.exit(1);
});
