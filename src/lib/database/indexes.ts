import type { Db, IndexDescription } from "mongodb";
import { COLLECTIONS } from "./collections";
import { logError, logInfo } from "@/lib/logging/log";

const ACTIVITY_RETENTION_SECONDS = 180 * 24 * 60 * 60;
const DELIVERY_RETENTION_SECONDS = 30 * 24 * 60 * 60;

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
  // The activity feed and alert-control log keep half a year; the current
  // state lives on the check, so nothing depends on older entries. Edit
  // history, approvals and version records are kept as the audit trail.
  [COLLECTIONS.events]: [{ key: { runId: 1 }, unique: true }, { key: { at: 1 }, expireAfterSeconds: ACTIVITY_RETENTION_SECONDS }, { key: { checkId: 1, at: -1 } }],
  [COLLECTIONS.checkActions]: [{ key: { checkId: 1, at: -1 } }, { key: { at: 1 }, expireAfterSeconds: ACTIVITY_RETENTION_SECONDS }],
  [COLLECTIONS.notificationDestinations]: [{ key: { workspaceId: 1, createdAt: 1 } }],
  // Checks name their source by id, so an id is taken once per workspace.
  [COLLECTIONS.dataSources]: [{ key: { workspaceId: 1, sourceId: 1 }, unique: true }],
  // One delivery per event and destination, so fan-out can run anywhere, any number of times.
  // Every write stamps updatedAt, so a delivery goes 30 days after it last
  // changed: one still retrying is never deleted, and a dead letter stays
  // listed for 30 days after it failed or was requeued.
  [COLLECTIONS.notificationDeliveries]: [
    { key: { eventId: 1, destinationId: 1 }, unique: true },
    { key: { status: 1, nextAttemptAt: 1 } },
    { key: { destinationId: 1, sentAt: -1 } },
    { key: { updatedAt: 1 }, expireAfterSeconds: DELIVERY_RETENTION_SECONDS },
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
  // OAuth for MCP clients: every MCP request checks the consent, every
  // refresh looks up its token; expired refresh tokens go away on their own.
  [COLLECTIONS.oauthClients]: [{ key: { clientId: 1 }, unique: true }],
  [COLLECTIONS.oauthConsents]: [{ key: { userId: 1, clientId: 1 } }],
  [COLLECTIONS.oauthRefreshTokens]: [{ key: { token: 1 }, unique: true }, { key: { userId: 1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  [COLLECTIONS.oauthClientResources]: [{ key: { clientId: 1 } }],
  // Every instance seeds the MCP resource on start; uniqueness stops
  // concurrent cold starts from inserting it more than once.
  [COLLECTIONS.oauthResources]: [{ key: { identifier: 1 }, unique: true }],
  // Pending Telegram links expire on their own.
  [COLLECTIONS.telegramLinks]: [{ key: { codeHash: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
  // Batches only matter while someone watches their progress; keep a week.
  [COLLECTIONS.batches]: [{ key: { executionId: 1 }, unique: true }, { key: { startedAt: 1 }, expireAfterSeconds: 7 * 24 * 60 * 60 }],
};

/**
 * Indexes replaced by one in INDEXES, by name. MongoDB cannot change a TTL
 * index's key in place, and a leftover TTL index keeps deleting on its own
 * rule, so these are dropped before the replacement is created.
 */
const OBSOLETE_INDEXES: Record<string, string[]> = {
  // TTL on createdAt deleted deliveries still retrying; replaced by updatedAt_1 (issue #213).
  [COLLECTIONS.notificationDeliveries]: ["createdAt_1"],
};

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

async function dropObsoleteIndexes(db: Db, collection: string): Promise<void> {
  for (const name of OBSOLETE_INDEXES[collection] ?? []) {
    try {
      await db.collection(collection).dropIndex(name);
      logInfo(`[MongoDB] Dropped obsolete index ${collection}.${name}`);
    } catch (error) {
      const code = (error as { code?: number }).code;
      // Still create the replacement: two TTL indexes delete no later than the old one alone did.
      if (code !== INDEX_NOT_FOUND && code !== NAMESPACE_NOT_FOUND) logError(`[MongoDB] Could not drop index ${collection}.${name}`, { error });
    }
  }
}

/** Drops replaced indexes, then creates the indexes of every collection, or only of `only`. */
export async function ensureIndexes(db: Db, only?: readonly string[]): Promise<void> {
  await Promise.all(
    Object.entries(INDEXES)
      .filter(([collection]) => !only || only.includes(collection))
      .map(async ([collection, indexes]) => {
        try {
          await dropObsoleteIndexes(db, collection);
          await db.collection(collection).createIndexes(indexes);
        } catch (error) {
          // A failed index (e.g. duplicates blocking a unique one) must not take the app down.
          logError(`[MongoDB] Could not create indexes on ${collection}`, { error });
        }
      }),
  );
}
