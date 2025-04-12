import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { QueryResult } from "pg";
import db from "../src/lib/db";

// 加载环境变量
dotenv.config({ path: ".env.local" });

interface ExecutionResult {
  success: boolean;
  message: string;
  data?: QueryResult[];
}

/**
 * 发送Slack通知 (适配Workflow Builder触发器)
 * @param scriptName 脚本名称
 * @param message 通知内容
 * @param isError 是否为错误通知
 */
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

    // 为Workflow Builder触发器准备数据 - 确保变量名与Slack中的完全匹配
    const status = isError ? "❌ 失败" : "✅ 成功";

    // 按照Slack Workflow Builder的变量命名方式
    // 使用Record<string, string>类型避免TypeScript错误
    const payload: Record<string, string> = {
      script_name: scriptName, // 注意：使用小写和下划线
      status: status, // 变量名完全匹配Slack中设置的
      github_log_url: githubLogUrl || "本地执行无日志链接",
      Time_when_workflow_started: timestamp, // 与Slack中的变量名完全匹配
    };

    // 将Message作为附加消息添加
    if (message) {
      payload.message = message;
    }

    console.log("发送的Slack通知数据:", payload);

    // 发送请求
    await axios.post(webhookUrl, payload);
    console.log("Slack通知已发送");
  } catch (error) {
    console.error("发送Slack通知失败:", error);
  }
}

/**
 * 格式化SQL查询结果
 * @param results 查询结果数组
 */
function formatQueryResults(results: QueryResult[]): string {
  let formattedResults = "";
  let totalRows = 0;

  results.forEach((result, index) => {
    if (result.rows && result.rows.length > 0) {
      totalRows += result.rows.length;
      formattedResults += `查询${index + 1}: 返回${result.rows.length}行数据\n`;

      // 限制每个查询最多显示5行数据
      const displayRows = result.rows.slice(0, 5);
      const columns = Object.keys(displayRows[0]);

      displayRows.forEach((row, rowIndex) => {
        formattedResults += `行${rowIndex + 1}: `;
        formattedResults += columns
          .map((col) => `${col}=${row[col]}`)
          .join(", ");
        formattedResults += "\n";
      });

      // 如果有更多行，显示省略信息
      if (result.rows.length > 5) {
        formattedResults += `...以及其他${result.rows.length - 5}行数据\n`;
      }

      formattedResults += "\n";
    } else {
      formattedResults += `查询${index + 1}: 没有返回结果\n\n`;
    }
  });

  // 在顶部添加摘要
  return `总结: 共执行${results.length}个查询，返回${totalRows}行数据\n\n${formattedResults}`;
}

/**
 * 执行SQL文件
 * @param filePath SQL文件路径
 */
async function executeSqlFile(filePath: string): Promise<ExecutionResult> {
  try {
    // 测试数据库连接
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("数据库连接失败");
    }

    // 读取SQL文件
    const sqlContent = fs.readFileSync(filePath, "utf8");

    // 提取SQL查询
    const queryRegex = /(?:WITH[\s\S]*?SELECT[\s\S]*?;)|(?:SELECT[\s\S]*?;)/gi;
    const queries = [];
    let match;

    while ((match = queryRegex.exec(sqlContent)) !== null) {
      queries.push(match[0]);
    }

    if (queries.length === 0) {
      throw new Error("未找到有效的SQL查询");
    }

    // 执行查询
    const results: QueryResult[] = [];
    for (const query of queries) {
      console.log(`执行查询: ${query.substring(0, 100)}...`);
      const result = await db.query(query);
      results.push(result);
    }

    // 生成成功消息
    const fileName = path.basename(filePath);
    const successMessage = `SQL脚本 ${fileName} 执行成功`;
    console.log(successMessage);

    // 格式化和发送结果
    const formattedResults = formatQueryResults(results);
    await sendSlackNotification(
      fileName,
      `${successMessage}\n${formattedResults}`,
      false
    );

    return {
      success: true,
      message: successMessage,
      data: results,
    };
  } catch (error: Error | unknown) {
    const fileName = path.basename(filePath);
    const errorMessage = `SQL脚本 ${fileName} 执行失败: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);

    // 发送错误通知
    await sendSlackNotification(fileName, errorMessage, true);

    return {
      success: false,
      message: errorMessage,
    };
  } finally {
    // 关闭数据库连接
    await db.closePool();
  }
}

/**
 * 执行check_order_duplicates.sql脚本
 */
async function executeCheckOrderDuplicates(): Promise<void> {
  const scriptPath = path.resolve(
    __dirname,
    "check_order_duplicates.sql"
  );
  console.log(`执行脚本: ${scriptPath}`);

  const result = await executeSqlFile(scriptPath);
  if (!result.success) {
    console.error(result.message);
    process.exit(1);
  }
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 如果没有参数，默认执行check_order_duplicates.sql
  if (args.length === 0) {
    await executeCheckOrderDuplicates();
    return;
  }

  const scriptName = args[0];

  // 检查是否是特定脚本
  if (scriptName === "check_order_duplicates") {
    await executeCheckOrderDuplicates();
    return;
  }

  // 否则尝试执行指定的脚本文件
  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.error("SQL文件不存在:", filePath);
    process.exit(1);
  }

  const result = await executeSqlFile(filePath);
  process.exit(result.success ? 0 : 1);
}

// 执行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error("程序执行错误:", error);
    process.exit(1);
  });
}

// 导出函数供测试使用
export { sendSlackNotification };
