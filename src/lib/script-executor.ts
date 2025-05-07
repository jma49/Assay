import path from "path";
import fs from "fs";
// 保持相对路径引用，因为 core/sql-executor 移动到了 scripts 目录下
import { executeSqlFile } from "../../scripts/core/sql-executor";
import { ExecutionResult } from "../../scripts/types"; // 引入统一的类型定义

/**
 * 执行指定的 SQL 脚本，此函数由 API 路由调用以响应手动触发。
 * 它负责查找脚本文件并调用核心执行逻辑。
 *
 * @param scriptId 要执行的脚本的 ID (对应于 .sql 文件名，不含扩展名)。
 * @returns 一个解析为 ExecutionResult 对象的 Promise。
 */
export async function executeScriptAndNotify(
  scriptId: string
): Promise<ExecutionResult> {
  console.log(
    `[API Triggered] Received script execution request, ID: ${scriptId}`
  );

  const scriptFileName = `${scriptId}.sql`;
  // 使用 process.cwd() 作为基础路径，通常在 Next.js 环境中更可靠
  // 路径指向拆分后的 scripts/sql_scripts 目录
  const scriptFilePath = path.resolve(
    process.cwd(),
    "scripts",
    "sql_scripts",
    scriptFileName
  );

  console.log(`[API Triggered] Looking for script file at: ${scriptFilePath}`);

  // 在调用核心执行器之前检查文件是否存在
  if (!fs.existsSync(scriptFilePath)) {
    console.error(`[API Triggered] SQL file not found: ${scriptFilePath}`);
    const errorMsg = `SQL file '${scriptFileName}' not found.`;
    // 返回符合 ExecutionResult 结构的失败结果
    return {
      success: false,
      statusType: "failure",
      message: errorMsg,
      findings: "Configuration Error",
    };
  }

  // 调用核心的 executeSqlFile 函数，它处理：
  // 1. 数据库连接和查询执行
  // 2. 保存结果到 MongoDB
  // 3. 发送 Slack 通知
  try {
    // 等待核心执行函数的结果
    const result = await executeSqlFile(scriptId, scriptFilePath);
    console.log(
      `[API Triggered] Script ${scriptId} execution completed, status: ${
        result.success ? "Success" : "Failure"
      }`
    );
    return result; // 将详细结果传递回 API 路由
  } catch (error) {
    // 这个 catch 块处理调用 executeSqlFile 过程中可能发生的意外错误，
    // 尽管 executeSqlFile 被设计为捕获其内部错误并返回 ExecutionResult。
    console.error(
      `[API Triggered] Unexpected error occurred while executing script ${scriptId}:`,
      error
    );
    const errorMsg = `Execution unexpectedly failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return {
      success: false,
      statusType: "failure",
      message: errorMsg,
      findings: "Execution Error",
    };
  }
}
