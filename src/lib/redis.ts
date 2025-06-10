import { Redis } from "@upstash/redis";

/**
 * Upstash Redis 客户端配置
 * 专为 Serverless 环境优化的无状态 HTTP 连接
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * 测试 Redis 连接可用性
 * 通过 PING 命令验证连接状态
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    console.error("[Redis] 连接测试失败:", error);
    return false;
  }
}

// 导出默认的 Redis 客户端实例
export default redis;
