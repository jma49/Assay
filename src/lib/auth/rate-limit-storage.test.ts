import { describe, expect, it, vi } from "vitest";
import { redisRateLimitStorage, type CounterStore } from "./rate-limit-storage";

function memoryStore(): CounterStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>();
  return {
    counts,
    async countInWindow(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return { count: counts.get(key)!, ttl: 42 };
    },
  };
}

describe("redisRateLimitStorage", () => {
  it("allows up to max in a window, then says when to retry", async () => {
    const storage = redisRateLimitStorage(memoryStore());
    const rule = { window: 60, max: 3 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await storage.consume("1.2.3.4|/sign-in/social", rule));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.retryAfter).toBe(42);
  });

  it("namespaces keys and fails open when Redis is down", async () => {
    const store = memoryStore();
    await redisRateLimitStorage(store).consume("k", { window: 10, max: 1 });
    expect([...store.counts.keys()]).toEqual(["ratelimit:auth:k"]);
    const broken = redisRateLimitStorage({ countInWindow: vi.fn(async () => { throw new Error("down"); }) });
    expect(await broken.consume("k", { window: 10, max: 1 })).toEqual({ allowed: true, retryAfter: null });
  });
});
