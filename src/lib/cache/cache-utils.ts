import redis from "@/lib/cache/redis";

// Redis 缓存键常量
const SCRIPTS_CACHE_KEY = "scripts:list";
const CHECK_HISTORY_STATS_KEY = "check_history:stats";
const CHECK_HISTORY_QUERY_PREFIX = "check_history:query:";

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

/**
 * 缓存Check History统计数据
 */
export async function cacheCheckHistoryStats(stats: {
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
  totalCount: number;
}): Promise<void> {
  try {
    await redis.setex(CHECK_HISTORY_STATS_KEY, 300, JSON.stringify(stats)); // 缓存5分钟
    console.log("[Cache] Check History统计数据已缓存");
  } catch (error) {
    console.error("[Cache] 缓存统计数据失败:", error);
  }
}

/**
 * 获取缓存的Check History统计数据
 */
export async function getCachedCheckHistoryStats(): Promise<{
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
  totalCount: number;
} | null> {
  try {
    const cached = await redis.get(CHECK_HISTORY_STATS_KEY);
    return cached ? JSON.parse(cached as string) : null;
  } catch (error) {
    console.error("[Cache] 获取缓存统计数据失败:", error);
    return null;
  }
}

/**
 * 生成查询缓存键
 */
function generateQueryCacheKey(params: {
  page: number;
  limit: number;
  status?: string;
  scriptName?: string;
  hashtags?: string[];
  sortBy?: string;
  sortOrder?: string;
}): string {
  const key = JSON.stringify(params);
  return `${CHECK_HISTORY_QUERY_PREFIX}${Buffer.from(key).toString("base64")}`;
}

/**
 * 缓存查询结果
 */
export async function cacheCheckHistoryQuery(
  params: {
    page: number;
    limit: number;
    status?: string;
    scriptName?: string;
    hashtags?: string[];
    sortBy?: string;
    sortOrder?: string;
  },
  result: unknown
): Promise<void> {
  try {
    const cacheKey = generateQueryCacheKey(params);
    // 只缓存前3页的结果，缓存2分钟
    if (params.page <= 3) {
      await redis.setex(cacheKey, 120, JSON.stringify(result));
      console.log(`[Cache] 查询结果已缓存: page ${params.page}`);
    }
  } catch (error) {
    console.error("[Cache] 缓存查询结果失败:", error);
  }
}

/**
 * 获取缓存的查询结果
 */
export async function getCachedCheckHistoryQuery(params: {
  page: number;
  limit: number;
  status?: string;
  scriptName?: string;
  hashtags?: string[];
  sortBy?: string;
  sortOrder?: string;
}): Promise<unknown | null> {
  try {
    const cacheKey = generateQueryCacheKey(params);
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached as string) : null;
  } catch (error) {
    console.error("[Cache] 获取缓存查询结果失败:", error);
    return null;
  }
}

/**
 * 清除Check History相关缓存
 */
export async function clearCheckHistoryCache(): Promise<void> {
  try {
    // 清除统计数据缓存
    await redis.del(CHECK_HISTORY_STATS_KEY);

    // 清除查询结果缓存
    const pattern = `${CHECK_HISTORY_QUERY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    console.log("[Cache] Check History缓存已清除");
  } catch (error) {
    console.error("[Cache] 清除Check History缓存失败:", error);
  }
}
