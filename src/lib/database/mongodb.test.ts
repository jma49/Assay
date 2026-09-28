import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const mocks = vi.hoisted(() => ({ migrate: vi.fn(), ensure: vi.fn() }));

vi.mock("./mongo-connection", () => ({
  mongoDatabaseName: () => "assay_test",
  sharedMongoClient: () => ({ connect: async () => ({ db: () => ({}) }) }),
  closeSharedMongoClient: async () => {},
}));
vi.mock("./migrate-collection-names", () => ({ migrateCollectionNames: mocks.migrate }));
vi.mock("./indexes", () => ({ ensureIndexes: mocks.ensure }));

import { getMongoDbClient } from "./mongodb";

describe("getDb", () => {
  beforeEach(async () => {
    calls.length = 0;
    mocks.migrate.mockReset();
    mocks.ensure.mockReset();
    mocks.ensure.mockImplementation(async () => void calls.push("indexes"));
    await getMongoDbClient().closeConnection();
  });

  it("renames collections before building indexes, once per process", async () => {
    mocks.migrate.mockImplementation(async () => (calls.push("rename"), []));
    await Promise.all([getMongoDbClient().getDb(), getMongoDbClient().getDb()]);
    await getMongoDbClient().getDb();
    expect(calls).toEqual(["rename", "indexes"]);
  });

  it("fails the call and retries next time when the rename fails, without building indexes", async () => {
    mocks.migrate.mockRejectedValueOnce(new Error("not authorized")).mockImplementation(async () => (calls.push("rename"), []));
    await expect(getMongoDbClient().getDb()).rejects.toThrow("not authorized");
    expect(calls).toEqual([]);
    await getMongoDbClient().getDb();
    expect(calls).toEqual(["rename", "indexes"]);
  });
});
