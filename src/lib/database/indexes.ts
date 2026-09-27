import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "./collections";

/** Indexes for the lookups every request makes; createIndexes is a no-op when they exist. */
export const INDEXES: Record<string, IndexDescription[]> = {
  [COLLECTIONS.userRoles]: [{ key: { userId: 1 }, unique: true }],
  [COLLECTIONS.checks]: [{ key: { scriptId: 1 }, unique: true }, { key: { createdAt: -1 } }],
  // Runs are deleted at expiresAt (RUN_RETENTION_DAYS after they finished; see migrations/set-run-expiry.ts for older runs).
  [COLLECTIONS.runs]: [{ key: { finishedAt: -1 } }, { key: { checkId: 1, finishedAt: -1 } }, { key: { outcome: 1, finishedAt: -1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  [COLLECTIONS.approvalRequests]: [{ key: { requestId: 1 }, unique: true }, { key: { status: 1, requestedAt: -1 } }],
  [COLLECTIONS.editHistory]: [{ key: { operationTime: -1 } }, { key: { "scriptSnapshot.scriptId": 1, operationTime: -1 } }],
  // One record per version number; a concurrent second "1.0.5" fails instead of being stored twice.
  [COLLECTIONS.scriptVersions]: [{ key: { scriptId: 1, createdAt: -1 } }, { key: { scriptId: 1, version: 1 }, unique: true }],
  // One event per run at most, so retried runs never notify twice.
  [COLLECTIONS.events]: [{ key: { runId: 1 }, unique: true }, { key: { at: -1 } }, { key: { checkId: 1, at: -1 } }],
  [COLLECTIONS.checkActions]: [{ key: { checkId: 1, at: -1 } }],
  [COLLECTIONS.notificationDestinations]: [{ key: { workspaceId: 1, createdAt: 1 } }],
  // One delivery per event and destination, so fan-out can run anywhere, any number of times.
  [COLLECTIONS.notificationDeliveries]: [
    { key: { eventId: 1, destinationId: 1 }, unique: true },
    { key: { status: 1, nextAttemptAt: 1 } },
    { key: { destinationId: 1, sentAt: -1 } },
    { key: { createdAt: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 },
  ],
  // One row per problem and destination counts its reminders; old ones go after 30 days.
  [COLLECTIONS.notificationReminders]: [
    { key: { destinationId: 1, checkId: 1, since: 1 }, unique: true },
    { key: { lastAt: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 },
  ],
  // Sign-in (Better Auth, whose MongoDB adapter creates no indexes). Lookups by
  // session token and API key run on every request; uniqueness stops
  // concurrent first sign-ins from creating duplicate users or accounts;
  // expired sessions and verifications go away on their own.
  [COLLECTIONS.users]: [{ key: { email: 1 }, unique: true }],
  [COLLECTIONS.sessions]: [{ key: { token: 1 }, unique: true }, { key: { userId: 1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  [COLLECTIONS.accounts]: [{ key: { userId: 1 } }, { key: { providerId: 1, accountId: 1 }, unique: true }],
  [COLLECTIONS.verifications]: [{ key: { identifier: 1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  [COLLECTIONS.apiKeys]: [{ key: { key: 1 }, unique: true }, { key: { referenceId: 1 } }],
  // Pending Telegram links expire on their own.
  [COLLECTIONS.telegramLinks]: [{ key: { codeHash: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  // Batches only matter while someone watches their progress; keep a week.
  [COLLECTIONS.batches]: [{ key: { executionId: 1 }, unique: true }, { key: { startedAt: 1 }, expireAfterSeconds: 7 * 24 * 60 * 60 }],
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
