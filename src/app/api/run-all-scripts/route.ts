import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";
import { executeScriptAndNotify } from "@/lib/script-executor";

// Helper function to get the MongoDB collection for sql_scripts
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

// 生成唯一的执行ID
function generateExecutionId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 更新批量执行状态的辅助函数
async function updateBatchExecutionStatus(
  executionId: string,
  action: string,
  scriptId?: string,
  status?: string,
  message?: string,
  findings?: string,
  mongoResultId?: string
) {
  try {
    const response = await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/batch-execution-status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId,
          action,
          scriptId,
          status,
          message,
          findings,
          mongoResultId,
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[批量执行] 更新状态失败: ${response.statusText}`);
    }
  } catch (error) {
    console.warn("[批量执行] 无法更新执行状态:", error);
  }
}

/**
 * POST API endpoint to run all scripts
 * @returns 返回包含批量执行结果的 NextResponse
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体，期望包含可选的 mode
    const body = await request.json();
    const { mode = "all" } = body; // 默认模式为all

    console.log(`[API 路由 /run-all-scripts] 开始批量执行脚本 (模式: ${mode})`);

    // 获取脚本集合
    const collection = await getSqlScriptsCollection();

    // 根据模式设置过滤条件
    let filter = {};
    let modeDescription = "";

    switch (mode) {
      case "scheduled":
        filter = { isScheduled: true };
        modeDescription = "启用定时任务的";
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
      const message = `未找到${modeDescription}脚本`;

      return NextResponse.json(
        {
          success: false,
          message: message,
          localizedMessage: message,
          totalScripts: 0,
        },
        { status: 404 }
      );
    }

    console.log(
      `[API 路由 /run-all-scripts] 找到 ${allScripts.length} 个${modeDescription}脚本`
    );

    // 生成唯一的执行ID
    const executionId = generateExecutionId();

    // 创建批量执行状态
    await updateBatchExecutionStatus(
      executionId,
      "create",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    // 同时发送脚本信息到状态API
    await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/batch-execution-status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId,
          action: "create",
          scripts: allScripts.map((script) => ({
            scriptId: script.scriptId,
            scriptName: script.name,
            isScheduled: script.isScheduled || false,
          })),
        }),
      }
    );

    // 启动批量执行（异步执行，不等待完成）
    const executionPromise = executeBatchScripts(allScripts, executionId);

    // 不等待执行完成，立即返回成功响应
    const successMessage = `批量执行已开始，共 ${allScripts.length} 个脚本`;

    // 启动异步执行
    executionPromise.catch((error) => {
      console.error(
        "[API 路由 /run-all-scripts] 批量执行过程中发生错误:",
        error
      );
    });

    return NextResponse.json(
      {
        success: true,
        message: successMessage,
        localizedMessage: successMessage,
        totalScripts: allScripts.length,
        mode: mode,
        executionStarted: true,
        executionId: executionId, // 返回执行ID给前端
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API 路由 /run-all-scripts] API异常:", error);

    const errorMessage =
      error instanceof Error ? error.message : "批量执行请求处理失败";

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        localizedMessage: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * 异步执行批量脚本，并实时更新状态
 */
async function executeBatchScripts(scripts: Document[], executionId: string) {
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  console.log(
    `[批量执行] 开始执行 ${scripts.length} 个脚本 (执行ID: ${executionId})`
  );

  // 依次执行每个脚本
  for (const script of scripts) {
    const scriptId = script.scriptId as string;
    const scriptName = script.name as string;
    const sqlContent = script.sqlContent as string;
    const isScheduled = script.isScheduled as boolean;

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
      }`
    );

    // 更新状态为运行中
    await updateBatchExecutionStatus(
      executionId,
      "update",
      scriptId,
      "running"
    );

    try {
      const result = await executeScriptAndNotify(scriptId);

      let finalStatus: string;
      if (result.success) {
        if (result.statusType === "attention_needed") {
          finalStatus = "attention_needed";
        } else {
          finalStatus = "completed";
        }
        successCount++;
        console.log(
          `[批量执行] ✅ 脚本 ${scriptId} 执行成功 - ${result.statusType}`
        );
      } else {
        finalStatus = "failed";
        failCount++;
        console.log(
          `[批量执行] ❌ 脚本 ${scriptId} 执行失败: ${result.message}`
        );
      }

      // 更新脚本执行状态
      await updateBatchExecutionStatus(
        executionId,
        "update",
        scriptId,
        finalStatus,
        result.message,
        result.findings,
        result.mongoResultId
      );
    } catch (error) {
      failCount++;
      const errorMsg = error instanceof Error ? error.message : "未知错误";
      console.error(`[批量执行] ❌ 脚本 ${scriptId} 执行异常: ${errorMsg}`);

      // 更新为失败状态
      await updateBatchExecutionStatus(
        executionId,
        "update",
        scriptId,
        "failed",
        errorMsg
      );
    }

    // 添加短暂延迟，避免数据库压力过大
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 标记批量执行完成
  await updateBatchExecutionStatus(executionId, "complete");

  // 输出执行总结
  const summary = `批量执行完成: 总计 ${
    scripts.length
  } 个脚本, 成功 ${successCount} 个, 失败 ${failCount} 个${
    skippedCount > 0 ? `, 跳过 ${skippedCount} 个` : ""
  }`;
  console.log(`[批量执行] ${summary}`);
}
