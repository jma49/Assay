import { beforeEach, describe, expect, it, vi } from "vitest";

// Mimics Upstash: values are stored as strings and JSON is parsed on read.
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("./redis", () => ({
  default: {
    get: vi.fn(async (key: string) => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return "OK";
    }),
  },
}));

import { cached, cacheKey } from "./cached";

describe("cached", () => {
  beforeEach(() => store.clear());

  it("serves the second read from the cache", async () => {
    const fetchFn = vi.fn(async () => [{ name: "Duplicate orders" }]);

    await cached("scripts:list", 600, fetchFn);
    const second = await cached("scripts:list", 600, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(second).toEqual([{ name: "Duplicate orders" }]);
  });

  it("keeps spaces inside cached strings", async () => {
    await cached("k", 600, async () => ({ name: "Paid orders without a payment" }));
    const hit = await cached("k", 600, async () => ({ name: "unused" }));

    expect(hit).toEqual({ name: "Paid orders without a payment" });
  });
});

describe("cacheKey", () => {
  it("is the same whatever order the parameters come in, and skips empty ones", () => {
    expect(cacheKey("scripts:list", { b: 2, a: "x", c: undefined })).toBe(cacheKey("scripts:list", { a: "x", b: 2 }));
    expect(cacheKey("scripts:list", { a: "x", b: 2 })).toBe("scripts:list:a:x&b:2");
    expect(cacheKey("p")).toBe("p");
  });
});

it("still loads when Redis fails", async () => {
  const redis = (await import("./redis")).default as unknown as { get: ReturnType<typeof vi.fn> };
  redis.get.mockRejectedValueOnce(new Error("down"));
  expect(await cached("x", 10, async () => 42)).toBe(42);
});
