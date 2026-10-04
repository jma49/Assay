import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { ensureIndexes, INDEXES } from "./indexes";

const keys = (collection: string) => (INDEXES[collection] ?? []).map((index) => JSON.stringify(index.key));

describe("INDEXES", () => {
  it("covers the lookups sign-in makes on every request", () => {
    expect(keys("session")).toContain(JSON.stringify({ token: 1 }));
    expect(keys("apikey")).toContain(JSON.stringify({ key: 1 }));
    expect(INDEXES.user.find((i) => "email" in i.key)?.unique).toBe(true);
    expect(INDEXES.account.find((i) => "providerId" in i.key)?.unique).toBe(true);
  });

  it("expires what should not be kept", () => {
    for (const [collection, field] of [["session", "expiresAt"], ["verification", "expiresAt"], ["runs", "expiresAt"], ["batches", "startedAt"]]) {
      const ttl = INDEXES[collection]?.find((i) => field in i.key);
      expect(ttl?.expireAfterSeconds, `${collection}.${field}`).toBeTypeOf("number");
    }
  });

  it("expires deliveries 30 days after their last change, never counting from creation", () => {
    const ttls = INDEXES.notification_deliveries.filter((i) => i.expireAfterSeconds !== undefined);
    expect(ttls).toEqual([{ key: { updatedAt: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 }]);
  });
});

describe("ensureIndexes", () => {
  function fakeDb(dropIndex: (name: string) => Promise<unknown>) {
    const calls: string[] = [];
    const db = {
      collection: (collection: string) => ({
        dropIndex: vi.fn(async (name: string) => {
          calls.push(`drop ${collection}.${name}`);
          return dropIndex(name);
        }),
        createIndexes: vi.fn(async () => {
          calls.push(`create ${collection}`);
        }),
      }),
    } as unknown as Db;
    return { db, calls };
  }

  it("drops the createdAt TTL on deliveries before creating its replacement", async () => {
    const { db, calls } = fakeDb(async () => ({}));
    await ensureIndexes(db, ["notification_deliveries"]);
    expect(calls).toEqual(["drop notification_deliveries.createdAt_1", "create notification_deliveries"]);
  });

  it("goes on when the old index or the collection does not exist", async () => {
    for (const code of [26, 27]) {
      const { db, calls } = fakeDb(async () => Promise.reject(Object.assign(new Error("missing"), { code })));
      await ensureIndexes(db, ["notification_deliveries"]);
      expect(calls).toContain("create notification_deliveries");
    }
  });

  it("logs any other drop failure and still creates the replacement", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, calls } = fakeDb(async () => Promise.reject(Object.assign(new Error("not authorized"), { code: 13 })));
    await expect(ensureIndexes(db, ["notification_deliveries"])).resolves.toBeUndefined();
    expect(calls).toContain("create notification_deliveries");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("drops nothing on collections without a replaced index", async () => {
    const { db, calls } = fakeDb(async () => ({}));
    await ensureIndexes(db, ["runs"]);
    expect(calls).toEqual(["create runs"]);
  });
});
