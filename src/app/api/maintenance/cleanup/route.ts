import { NextRequest, NextResponse } from "next/server";
import batchExecutionCache from "@/services/batch-execution-cache";
import redis from "@/lib/redis";

/**
 * POST - 执行缓存清理任务
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const dryRun = searchParams.get("dryRun") === "true";

    console.log(`[维护任务] 开始缓存清理 (强制: ${force}, 预览: ${dryRun})`);

    const startTime = Date.now();
    const results = {
      inactiveExecutions: 0,
      expiredKeys: 0,
      totalCleaned: 0,
      errors: [] as string[],
      duration: 0,
    };

    // 1. 清理非活跃的批量执行状态
    try {
      if (!dryRun) {
        results.inactiveExecutions =
          await batchExecutionCache.cleanupInactiveExecutions();
      } else {
        // 预览模式：统计但不删除
        const activeIds = await batchExecutionCache.getActiveExecutions();
        let inactiveCount = 0;

        for (const executionId of activeIds) {
          const execution = await batchExecutionCache.getExecution(executionId);
          if (!execution || !execution.isActive) {
            inactiveCount++;
          }
        }
        results.inactiveExecutions = inactiveCount;
      }
    } catch (error) {
      const errorMsg = `清理非活跃执行失败: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      results.errors.push(errorMsg);
      console.error(`[维护任务] ${errorMsg}`);
    }

    // 2. 清理过期的Redis键
    try {
      // 获取所有批量执行相关的键
      const pattern = "batch_execution:*";
      const keys = await redis.keys(pattern);

      let expiredCount = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);

        // TTL < 0 表示键已过期或没有设置过期时间
        // TTL === -1 表示键存在但没有过期时间
        // TTL === -2 表示键不存在
        if (ttl === -2) {
          // 键已过期或不存在
          expiredCount++;
          continue;
        }

        if (force && ttl === -1) {
          // 强制模式：清理没有过期时间的键
          if (!dryRun) {
            await redis.del(key);
          }
          expiredCount++;
        }
      }

      results.expiredKeys = expiredCount;
    } catch (error) {
      const errorMsg = `清理过期键失败: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      results.errors.push(errorMsg);
      console.error(`[维护任务] ${errorMsg}`);
    }

    // 3. 内存优化（仅在强制模式下）
    if (force && !dryRun) {
      try {
        // 注意：Upstash Redis 不支持 MEMORY PURGE 命令
        // 这个操作会被跳过
        console.log("[维护任务] Upstash Redis 不支持内存优化命令，跳过此步骤");
      } catch (error) {
        const errorMsg = `内存优化失败: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        results.errors.push(errorMsg);
        console.error(`[维护任务] ${errorMsg}`);
      }
    }

    results.totalCleaned = results.inactiveExecutions + results.expiredKeys;
    results.duration = Date.now() - startTime;

    const message = dryRun
      ? `预览清理结果: 将清理 ${results.totalCleaned} 项数据`
      : `清理完成: 共清理 ${results.totalCleaned} 项数据`;

    console.log(`[维护任务] ${message} (耗时: ${results.duration}ms)`);

    return NextResponse.json({
      success: true,
      message,
      results,
      mode: dryRun ? "preview" : "execute",
      force,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[维护任务] 清理任务执行失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Cleanup task failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取清理任务状态和统计信息
 */
export async function GET() {
  try {
    const stats = await batchExecutionCache.getExecutionStats();
    const activeExecutions = await batchExecutionCache.getActiveExecutions();

    // 注意：Upstash Redis 不支持 INFO 命令
    // 使用简化的统计信息
    const totalKeys = await redis.dbsize();
    console.log("[维护任务] 从 Upstash Redis 获取简化统计信息");

    // Upstash Redis 简化统计信息
    const memoryUsed = 0; // Upstash 不提供内存统计
    const memoryPeak = 0;
    const memoryRss = 0;
    const keysWithExpiry = 0; // 无法获取带过期时间的键数量
    const avgTtl = 0;

    return NextResponse.json({
      success: true,
      stats: {
        batchExecutions: {
          active: stats.activeCount,
          total: stats.totalExecutions,
          activeIds: activeExecutions.length,
        },
        redis: {
          memoryUsed,
          memoryPeak,
          memoryRss,
          totalKeys,
          keysWithExpiry,
          avgTtl,
        },
        connectionStatus: true, // Upstash Redis 总是连接状态
      },
      recommendations: generateCleanupRecommendations(
        {
          activeExecutions: stats.activeCount,
          totalKeys: stats.totalExecutions,
          memoryUsage: parseInt(memoryUsed || "0"),
        },
        {
          memoryUsed: parseInt(memoryUsed || "0"),
          totalKeys,
          activeExecutions: stats.activeCount,
        }
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[维护任务] 获取状态失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get cleanup status",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * 生成清理建议
 */
function generateCleanupRecommendations(
  cacheStats: {
    activeExecutions: number;
    totalKeys: number;
    memoryUsage: number;
  },
  redisStats: {
    memoryUsed: number;
    totalKeys: number;
    activeExecutions: number;
  }
): string[] {
  const recommendations: string[] = [];

  // 内存使用建议
  if (redisStats.memoryUsed > 100 * 1024 * 1024) {
    // 100MB
    recommendations.push("Redis内存使用较高，建议执行清理任务");
  }

  // 键数量建议
  if (redisStats.totalKeys > 1000) {
    recommendations.push("Redis中存储的键数量较多，建议清理过期数据");
  }

  // 活跃执行建议
  if (redisStats.activeExecutions === 0 && cacheStats.totalKeys > 0) {
    recommendations.push("当前没有活跃的批量执行，可以安全清理所有缓存数据");
  }

  // 长期运行建议
  if (cacheStats.totalKeys > 50) {
    recommendations.push("建议定期运行清理任务以保持最佳性能");
  }

  if (recommendations.length === 0) {
    recommendations.push("当前系统状态良好，无需特殊清理操作");
  }

  return recommendations;
}
