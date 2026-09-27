import type { Db, Document } from "mongodb";
import { clearScriptsCache } from "@/lib/cache/cache-utils";
import { versionFilter } from "@/lib/workflows/check-fields";
import { recordEditHistoryOnServer } from "@/lib/workflows/edit-history-store";
import { createScriptVersion } from "@/lib/workflows/version-control";

/** Who is making the change, from the session or the approved request. */
export interface CheckActor {
  id: string;
  email: string;
}

type VersionBump = "major" | "minor" | "patch";

/**
 * The one way a check is created, changed or deleted, whether directly or
 * after approval: the write, then its version record, edit history entry and
 * cache clear, so the two paths cannot drift apart.
 */

const checks = (db: Db) => db.collection("sql_scripts");
const historyActor = (actor: CheckActor) => ({ id: actor.id, email: actor.email, name: actor.email.split("@")[0] });

async function recordVersion(check: Document, actor: CheckActor, change: "create" | "update", note: string, bump: VersionBump) {
  await createScriptVersion(
    check.scriptId,
    {
      name: check.name,
      cnName: check.cnName,
      description: check.description,
      cnDescription: check.cnDescription,
      scope: check.scope,
      cnScope: check.cnScope,
      author: check.author,
      hashtags: check.hashtags,
      sqlContent: check.sqlContent,
    },
    actor.id,
    actor.email,
    change,
    note,
    bump,
  );
}

/** Inserts a fully formed check document (the unique scriptId index rejects duplicates). */
export async function createCheck(db: Db, doc: Document, actor: CheckActor, note: string, bump: VersionBump): Promise<string> {
  const { insertedId } = await checks(db).insertOne(doc);
  await recordVersion(doc, actor, "create", note, bump);
  await recordEditHistoryOnServer({ scriptId: doc.scriptId, operation: "create", newData: doc }, historyActor(actor));
  await clearScriptsCache();
  return String(insertedId);
}

export type UpdateResult = { kind: "updated"; check: Document } | { kind: "conflict" } | { kind: "missing" };

/**
 * Applies `fields` only onto `expectedVersion` (optimistic concurrency) and
 * bumps the version. `undefined` skips the version check, which only
 * approvals made before versions existed rely on.
 */
export async function updateCheck(
  db: Db,
  scriptId: string,
  fields: Document,
  expectedVersion: number | undefined,
  actor: CheckActor,
  note: string,
): Promise<UpdateResult> {
  const collection = checks(db);
  const before = await collection.findOne({ scriptId });
  if (!before) return { kind: "missing" };
  const result = await collection.updateOne(
    { scriptId, ...versionFilter(expectedVersion) },
    { $set: { ...fields, updatedBy: { id: actor.id, email: actor.email }, updatedAt: new Date() }, $inc: { version: 1 } },
  );
  if (result.matchedCount === 0) {
    return (await collection.countDocuments({ scriptId }, { limit: 1 })) ? { kind: "conflict" } : { kind: "missing" };
  }
  const after = (await collection.findOne({ scriptId }))!;
  await recordEditHistoryOnServer({ scriptId, operation: "update", oldData: before, newData: after }, historyActor(actor));
  await recordVersion(after, actor, "update", note, "patch");
  await clearScriptsCache();
  return { kind: "updated", check: after };
}

/** Deletes the check; false when it was already gone. */
export async function deleteCheck(db: Db, scriptId: string, actor: CheckActor): Promise<boolean> {
  const collection = checks(db);
  const before = await collection.findOne({ scriptId });
  if (!before) return false;
  const { deletedCount } = await collection.deleteOne({ scriptId });
  if (deletedCount === 0) return false;
  await recordEditHistoryOnServer({ scriptId, operation: "delete", oldData: before }, historyActor(actor));
  await clearScriptsCache();
  return true;
}
