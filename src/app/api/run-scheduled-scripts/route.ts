import { NextRequest, NextResponse } from "next/server";

/**
 * 定时任务API - 已在v0.1.8中禁用
 *
 * 注意：此API的功能已暂时禁用，等待v0.1.9版本中的本地执行器架构实现。
 * 原有的Vercel定时任务逻辑已移除，脚本的定时任务配置UI仍然保留，
 * 但实际的定时执行将由本地执行器负责。
 *
 * 迁移计划：
 * - v0.1.9: 实现本地执行器和任务调度器
 * - 本地执行器将读取MongoDB中的脚本配置
 * - 根据cronSchedule和isScheduled字段自动创建定时任务
 */

// 保留原有代码以便参考，但注释掉
/*
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";
import { executeScriptAndNotify } from "@/lib/script-executor";
import { SqlScript } from "@/components/dashboard/types";
import { ExecutionResult } from "../../../../scripts/types";

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}
*/

export async function GET(request: NextRequest) {
  console.log("API: GET /api/run-scheduled-scripts - 功能已禁用的请求");

  // 安全验证仍然保留
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "Unauthorized: Missing or malformed Authorization header." },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid token." },
      { status: 401 },
    );
  }

  // 返回功能已禁用的响应
  return NextResponse.json(
    {
      message: "定时任务功能已在v0.1.8中暂时禁用",
      reason: "等待v0.1.9版本中的本地执行器架构实现",
      status: "disabled",
      nextVersion: "v0.1.9",
      migration: {
        from: "Vercel Cron Jobs",
        to: "本地执行器 + 任务调度器",
        benefits: [
          "安全访问生产数据库",
          "灵活的任务调度",
          "更好的错误处理和重试机制",
          "实时任务状态监控",
        ],
      },
      documentation: "请查看README.md中的v0.1.9开发计划",
    },
    { status: 200 },
  );
}

/* 
=== 原有实现代码（保留以便参考） ===

export async function GET(request: NextRequest) {
  console.log("API: GET /api/run-scheduled-scripts - Request received");

  // 1. Security Validation
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is not set in environment variables. This is a server configuration issue."
    );
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn(
      "API: GET /api/run-scheduled-scripts - Unauthorized: Missing or malformed Authorization header."
    );
    return NextResponse.json(
      { message: "Unauthorized: Missing or malformed Authorization header." },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    console.warn(
      "API: GET /api/run-scheduled-scripts - Unauthorized: Invalid CRON_SECRET token."
    );
    return NextResponse.json(
      { message: "Unauthorized: Invalid token." },
      { status: 401 }
    );
  }

  console.log("API: GET /api/run-scheduled-scripts - Authorization successful");

  try {
    // 2. Fetch Scripts
    const collection = await getSqlScriptsCollection();
    const scriptsToRun = (await collection
      .find({
        isScheduled: true,
        cronSchedule: { $exists: true, $ne: "" },
      })
      .toArray()) as unknown as SqlScript[];

    if (scriptsToRun.length === 0) {
      console.log(
        "API: GET /api/run-scheduled-scripts - No scheduled scripts to run at this time."
      );
      return NextResponse.json(
        { message: "No scheduled scripts to run at this time." },
        { status: 200 }
      );
    }

    console.log(
      `API: GET /api/run-scheduled-scripts - Found ${scriptsToRun.length} scripts to execute.`
    );

    // 3. Execute Scripts
    const results = await Promise.allSettled(
      scriptsToRun.map((script) => {
        console.log(
          `API: GET /api/run-scheduled-scripts - Triggering script: ${
            script.scriptId
          } (Name: ${script.name || "N/A"})`
        );
        return executeScriptAndNotify(script.scriptId);
      })
    );

    let successfullyExecutedCount = 0;
    let failedExecutionCount = 0;
    const detailedExecutionResults = [];

    for (const [index, result] of results.entries()) {
      const script = scriptsToRun[index];

      if (result.status === "fulfilled") {
        const executionOutcome: ExecutionResult = result.value;
        if (executionOutcome.success) {
          successfullyExecutedCount++;
          console.log(
            `Script ${script.scriptId} (Name: ${script.name}) executed successfully. StatusType: ${executionOutcome.statusType}, Message: ${executionOutcome.message}`
          );
        } else {
          failedExecutionCount++;
          console.error(
            `Script ${script.scriptId} (Name: ${script.name}) executed but reported failure. StatusType: ${executionOutcome.statusType}, Message: ${executionOutcome.message}`
          );
        }
        detailedExecutionResults.push({
          scriptId: script.scriptId,
          name: script.name,
          status: "fulfilled",
          executionSuccess: executionOutcome.success,
          message: executionOutcome.message,
          findings: executionOutcome.findings,
          statusType: executionOutcome.statusType,
        });
      } else {
        failedExecutionCount++;
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(
          `Script ${script.scriptId} (Name: ${script.name}) failed to execute (Promise rejected). Reason: ${errorMessage}`
        );
        detailedExecutionResults.push({
          scriptId: script.scriptId,
          name: script.name,
          status: "rejected",
          executionSuccess: false,
          message: errorMessage,
          findings: "Execution Engine Error",
          statusType: "failure",
        });
      }
    }

    console.log(
      `API: GET /api/run-scheduled-scripts - Execution summary: Total Found: ${scriptsToRun.length}, Successfully reported by script: ${successfullyExecutedCount}, Failed (by script or execution): ${failedExecutionCount}`
    );

    return NextResponse.json(
      {
        message: "Scheduled script execution process completed.",
        totalScriptsFound: scriptsToRun.length,
        successfullyExecutedCount: successfullyExecutedCount,
        failedExecutionCount: failedExecutionCount,
        details: detailedExecutionResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "API: GET /api/run-scheduled-scripts - An unexpected error occurred in the main try-catch block:",
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during scheduled script execution.";
    return NextResponse.json(
      { message: "Internal Server Error", error: errorMessage },
      { status: 500 }
    );
  }
}
*/
