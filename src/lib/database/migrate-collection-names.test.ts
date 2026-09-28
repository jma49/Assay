import { afterEach, describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { migrateCollectionNames } from "./migrate-collection-names";

/** An in-memory stand-in: collection name → document count. */
function fakeDb(initial: Record<string, number>, options: { renameFails?: (from: string, to: string, db: Record<string, number>) => Error | null } = {}) {
  const collections = { ...initial };
  const renames: [string, string][] = [];
  const drops: string[] = [];
  const db = {
    listCollections: ({ name }: { name: string }) => ({ toArray: async () => (name in collections ? [{ name }] : []) }),
    collection: (name: string) => ({
      countDocuments: async () => collections[name] ?? 0,
      drop: async () => {
        drops.push(name);
        delete collections[name];
        return true;
      },
    }),
    renameCollection: async (from: string, to: string) => {
      const failure = options.renameFails?.(from, to, collections);
      if (failure) throw failure;
      renames.push([from, to]);
      collections[to] = collections[from];
      delete collections[from];
    },
  } as unknown as Db;
  return { db, collections, renames, drops };
}

const PAIRS = [["sql_scripts", "checks"], ["result", "runs"]] as const;
const withCode = (code: number) => Object.assign(new Error(`code ${code}`), { code });

describe("migrateCollectionNames", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renames old collections when the new names are free", async () => {
    const { db, collections, renames } = fakeDb({ sql_scripts: 5, result: 40, events: 3 });
    const results = await migrateCollectionNames(db, PAIRS);
    expect(results.map((r) => r.outcome)).toEqual(["renamed", "renamed"]);
    expect(renames).toEqual([["sql_scripts", "checks"], ["result", "runs"]]);
    expect(collections).toEqual({ checks: 5, runs: 40, events: 3 });
  });

  it("does nothing once renamed, or on a new deployment", async () => {
    const done = fakeDb({ checks: 5, runs: 40 });
    expect((await migrateCollectionNames(done.db, PAIRS)).map((r) => r.outcome)).toEqual(["already-done", "already-done"]);
    const fresh = fakeDb({});
    expect((await migrateCollectionNames(fresh.db, PAIRS)).map((r) => r.outcome)).toEqual(["nothing", "nothing"]);
    expect([...done.renames, ...fresh.renames]).toEqual([]);
  });

  it("treats a concurrent instance's completed rename as success", async () => {
    // The other instance renames between our existence check and our rename.
    const { db } = fakeDb(
      { sql_scripts: 5 },
      {
        renameFails: (from, to, state) => {
          state[to] = state[from];
          delete state[from];
          return withCode(26);
        },
      },
    );
    expect((await migrateCollectionNames(db, [["sql_scripts", "checks"]]))[0].outcome).toBe("already-done");
  });

  it("rethrows a rename failure that did not leave the move complete", async () => {
    const racing = fakeDb({ sql_scripts: 5 }, { renameFails: () => withCode(48) });
    await expect(migrateCollectionNames(racing.db, [["sql_scripts", "checks"]])).rejects.toThrow("code 48");
    const denied = fakeDb({ sql_scripts: 5 }, { renameFails: () => withCode(13) });
    await expect(migrateCollectionNames(denied.db, [["sql_scripts", "checks"]])).rejects.toThrow("code 13");
  });

  it("drops an empty old collection next to the new one", async () => {
    const { db, collections, drops } = fakeDb({ sql_scripts: 0, checks: 5 });
    const [result] = await migrateCollectionNames(db, [["sql_scripts", "checks"]]);
    expect(result).toMatchObject({ outcome: "dropped-empty-old", counts: { old: 0, new: 5 } });
    expect(drops).toEqual(["sql_scripts"]);
    expect(collections).toEqual({ checks: 5 });
  });

  it("leaves both alone and warns when both hold documents", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db, collections, renames, drops } = fakeDb({ result: 3, runs: 40 });
    const [result] = await migrateCollectionNames(db, [["result", "runs"]]);
    expect(result).toMatchObject({ outcome: "both-exist", counts: { old: 3, new: 40 } });
    expect(renames).toEqual([]);
    expect(drops).toEqual([]);
    expect(collections).toEqual({ result: 3, runs: 40 });
    expect(warn.mock.calls[0][0]).toContain("--merge");
  });
});
