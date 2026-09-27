import redis from "./redis";

const SCRIPTS_CACHE_KEY = "scripts:list";

/**
 * Drops every cached checks list. The list is cached per sort and filter
 * (scripts:list:<params>), so each variant is found by prefix and deleted.
 */
export async function clearScriptsCache(): Promise<void> {
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
