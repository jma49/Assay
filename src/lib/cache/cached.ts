import redis from "./redis";

/**
 * Read-through cache on Redis: returns the cached value, or loads it and
 * caches it for ttlSeconds. A Redis failure only costs the cache; the value
 * is still loaded and returned.
 *
 * With `generationKey`, the entry is stored under the counter's current
 * value, and invalidating means incrementing the counter. A reader that
 * loaded before an invalidation then writes to the old generation, which no
 * later reader looks at, instead of putting stale data back for the full TTL.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
  options: { generationKey?: string } = {},
): Promise<T> {
  let entryKey: string | null = options.generationKey ? null : key;
  try {
    if (options.generationKey) entryKey = `${key}@${(await redis.get<number>(options.generationKey)) ?? 0}`;
    const hit = await redis.get<T>(entryKey ?? key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (error) {
    console.error(`[Cache] Could not read ${key}:`, error);
  }
  const value = await load();
  // Without a known generation, a write could not be told apart from a stale one.
  if (entryKey === null) return value;
  try {
    await redis.setex(entryKey, ttlSeconds, JSON.stringify(value));
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
