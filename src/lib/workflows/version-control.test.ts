import { describe, expect, it, vi } from "vitest";
import type { Db, Document } from "mongodb";
import { createScriptVersion } from "./version-control";

const CHECK = { name: "Orders", author: "ada", sqlContent: "SELECT 1" };

/**
 * script_versions and checks as fakes. `latest` is what the newest-version
 * read returns on each attempt; `insertErrors` fail the inserts in turn.
 */
function fakeDb({ latest = [null], insertErrors = [], higherExists = false }: { latest?: (Document | null)[]; insertErrors?: unknown[]; higherExists?: boolean }) {
  const inserted: Document[] = [];
  let reads = 0;
  let inserts = 0;
  const versions = {
    findOne: vi.fn(async () => latest[Math.min(reads++, latest.length - 1)]),
    insertOne: vi.fn(async (doc: Document) => {
      const error = insertErrors[inserts++];
      if (error) throw error;
      inserted.push(doc);
    }),
    updateMany: vi.fn(async () => ({})),
    countDocuments: vi.fn(async () => (higherExists ? 1 : 0)),
    updateOne: vi.fn(async () => ({})),
  };
  const checks = { updateOne: vi.fn(async () => ({})) };
  const db = { collection: (name: string) => (name === "checks" ? checks : versions) } as unknown as Db;
  return { db, versions, checks, inserted };
}

describe("createScriptVersion", () => {
  it("starts at 1.0.0 and makes it the check's current version", async () => {
    const { db, inserted, checks } = fakeDb({});
    const versionId = await createScriptVersion(db, "orders", CHECK, "u_ada", "ada@example.com", "create", "Created", "major");
    expect(inserted[0]).toMatchObject({ versionId, version: "1.0.0", majorVersion: 1, isCurrentVersion: true, status: "active", changeType: "create" });
    expect(checks.updateOne).toHaveBeenCalledWith(
      { scriptId: "orders", $or: [{ currentVersionOrder: { $exists: false } }, { currentVersionOrder: { $lt: 1e10 } }] },
      { $set: { currentVersionId: versionId, currentVersion: "1.0.0", currentVersionOrder: 1e10 } },
    );
  });

  it("bumps the patch, minor or major number of the latest version", async () => {
    for (const [bump, expected] of [["patch", "1.2.4"], ["minor", "1.3.0"], ["major", "2.0.0"]] as const) {
      const { db, inserted } = fakeDb({ latest: [{ version: "1.2.3", versionId: "ver_prev" }] });
      await createScriptVersion(db, "orders", CHECK, "u_ada", "ada@example.com", "update", undefined, bump);
      expect(inserted[0]).toMatchObject({ version: expected, previousVersionId: "ver_prev" });
    }
  });

  it("retries with the next number when a concurrent save took this one", async () => {
    const { db, inserted, versions } = fakeDb({
      latest: [{ version: "1.0.0", versionId: "a" }, { version: "1.0.1", versionId: "b" }],
      insertErrors: [{ code: 11000 }],
    });
    await createScriptVersion(db, "orders", CHECK, "u_ada", "ada@example.com", "update");
    expect(versions.insertOne).toHaveBeenCalledTimes(2);
    expect(inserted.map((v) => v.version)).toEqual(["1.0.2"]);
  });

  it("archives its own version and leaves the check alone when a higher one already exists", async () => {
    const { db, inserted, versions, checks } = fakeDb({ higherExists: true });
    const versionId = await createScriptVersion(db, "orders", CHECK, "u_ada", "ada@example.com");
    expect(inserted).toHaveLength(1);
    expect(versions.updateOne).toHaveBeenCalledWith({ versionId }, { $set: { isCurrentVersion: false, status: "archived" } });
    expect(checks.updateOne).not.toHaveBeenCalled();
  });

  it("answers null instead of throwing when the write fails for another reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { db } = fakeDb({ insertErrors: [new Error("disk full")] });
    expect(await createScriptVersion(db, "orders", CHECK, "u_ada", "ada@example.com")).toBeNull();
  });
});
