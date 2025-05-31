import { NextRequest, NextResponse } from "next/server";
import {
  batchExecutionCache,
  BatchExecutionState,
} from "@/services/batch-execution-cache";

// 内存备份存储（降级方案）
const memoryFallback = new Map<string, BatchExecutionState>();

/**
 * 尝试从Redis获取数据，失败时使用内存存储
 */
async function safeGetExecution(
  executionId: string
): Promise<BatchExecutionState | null> {
  try {
    const result = await batchExecutionCache.getExecution(executionId);
    return result;
  } catch (error) {
    console.warn(`[API] Redis获取失败，使用内存备份: ${error}`);
    const memoryData = memoryFallback.get(executionId);
    return memoryData || null;
  }
}

/**
 * 尝试保存到Redis，失败时保存到内存
 */
async function safeSaveExecution(
  executionId: string,
  execution: BatchExecutionState
): Promise<void> {
  try {
    // 已经在缓存服务内部处理了保存逻辑
    memoryFallback.set(executionId, execution); // 同时保存到内存作为备份
  } catch (error) {
    console.warn(`[API] Redis保存失败，使用内存备份: ${error}`);
    memoryFallback.set(executionId, execution);
  }
}

/**
 * GET - 获取批量执行状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("executionId");

    if (!executionId) {
      return NextResponse.json(
        { success: false, message: "Missing executionId parameter" },
        { status: 400 }
      );
    }

    const execution = await safeGetExecution(executionId);

    if (!execution) {
      // 检查是否在内存备份中
      const memoryData = memoryFallback.get(executionId);
      if (!memoryData) {
        return NextResponse.json(
          { success: false, message: "Execution not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: memoryData,
        source: "memory_fallback",
      });
    }

    return NextResponse.json({
      success: true,
      data: execution,
      source: "redis",
    });
  } catch (error) {
    console.error("[批量执行状态API] 获取状态失败:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get batch execution status" },
      { status: 500 }
    );
  }
}

/**
 * POST - 创建或更新批量执行状态
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      executionId,
      action,
      scriptId,
      status,
      message,
      findings,
      mongoResultId,
    } = body;

    if (!executionId) {
      return NextResponse.json(
        { success: false, message: "Missing executionId" },
        { status: 400 }
      );
    }

    switch (action) {
      case "create":
        // 创建新的批量执行状态
        const { scripts } = body;
        if (!scripts || !Array.isArray(scripts)) {
          return NextResponse.json(
            { success: false, message: "Missing scripts array" },
            { status: 400 }
          );
        }

        try {
          const newExecution = await batchExecutionCache.createExecution(
            executionId,
            scripts.map((script) => ({
              scriptId: script.scriptId,
              scriptName: script.scriptName || script.scriptId,
              isScheduled: script.isScheduled || false,
            }))
          );

          await safeSaveExecution(executionId, newExecution);

          return NextResponse.json({
            success: true,
            message: "Batch execution created",
            data: newExecution,
            source: "redis",
          });
        } catch (redisError) {
          console.warn(`[API] Redis创建失败，使用内存备份: ${redisError}`);

          // 降级到内存存储
          const memoryExecution: BatchExecutionState = {
            executionId,
            scripts: scripts.map((script) => ({
              scriptId: script.scriptId,
              scriptName: script.scriptName || script.scriptId,
              isScheduled: script.isScheduled || false,
              status: "pending",
            })),
            startedAt: new Date().toISOString(),
            totalScripts: scripts.length,
            isActive: true,
          };

          memoryFallback.set(executionId, memoryExecution);

          return NextResponse.json({
            success: true,
            message: "Batch execution created (fallback mode)",
            data: memoryExecution,
            source: "memory_fallback",
          });
        }

      case "update":
        // 更新脚本状态
        if (!scriptId || !status) {
          return NextResponse.json(
            { success: false, message: "Missing scriptId or status" },
            { status: 400 }
          );
        }

        try {
          const updatedExecution = await batchExecutionCache.updateScriptStatus(
            executionId,
            {
              scriptId,
              status,
              message,
              findings,
              mongoResultId,
            }
          );

          if (!updatedExecution) {
            // 尝试从内存备份更新
            const memoryData = memoryFallback.get(executionId);
            if (!memoryData) {
              return NextResponse.json(
                { success: false, message: "Execution not found" },
                { status: 404 }
              );
            }

            // 更新内存中的脚本状态
            const scriptIndex = memoryData.scripts.findIndex(
              (s) => s.scriptId === scriptId
            );
            if (scriptIndex === -1) {
              return NextResponse.json(
                { success: false, message: "Script not found in execution" },
                { status: 404 }
              );
            }

            const script = memoryData.scripts[scriptIndex];
            const previousStatus = script.status;

            script.status = status;
            script.message = message;
            script.findings = findings;
            script.mongoResultId = mongoResultId;

            // 设置时间戳
            if (status === "running" && previousStatus === "pending") {
              script.startTime = new Date().toISOString();
            } else if (
              status === "completed" ||
              status === "failed" ||
              status === "attention_needed"
            ) {
              script.endTime = new Date().toISOString();
            }

            // 检查是否所有脚本都已完成
            const allCompleted = memoryData.scripts.every(
              (s) =>
                s.status === "completed" ||
                s.status === "failed" ||
                s.status === "attention_needed"
            );

            if (allCompleted && memoryData.isActive) {
              memoryData.isActive = false;
              memoryData.completedAt = new Date().toISOString();
            }

            memoryFallback.set(executionId, memoryData);

            return NextResponse.json({
              success: true,
              message: "Script status updated (fallback mode)",
              data: memoryData,
              source: "memory_fallback",
            });
          }

          await safeSaveExecution(executionId, updatedExecution);

          return NextResponse.json({
            success: true,
            message: "Script status updated",
            data: updatedExecution,
            source: "redis",
          });
        } catch (redisError) {
          console.warn(`[API] Redis更新失败: ${redisError}`);
          return NextResponse.json(
            {
              success: false,
              message: `Failed to update script status: ${redisError}`,
            },
            { status: 500 }
          );
        }

      case "complete":
        // 完成批量执行
        try {
          await batchExecutionCache.completeExecution(executionId);

          // 同时更新内存备份
          const memoryData = memoryFallback.get(executionId);
          if (memoryData) {
            memoryData.isActive = false;
            memoryData.completedAt = new Date().toISOString();
            memoryFallback.set(executionId, memoryData);
          }

          return NextResponse.json({
            success: true,
            message: "Batch execution completed",
            source: "redis",
          });
        } catch (redisError) {
          console.warn(`[API] Redis完成操作失败: ${redisError}`);

          // 更新内存备份
          const memoryData = memoryFallback.get(executionId);
          if (memoryData) {
            memoryData.isActive = false;
            memoryData.completedAt = new Date().toISOString();
            memoryFallback.set(executionId, memoryData);
          }

          return NextResponse.json({
            success: true,
            message: "Batch execution completed (fallback mode)",
            source: "memory_fallback",
          });
        }

      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[批量执行状态API] 更新状态失败:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update batch execution status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 清理完成的批量执行状态
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("executionId");

    if (executionId) {
      // 删除特定的执行状态
      try {
        await batchExecutionCache.deleteExecution(executionId);
      } catch (redisError) {
        console.warn(`[API] Redis删除失败: ${redisError}`);
      }

      // 同时从内存备份中删除
      memoryFallback.delete(executionId);

      return NextResponse.json({
        success: true,
        message: "Execution deleted",
      });
    } else {
      // 清理所有非活跃的执行状态
      let cleanedCount = 0;

      try {
        cleanedCount = await batchExecutionCache.cleanupInactiveExecutions();
      } catch (redisError) {
        console.warn(`[API] Redis清理失败: ${redisError}`);
      }

      // 清理内存备份中的非活跃执行
      const toDelete = [];
      for (const [id, execution] of memoryFallback.entries()) {
        if (!execution.isActive) {
          toDelete.push(id);
        }
      }
      toDelete.forEach((id) => memoryFallback.delete(id));

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${Math.max(
          cleanedCount,
          toDelete.length
        )} completed executions`,
        redis_cleaned: cleanedCount,
        memory_cleaned: toDelete.length,
      });
    }
  } catch (error) {
    console.error("[批量执行状态API] 删除状态失败:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete batch execution status" },
      { status: 500 }
    );
  }
}
