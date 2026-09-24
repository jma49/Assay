import type { Db, IndexDescription } from "mongodb";

/** Indexes for the lookups every request makes; createIndexes is a no-op when they exist. */
export const INDEXES: Record<string, IndexDescription[]> = {
  user_roles: [{ key: { userId: 1 }, unique: true }],
  sql_scripts: [{ key: { scriptId: 1 }, unique: true }, { key: { createdAt: -1 } }],
  result: [{ key: { execution_time: -1 } }, { key: { script_name: 1, execution_time: -1 } }],
  approval_requests: [{ key: { requestId: 1 }, unique: true }, { key: { status: 1, requestedAt: -1 } }],
  edit_history: [{ key: { operationTime: -1 } }, { key: { "scriptSnapshot.scriptId": 1, operationTime: -1 } }],
  script_versions: [{ key: { scriptId: 1, createdAt: -1 } }],
};

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all(
    Object.entries(INDEXES).map(async ([collection, indexes]) => {
      try {
        await db.collection(collection).createIndexes(indexes);
      } catch (error) {
        // A failed index (e.g. duplicates blocking a unique one) must not take the app down.
        console.error(`[MongoDB] Could not create indexes on ${collection}:`, error);
      }
    }),
  );
}
