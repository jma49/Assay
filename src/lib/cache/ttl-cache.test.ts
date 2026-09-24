import { describe, expect, it } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  it("returns values until they expire", () => {
    let now = 0;
    const cache = new TtlCache<string>(100, 10, () => now);
    cache.set("a", "x");

    now = 99;
    expect(cache.get("a")).toBe("x");
    now = 100;
    expect(cache.get("a")).toBeUndefined();
  });

  it("drops a key on delete", () => {
    const cache = new TtlCache<number>(1000);
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the oldest entry when full", () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});
