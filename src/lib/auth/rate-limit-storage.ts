/**
 * Better Auth's rate limiter keeps counts in memory by default, which on
 * serverless is one count per instance: barely a limit. This stores them
 * in Redis so every instance shares them.
 */
export interface CounterStore {
  /** Runs SET NX EX, INCR and TTL on one key in one round trip. */
  countInWindow(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;
}

export function redisRateLimitStorage(store: CounterStore) {
  return {
    async consume(key: string, rule: { window: number; max: number }): Promise<{ allowed: boolean; retryAfter: number | null }> {
      try {
        const { count, ttl } = await store.countInWindow(`ratelimit:auth:${key}`, rule.window);
        if (count <= rule.max) return { allowed: true, retryAfter: null };
        return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
      } catch (error) {
        // Failing open: a Redis outage must not lock everyone out of signing in.
        console.error("[Auth] Rate limit storage failed:", error);
        return { allowed: true, retryAfter: null };
      }
    },
  };
}

/** The counter on Upstash Redis: the window starts with the first request and the key expires with it. */
export function upstashCounterStore(redis: {
  pipeline(): { set(key: string, value: number, opts: { nx: true; ex: number }): unknown; incr(key: string): unknown; ttl(key: string): unknown; exec(): Promise<unknown[]> };
}): CounterStore {
  return {
    async countInWindow(key, windowSeconds) {
      const pipe = redis.pipeline();
      pipe.set(key, 0, { nx: true, ex: windowSeconds });
      pipe.incr(key);
      pipe.ttl(key);
      const [, count, ttl] = (await pipe.exec()) as [unknown, number, number];
      return { count, ttl };
    },
  };
}
