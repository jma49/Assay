import { NextResponse } from "next/server";
import redis, { testRedisConnection } from "@/lib/redis";
import batchExecutionCache from "@/services/batch-execution-cache";

/**
 * GET - Redis健康检查接口
 * 检测Redis连接状态、响应时间和缓存统计信息
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const isConnected = await testRedisConnection();
    const responseTime = Date.now() - startTime;

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          status: "disconnected",
          message: "Redis连接不可用",
          responseTime,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const stats = await batchExecutionCache.getExecutionStats();

    return NextResponse.json({
      success: true,
      status: "connected",
      message: "Redis服务正常",
      responseTime,
      connectionStatus: true, // Upstash Redis 总是连接状态
      stats: {
        activeExecutions: stats.activeCount,
        totalKeys: stats.totalExecutions,
        memoryUsage: 0, // getExecutionStats不返回内存使用情况
        memoryUsageFormatted: "N/A",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("[Redis健康检查] 检查失败:", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: error instanceof Error ? error.message : "未知错误",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Redis操作功能测试
 * 执行完整的读写删除操作测试，验证数据一致性
 */
export async function POST() {
  const startTime = Date.now();

  try {
    const testKey = `health_check_${Date.now()}`;
    const testValue = { test: true, timestamp: new Date().toISOString() };

    // 写入测试
    await redis.setex(testKey, 60, JSON.stringify(testValue));

    // 读取测试
    const retrieved = await redis.get(testKey);
    if (!retrieved) {
      throw new Error("读取测试失败：数据为空");
    }
    const parsedValue = JSON.parse(String(retrieved));

    // 删除测试
    await redis.del(testKey);

    const responseTime = Date.now() - startTime;

    // 数据一致性验证
    const isDataConsistent =
      parsedValue.test === testValue.test &&
      parsedValue.timestamp === testValue.timestamp;

    if (!isDataConsistent) {
      throw new Error("数据一致性检查失败");
    }

    return NextResponse.json({
      success: true,
      status: "operational",
      message: "Redis读写操作正常",
      responseTime,
      operations: {
        write: "success",
        read: "success",
        delete: "success",
        dataConsistency: "verified",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("[Redis操作测试] 测试失败:", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: error instanceof Error ? error.message : "未知错误",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
