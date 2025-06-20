import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import getMongoDbClient from "@/lib/database/mongodb";
import { executeScriptAndNotify } from "@/lib/utils/script-executor";
import batchExecutionCache from "@/services/batch-execution-cache";
import { Collection, Document } from "mongodb";
import { v4 as uuidv4 } from "uuid";

// 开发环境日志辅助函数
const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...args);
  }
};

const devError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.error(message, ...args);
  }
};

const devWarn = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(message, ...args);
  }
};

// Helper function to get the MongoDB collection for sql_scripts
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await getMongoDbClient.getDb();
  return db.collection("sql_scripts");
}

/**
 * POST API endpoint to run all scripts
 * @returns 返回包含批量执行结果的 NextResponse
 */
export async function POST(request: NextRequest) {
  try {
    // 统一的认证检查
    const authResult = await validateApiAuth("en");
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { userEmail } = authResult;

    const body = await request.json();
    const { mode = "all", scriptIds = [], filteredExecution = false } = body;

    devLog(
      `[API 路由 /run-all-scripts] 用户 ${userEmail} 开始批量执行脚本 (模式: ${mode}, 筛选执行: ${filteredExecution})`
    );

    // 获取脚本集合
    const collection = await getSqlScriptsCollection();

    let query = {};
    let modeDescription = "";
    let scriptsToExecute: Document[] = [];

    if (filteredExecution && scriptIds.length > 0) {
      // 筛选执行：使用前端传递的scriptIds
      query = { scriptId: { $in: scriptIds } };
      modeDescription = "筛选的";

      devLog(`[API 路由 /run-all-scripts] 筛选执行，脚本ID列表:`, scriptIds);
    } else if (mode === "scheduled") {
      // 定时任务模式
      query = { isScheduled: true };
      modeDescription = "定时";
    } else {
      // 全部执行模式
      modeDescription = "所有";
    }

    scriptsToExecute = await collection.find(query).toArray();

    if (scriptsToExecute.length === 0) {
      const message = filteredExecution
        ? `没有找到匹配的脚本 (传入了 ${scriptIds.length} 个ID)`
        : `没有找到${modeDescription}脚本`;

      return NextResponse.json({
        success: false,
        message,
        localizedMessage: message,
      });
    }

    // 验证筛选执行的脚本数量
    if (filteredExecution && scriptIds.length > 0) {
      const foundScriptIds = scriptsToExecute.map((s) => s.scriptId);
      const missingScriptIds = scriptIds.filter(
        (id: string) => !foundScriptIds.includes(id)
      );

      if (missingScriptIds.length > 0) {
        devWarn(
          `[API 路由 /run-all-scripts] 部分脚本未找到:`,
          missingScriptIds
        );
      }

      devLog(`[API 路由 /run-all-scripts] 筛选执行验证:`, {
        requestedScripts: scriptIds.length,
        foundScripts: scriptsToExecute.length,
        missingScripts: missingScriptIds.length,
        foundScriptIds,
        missingScriptIds,
      });
    }

    devLog(
      `[API 路由 /run-all-scripts] 找到 ${scriptsToExecute.length} 个${modeDescription}脚本`
    );

    // 生成执行ID
    const executionId = uuidv4();

    // 创建批量执行状态
    try {
      await batchExecutionCache.createExecution(
        executionId,
        scriptsToExecute.map((script) => ({
          scriptId: script.scriptId as string,
          scriptName: script.name as string,
          isScheduled: (script.isScheduled as boolean) || false,
        }))
      );
    } catch (cacheError) {
      devError("[API 路由 /run-all-scripts] 创建执行状态失败:", cacheError);
      // 如果Redis失败，仍然允许执行，但没有状态跟踪
    }

    // 启动异步执行（不等待完成）
    const executionPromise = executeBatchScripts(scriptsToExecute, executionId);

    // 启动异步执行
    executionPromise.catch((error) => {
      devError("[API 路由 /run-all-scripts] 批量执行过程中发生错误:", error);
    });

    // 构建成功响应消息
    let successMessage = `开始批量执行 ${scriptsToExecute.length} 个${modeDescription}脚本`;
    let localizedMessage = `批量执行已启动，共 ${scriptsToExecute.length} 个${modeDescription}脚本`;

    if (filteredExecution) {
      successMessage = `开始执行筛选的 ${scriptsToExecute.length} 个脚本`;
      localizedMessage = `批量执行已启动，共 ${scriptsToExecute.length} 个筛选脚本`;
    }

    // 立即返回响应，不等待执行完成
    return NextResponse.json({
      success: true,
      message: successMessage,
      localizedMessage,
      executionId,
      scriptCount: scriptsToExecute.length,
      mode,
      filteredExecution,
      requestedScriptIds: filteredExecution ? scriptIds : undefined,
      actualScriptIds: scriptsToExecute.map((s) => s.scriptId),
    });
  } catch (error) {
    devError("[API 路由 /run-all-scripts] API异常:", error);

    const errorMessage =
      error instanceof Error ? error.message : "批量执行脚本时发生未知错误";

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        localizedMessage: `批量执行失败: ${errorMessage}`,
      },
      { status: 500 }
    );
  } finally {
    // 确保数据库连接被关闭
    try {
      await getMongoDbClient.closeConnection();
    } catch (closeError) {
      devError("[API 路由 /run-all-scripts] 关闭数据库连接失败:", closeError);
    }
  }
}

