import { randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COLLECTIONS } from "@/lib/database/collections";
import { ensureIndexes } from "@/lib/database/indexes";
import { createScriptVersion } from "./version-control";

/** Against a throwaway MongoDB only (MONGODB_TEST_URI); see run-check-store.integration.test.ts. */
const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("createScriptVersion (MongoDB)", () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = await MongoClient.connect(uri!);
    db = client.db(`assay_it_${randomUUID().slice(0, 8)}`);
    await ensureIndexes(db, [COLLECTIONS.scriptVersions, COLLECTIONS.checks]);
  });

  afterAll(async () => {
    if (db?.databaseName.startsWith("assay_it_")) await db.dropDatabase();
    await client?.close();
  });

  const data = { name: "Orders", author: "ann", sqlContent: "SELECT 1" };
  const save = (scriptId: string, bump: "major" | "minor" | "patch" = "patch") =>
    createScriptVersion(db, scriptId, data, "u1", "ann@example.com", "update", undefined, bump);

  it("gives every concurrent save its own version and keeps the highest one current", async () => {
    await db.collection(COLLECTIONS.checks).insertOne({ scriptId: "race" });
    const ids = await Promise.all(Array.from({ length: 8 }, () => save("race")));
    expect(ids.every(Boolean)).toBe(true);

    const versions = await db.collection(COLLECTIONS.scriptVersions).find({ scriptId: "race" }).toArray();
    expect(versions.map((v) => v.version).sort()).toEqual(["1.0.0", "1.0.1", "1.0.2", "1.0.3", "1.0.4", "1.0.5", "1.0.6", "1.0.7"]);
    const current = versions.filter((v) => v.isCurrentVersion);
    expect(current.map((v) => v.version)).toEqual(["1.0.7"]);
    expect((await db.collection(COLLECTIONS.checks).findOne({ scriptId: "race" }))?.currentVersion).toBe("1.0.7");
  });

  it("keeps the highest version current when bumps of different sizes race", async () => {
    await db.collection(COLLECTIONS.checks).insertOne({ scriptId: "mixed" });
    await save("mixed");
    await Promise.all([save("mixed", "minor"), save("mixed", "patch"), save("mixed", "major"), save("mixed", "patch")]);
    const versions = await db.collection(COLLECTIONS.scriptVersions).find({ scriptId: "mixed" }).toArray();
    expect(versions).toHaveLength(5);
    const highest = [...versions].sort((a, b) => b.majorVersion - a.majorVersion || b.minorVersion - a.minorVersion || b.patchVersion - a.patchVersion)[0];
    expect(versions.filter((v) => v.isCurrentVersion).map((v) => v.version)).toEqual([highest.version]);
    expect((await db.collection(COLLECTIONS.checks).findOne({ scriptId: "mixed" }))?.currentVersion).toBe(highest.version);
  });
});
