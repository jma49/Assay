import type { Db, Document } from "mongodb";
import { versionFilter } from "@/lib/workflows/check-fields";
import { recordEditHistoryOnServer } from "@/lib/workflows/edit-history-store";
import { createScriptVersion } from "@/lib/workflows/version-control";
import { COLLECTIONS } from "@/lib/database/collections";
import { emailLocalPart } from "@/lib/utils/email";

/** Who is making the change, from the session or the approved request. */
export interface CheckActor {
  id: string;
  email: string;
}

/** The actor as it is recorded: only the caller's id and email, never the rest of the session. */
export const actorOf = ({ id, email }: { id: string; email: string }): CheckActor => ({ id, email });

type VersionBump = "major" | "minor" | "patch";

/**
 * The one way a check is created, changed or deleted, whether directly or
 * after approval: the write, then its version record and edit history entry,
 * so the two paths cannot drift apart.
 */

const checks = (db: Db) => db.collection(COLLECTIONS.checks);
const historyActor = (actor: CheckActor) => ({ id: actor.id, email: actor.email, name: emailLocalPart(actor.email) });

async function recordVersion(db: Db, check: Document, actor: CheckActor, change: "create" | "update", note: string, bump: VersionBump) {
  await createScriptVersion(
    db,
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
      dataSourceId: check.dataSourceId,
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
  await recordVersion(db, doc, actor, "create", note, bump);
  await recordEditHistoryOnServer({ scriptId: doc.scriptId, operation: "create", newData: doc }, historyActor(actor));
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
  const set = { ...fields, updatedBy: { id: actor.id, email: actor.email }, updatedAt: new Date() };
  // The document exactly as this update found it, so the history's before
  // and after cannot pick up another save that landed in between.
  const before = await collection.findOneAndUpdate(
    { scriptId, ...versionFilter(expectedVersion) },
    { $set: set, $inc: { version: 1 } },
    { returnDocument: "before" },
  );
  if (!before) {
    return (await collection.countDocuments({ scriptId }, { limit: 1 })) ? { kind: "conflict" } : { kind: "missing" };
  }
  const after: Document = { ...before, ...set, version: (typeof before.version === "number" ? before.version : 0) + 1 };
  await recordEditHistoryOnServer({ scriptId, operation: "update", oldData: before, newData: after }, historyActor(actor));
  await recordVersion(db, after, actor, "update", note, "patch");
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
  return true;
}