/**
 * 异步执行批量脚本，并实时更新状态
 */
async function executeBatchScripts(scripts: Document[], executionId: string) {
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  devLog(
    `[批量执行] 开始执行 ${scripts.length} 个脚本 (执行ID: ${executionId})`
  );

  try {
    // 依次执行每个脚本
    for (const script of scripts) {
      const scriptId = script.scriptId as string;
      const scriptName = script.name as string;
      const sqlContent = script.sqlContent as string;
      const isScheduled = script.isScheduled as boolean;
      const scriptHashtags = script.hashtags as string[] | undefined; // 获取hashtags信息

      if (!scriptId || !sqlContent) {
        devWarn(
          `[批量执行] 跳过无效脚本: ID=${scriptId}, 内容为空=${!sqlContent}`
        );
        skippedCount++;
        continue;
      }

      devLog(
        `[批量执行] 开始执行脚本: ${scriptId} (${scriptName})${
          isScheduled ? " [定时任务]" : ""
        }${scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""}`
      );

      // 更新状态为运行中
      try {
        await batchExecutionCache.updateScriptStatus(executionId, {
          scriptId,
          status: "running",
        });
      } catch (updateError) {
        devWarn(`[批量执行] 无法更新脚本状态为运行中: ${updateError}`);
      }

      try {
        const result = await executeScriptAndNotify(scriptId);

        let finalStatus: "completed" | "failed" | "attention_needed";
        if (result.success) {
          if (result.statusType === "attention_needed") {
            finalStatus = "attention_needed";
          } else {
            finalStatus = "completed";
          }
          successCount++;
          devLog(
            `[批量执行] ✅ 脚本 ${scriptId} 执行成功 - ${result.statusType}${
              scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
            }`
          );
        } else {
          finalStatus = "failed";
          failCount++;
          devLog(
            `[批量执行] ❌ 脚本 ${scriptId} 执行失败: ${result.message}${
              scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
            }`
          );
        }

        // 更新脚本执行状态
        try {
          await batchExecutionCache.updateScriptStatus(executionId, {
            scriptId,
            status: finalStatus,
            message: result.message,
            findings: result.findings,
            mongoResultId: result.mongoResultId,
          });
        } catch (updateError) {
          devWarn(`[批量执行] 无法更新脚本执行结果: ${updateError}`);
        }
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : "未知错误";
        devError(
          `[批量执行] ❌ 脚本 ${scriptId} 执行异常: ${errorMsg}${
            scriptHashtags ? ` [标签: ${scriptHashtags.join(", ")}]` : ""
          }`
        );

        // 更新为失败状态
        try {
          await batchExecutionCache.updateScriptStatus(executionId, {
            scriptId,
            status: "failed",
            message: errorMsg,
          });
        } catch (updateError) {
          devWarn(`[批量执行] 无法更新脚本失败状态: ${updateError}`);
        }
      }

      // 添加短暂延迟，避免数据库压力过大
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 标记批量执行完成
    try {
      await batchExecutionCache.completeExecution(executionId);
    } catch (completeError) {
      devWarn(`[批量执行] 无法标记执行完成: ${completeError}`);
    }

    // 输出执行总结
    const summary = `批量执行完成: 总计 ${
      scripts.length
    } 个脚本, 成功 ${successCount} 个, 失败 ${failCount} 个${
      skippedCount > 0 ? `, 跳过 ${skippedCount} 个` : ""
    }`;
    devLog(`[批量执行] ${summary}`);

    return {
      success: true,
      summary,
      stats: {
        total: scripts.length,
        success: successCount,
        failed: failCount,
        skipped: skippedCount,
      },
    };
  } catch (error) {
    devError("[批量执行] 执行过程中发生致命错误:", error);

    // 尝试标记执行完成，即使发生错误
    try {
      await batchExecutionCache.completeExecution(executionId);
    } catch (completeError) {
      devError("[批量执行] 无法标记执行完成:", completeError);
    }

    throw error;
  }
}
