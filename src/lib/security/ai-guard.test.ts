import { describe, expect, it } from "vitest";
import { AI_INPUT_LIMITS, consumeQuota, findOversizedField, type CounterStore } from "./ai-guard";

function memoryStore(): CounterStore & { expiries: Map<string, number> } {
  const counts = new Map<string, number>();
  const expiries = new Map<string, number>();
  return {
    expiries,
    async incr(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      expiries.set(key, seconds);
    },
  };
}

describe("findOversizedField", () => {
  it("accepts inputs within their limits", () => {
    expect(findOversizedField({ sql: "select 1", errorMessage: "x".repeat(AI_INPUT_LIMITS.errorMessage) })).toBeNull();
  });

  it("names the first field over its limit", () => {
    expect(findOversizedField({ prompt: "x".repeat(AI_INPUT_LIMITS.prompt + 1) })).toBe("prompt");
  });

  it("ignores non-string values, which the route validates itself", () => {
    expect(findOversizedField({ sql: 123 })).toBeNull();
  });
});

describe("consumeQuota", () => {
  const now = Date.UTC(2026, 8, 26, 10, 15);

  it("allows requests up to the limit and refuses the next one", async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) {
      expect((await consumeQuota(store, "user_1", now, 3)).allowed).toBe(true);
    }
    expect((await consumeQuota(store, "user_1", now, 3)).allowed).toBe(false);
  });

  it("counts each user separately", async () => {
    const store = memoryStore();
    await consumeQuota(store, "user_1", now, 1);
    expect((await consumeQuota(store, "user_2", now, 1)).allowed).toBe(true);
  });

  it("starts a fresh count in the next window and sets an expiry once", async () => {
    const store = memoryStore();
    await consumeQuota(store, "user_1", now, 1);
    await consumeQuota(store, "user_1", now, 1);
    expect(store.expiries.size).toBe(1);
    const nextHour = now + 60 * 60 * 1000;
    expect((await consumeQuota(store, "user_1", nextHour, 1)).allowed).toBe(true);
  });

  it("reports the seconds until the window resets", async () => {
    const { retryAfterSeconds } = await consumeQuota(memoryStore(), "user_1", now);
    expect(retryAfterSeconds).toBe(45 * 60);
  });
});
