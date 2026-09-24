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

import { withSmartCache } from "./cache-strategies";

describe("withSmartCache", () => {
  beforeEach(() => store.clear());

  it("serves the second read from the cache", async () => {
    const fetchFn = vi.fn(async () => [{ name: "Duplicate orders" }]);

    await withSmartCache("scripts:list", "SCRIPT_LIST", fetchFn);
    const second = await withSmartCache("scripts:list", "SCRIPT_LIST", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(second).toEqual([{ name: "Duplicate orders" }]);
  });

  it("keeps spaces inside cached strings", async () => {
    await withSmartCache("k", "SCRIPT_LIST", async () => ({ name: "Paid orders without a payment" }));
    const cached = await withSmartCache("k", "SCRIPT_LIST", async () => ({ name: "unused" }));

    expect(cached).toEqual({ name: "Paid orders without a payment" });
  });
});
