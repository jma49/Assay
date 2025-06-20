import redis from "@/lib/cache/redis";

// Redis 缓存键常量
const SCRIPTS_CACHE_KEY = "scripts:list";

/**
 * 清除脚本列表的 Redis 缓存
 * 供其他 API 路由调用，当脚本被创建、更新或删除时
 */
export async function clearScriptsCache(): Promise<void> {
  try {
    await redis.del(SCRIPTS_CACHE_KEY);
    console.log("[API] 脚本列表缓存已清除");
  } catch (error) {
    console.error("[API] 清除 Redis 缓存失败:", error);
  }
}
