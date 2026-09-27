import redis from "./redis";

const SCRIPTS_CACHE_KEY = "scripts:list";

/**
 * The checks list's cache generation (see `cached`). Deliberately outside
 * the scripts:list prefix, so clearing the lists never deletes the counter.
 */
export const SCRIPTS_CACHE_GENERATION_KEY = "scripts:generation";

/**
 * Invalidates every cached checks list. Bumping the generation is what makes
 * the old lists unreachable, even one a slow reader writes back afterwards;
 * the lists (scripts:list:<params>) are then deleted by prefix to free them.
 */
export async function clearScriptsCache(): Promise<void> {
  try {
    await redis.incr(SCRIPTS_CACHE_GENERATION_KEY);
  } catch (error) {
    console.error("[Cache] Could not bump the checks list generation:", error);
  }
  try {
    let cursor: string | number = 0;
    do {
      const [next, keys]: [string | number, string[]] = await redis.scan(cursor, { match: `${SCRIPTS_CACHE_KEY}*`, count: 100 });
      if (keys.length) await redis.del(...keys);
      cursor = next;
    } while (String(cursor) !== "0");
  } catch (error) {
    console.error("[Cache] Could not clear the checks list cache:", error);
  }
}
