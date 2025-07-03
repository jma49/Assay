import db from "../src/lib/database/db"; // For closing PG pool
import { getMongoDbClient } from "../src/lib/database/mongodb"; // For MongoDB operations
import { Collection, Document } from "mongodb"; // For types
import { executeSqlScriptFromDb } from "./core/sql-executor";

// 环境变量检查
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
  }
}
checkEnvVariables();

// 获取MongoDB集合
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

/**
 * 主函数：从MongoDB获取SQL脚本并执行
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0] || "all"; // 默认执行所有脚本

  console.log(`[批量执行] 开始从MongoDB获取SQL脚本... (模式: ${mode})`);

  try {
    const collection = await getSqlScriptsCollection();

    // 根据执行模式设置过滤条件
    let filter = {};
    let modeDescription = "";

    switch (mode) {
      case "scheduled":
        // 修改：不再检查isScheduled字段，执行所有脚本
        filter = {}; // 获取所有脚本
        modeDescription = "所有可用的";
        break;
      case "enabled":
        filter = { isScheduled: true };
        modeDescription = "已启用的";
        break;
      case "all":
      default:
        filter = {}; // 获取所有脚本
        modeDescription = "所有";
        break;
    }

    // 获取脚本
    const allScripts = await collection
      .find(filter)
      .sort({ createdAt: 1 }) // 按创建时间排序
      .toArray();

    if (allScripts.length === 0) {
      console.log(`[批量执行] MongoDB中未找到${modeDescription}SQL脚本`);
      console.log(`[批量执行] 没有脚本需要执行，不发送通知`);
      return;
    }

    console.log(
      `[批量执行] 从MongoDB获取到 ${allScripts.length} 个${modeDescription}SQL脚本`
    );

    // 如果是scheduled模式，说明这是定时任务触发的执行
    if (mode === "scheduled") {
      console.log(
        `[批量执行] 注意：scheduled模式现在执行所有脚本，不再检查isScheduled字段`
      );
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const executionResults = [];

    // 依次执行每个脚本
    for (const script of allScripts) {
      const scriptId = script.scriptId as string;
      const scriptName = script.name as string;
      const sqlContent = script.sqlContent as string;
      const isScheduled = script.isScheduled as boolean;
      const scriptHashtags = script.hashtags as string[] | undefined; // 获取hashtags信息

      if (!scriptId || !sqlContent) {
        console.warn(
          `[批量执行] 跳过无效脚本: ID=${scriptId}, 内容为空=${!sqlContent}`
        );
        skippedCount++;
        continue;
      }

      console.log(
        `[批量执行] 开始执行脚本: ${scriptId} (${scriptName})${
          isScheduled ? " [定时任务]" : ""
        }${scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""}`
      );

      try {
        // 注意：executeSqlScriptFromDb 已经包含了Slack通知的发送逻辑
        // 所以每个脚本执行完成后会自动发送单独的通知
        const result = await executeSqlScriptFromDb(
          scriptId,
          sqlContent,
          scriptHashtags
        );

        if (result.success) {
          successCount++;
          console.log(
            `[批量执行] ✅ 脚本 ${scriptId} 执行成功 - ${result.statusType}${
              scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
            }`
          );
        } else {
          failCount++;
          console.log(
            `[批量执行] ❌ 脚本 ${scriptId} 执行失败: ${result.message}${
              scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
            }`
          );
        }

        executionResults.push({
          scriptId,
          scriptName,
          isScheduled,
          success: result.success,
          statusType: result.statusType,
          message: result.message,
          findings: result.findings,
        });
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : "未知错误";
        console.error(
          `[批量执行] ❌ 脚本 ${scriptId} 执行异常: ${errorMsg}${
            scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
          }`
        );

        // 这种情况下手动发送通知，因为executeSqlScriptFromDb可能没有机会发送
        // 但实际上executeSqlScriptFromDb内部有try-catch，应该会发送通知
        // 这里的catch主要是防止意外情况

        executionResults.push({
          scriptId,
          scriptName,
          isScheduled,
          success: false,
          statusType: "failure",
          message: errorMsg,
          findings: "执行异常",
        });
      }

      // 添加短暂延迟，避免数据库压力过大
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 输出执行总结（仅日志，不发送Slack通知）
    const summary = `${modeDescription}脚本批量执行完成: 总计 ${
      allScripts.length
    } 个脚本, 成功 ${successCount} 个, 失败 ${failCount} 个${
      skippedCount > 0 ? `, 跳过 ${skippedCount} 个` : ""
    }`;
    console.log(`[批量执行] ${summary}`);

    // 输出详细结果
    console.log("\n[批量执行] 详细执行结果:");
    executionResults.forEach((result) => {
      const scheduledFlag = result.isScheduled ? "[定时]" : "[手动]";
      console.log(
        `  - ${result.scriptId} (${result.scriptName}) ${scheduledFlag}: ${
          result.success ? "✅" : "❌"
        } ${result.statusType} - ${result.findings}`
      );
    });

    console.log(
      `[批量执行] 所有脚本执行完成，共发送了 ${allScripts.length} 个单独的Slack通知`
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "批量执行过程中发生未知错误";
    console.error(`[批量执行] 致命错误: ${errorMsg}`);

    // 对于整个批量执行过程的致命错误，我们也不发送通知
    // 因为这通常是系统配置问题，不是业务脚本问题
    console.error(`[批量执行] 系统错误，不发送通知: ${errorMsg}`);

    throw error;
  } finally {
    // 确保数据库连接被关闭
    console.log("[批量执行] 正在关闭数据库连接...");
    await db.closePool();
    const mongoDbClient = getMongoDbClient();
    await mongoDbClient.closeConnection();
    console.log("[批量执行] 数据库连接已关闭");
  }
}

// 帮助信息
function showHelp() {
  console.log(`
用法: ts-node scripts/run-all-scripts.ts [mode]

模式选项:
  all        - 执行所有脚本 (默认)
  scheduled  - 仅执行启用定时任务的脚本
  enabled    - 仅执行已启用的脚本 (与 scheduled 相同)

示例:
  npx ts-node scripts/run-all-scripts.ts
  npx ts-node scripts/run-all-scripts.ts all
  npx ts-node scripts/run-all-scripts.ts scheduled

注意:
  - 每个脚本执行完成后会单独发送Slack通知
  - 不会发送汇总通知
  - 如果没有脚本需要执行，不会发送任何通知
  `);
}

// 检查是否需要显示帮助
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// 执行主函数
main().catch((error) => {
  console.error("[批量执行] 主函数执行过程中发生未捕获的错误:", error);
  process.exit(1);
});
