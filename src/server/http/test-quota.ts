import redis from "@/lib/cache/redis";
import { consumeQuota } from "@/lib/security/ai-guard";
import { ApiError } from "./route";

/**
 * Connection tests reach out to hosts people type, so each caller gets a
 * few per minute. Without Redis the limit is skipped: the tests are
 * admin-only and each is bounded by its own timeouts.
 */
export async function limitConnectionTests(userId: string, perMinute = 6): Promise<void> {
  const quota = await consumeQuota(redis, userId, Date.now(), perMinute, 60, "datasource-test").catch(() => ({ allowed: true }));
  if (!quota.allowed) throw new ApiError(429, "rate_limited", "Too many connection tests; try again in a minute");
}
