import redis from "./redis";

/**
 * Read-through cache on Redis: returns the cached value, or loads it and
 * caches it for ttlSeconds. A Redis failure only costs the cache; the value
 * is still loaded and returned.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (error) {
    console.error(`[Cache] Could not read ${key}:`, error);
  }
  const value = await load();
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`[Cache] Could not write ${key}:`, error);
  }
  return value;
}

/** A cache key from a prefix and parameters, the same whatever order the parameters come in. */
export function cacheKey(prefix: string, params: Record<string, string | number | boolean | null | undefined> = {}): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`);
  return parts.length ? `${prefix}:${parts.join("&")}` : prefix;
}
