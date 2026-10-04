import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mergeCollection, migrateCollectionNames } from "./migrate-collection-names";

/** Against a throwaway MongoDB only (MONGODB_TEST_URI); see run-check-store.integration.test.ts. */
const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("collection renames (MongoDB)", () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = await MongoClient.connect(uri!);
    db = client.db(`assay_it_${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (db?.databaseName.startsWith("assay_it_")) await db.dropDatabase();
    await client?.close();
  });

  it("merges old-only documents of mixed id types, then drops the old collection", async () => {
    const ids: (ObjectId | string)[] = [...Array.from({ length: 700 }, () => new ObjectId()), ...Array.from({ length: 300 }, (_, i) => `s${i}`)];
    await db.collection("old_runs").insertMany(ids.map((_id, i) => ({ _id: _id as ObjectId, i })));
    await db.collection("new_runs").insertMany(ids.filter((_, i) => i % 3 === 0).map((_id) => ({ _id: _id as ObjectId, kept: true })));

    expect(await mergeCollection(db, "old_runs", "new_runs", { apply: false, dropOld: false })).toMatchObject({ missing: 666, complete: false });
    const merged = await mergeCollection(db, "old_runs", "new_runs", { apply: true, dropOld: true });
    expect(merged).toEqual({ missing: 666, copied: 666, complete: true, droppedOld: true });
    expect(await db.collection("new_runs").countDocuments()).toBe(1000);
    expect(await db.collection("new_runs").countDocuments({ kept: true })).toBe(334);
  });

  it("moves an empty old collection aside, keeping anything written to it", async () => {
    await db.createCollection("sql_scripts");
    await db.collection("checks").insertOne({ scriptId: "a" });
    const [result] = await migrateCollectionNames(db, [["sql_scripts", "checks"]]);
    expect(result?.outcome).toBe("moved-empty-old-aside");
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    expect(names).toContain(result?.aside);
    expect(names).not.toContain("sql_scripts");
  });
});
