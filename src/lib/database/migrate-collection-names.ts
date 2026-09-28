import type { Db } from "mongodb";
import { COLLECTIONS } from "./collections";

/** Collections that were renamed, as [old name, new name]. */
export const RENAMED_COLLECTIONS: readonly (readonly [string, string])[] = [
  ["sql_scripts", COLLECTIONS.checks],
  ["result", COLLECTIONS.runs],
];

export type RenameOutcome =
  | "renamed" // old moved to new
  | "already-done" // only new exists
  | "nothing" // neither exists (a new deployment)
  | "dropped-empty-old" // both existed and old was empty, so it was dropped
  | "both-exist"; // both hold documents; left alone for the migration script

export interface RenameResult {
  from: string;
  to: string;
  outcome: RenameOutcome;
  counts?: { old: number; new: number };
}

const NAMESPACE_NOT_FOUND = 26;
const NAMESPACE_EXISTS = 48;

async function exists(db: Db, name: string): Promise<boolean> {
  return (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;
}

/**
 * Moves collections from their old names to the new ones. renameCollection
 * is atomic and keeps the documents and indexes. Instances starting at the
 * same time may race; a rename that fails because another one already moved
 * the collection is fine. When both names hold documents nothing is merged
 * automatically (an old build may have written after a rollback): it warns
 * and leaves `scripts/migrations/rename-collections.ts --merge` to the owner.
 * An empty old collection next to the new one is dropped, since it holds
 * nothing and would otherwise warn forever.
 */
export async function migrateCollectionNames(db: Db, pairs = RENAMED_COLLECTIONS): Promise<RenameResult[]> {
  const results: RenameResult[] = [];
  for (const [from, to] of pairs) {
    const [oldExists, newExists] = await Promise.all([exists(db, from), exists(db, to)]);
    if (!oldExists) {
      results.push({ from, to, outcome: newExists ? "already-done" : "nothing" });
      continue;
    }
    if (!newExists) {
      results.push({ from, to, outcome: await rename(db, from, to) });
      continue;
    }
    const [oldCount, newCount] = await Promise.all([db.collection(from).countDocuments(), db.collection(to).countDocuments()]);
    if (oldCount === 0) {
      await db.collection(from).drop().catch((error: { code?: number }) => {
        if (error.code !== NAMESPACE_NOT_FOUND) throw error;
      });
      results.push({ from, to, outcome: "dropped-empty-old", counts: { old: 0, new: newCount } });
      continue;
    }
    console.warn(
      `[MongoDB] Both "${from}" (${oldCount} documents) and "${to}" (${newCount} documents) exist; the app uses "${to}". ` +
        `Merge them with: npm run migrate:collections -- --merge --apply`,
    );
    results.push({ from, to, outcome: "both-exist", counts: { old: oldCount, new: newCount } });
  }
  return results;
}

async function rename(db: Db, from: string, to: string): Promise<RenameOutcome> {
  try {
    await db.renameCollection(from, to);
    return "renamed";
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== NAMESPACE_NOT_FOUND && code !== NAMESPACE_EXISTS) throw error;
    // Another instance got there first; fine as long as the move is complete.
    const [oldExists, newExists] = await Promise.all([exists(db, from), exists(db, to)]);
    if (newExists && !oldExists) return "already-done";
    throw error;
  }
}
