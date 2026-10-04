import { resolveDatabaseTableIndexes } from "@better-auth/core/db/internal";
import type { DBFieldAttribute, DBTableIndex } from "@better-auth/core/db";
import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { ensureIndexes } from "@/lib/database/indexes";
import { logError } from "@/server/logging/log";

/** Collections Better Auth's OAuth provider writes inside transactions. */
const OAUTH_COLLECTIONS = [
  COLLECTIONS.oauthClients,
  COLLECTIONS.oauthClientResources,
  COLLECTIONS.oauthResources,
  COLLECTIONS.oauthConsents,
  COLLECTIONS.oauthRefreshTokens,
  COLLECTIONS.jwks,
] as const;

const NAMESPACE_EXISTS = 48;

/** A Better Auth table as its context describes it. */
export interface AuthTable {
  modelName: string;
  fields: Record<string, DBFieldAttribute>;
  indexes?: DBTableIndex[];
  disableMigrations?: boolean;
}

/**
 * Creates the OAuth collections and every index Better Auth expects, and
 * resolves once they exist. Auth requests wait for this, because on a fresh
 * database two things break client registration, which runs in a transaction:
 *
 * - A collection first created inside the transaction collides with index
 *   setup creating it outside: WriteConflict.
 * - Better Auth's MongoDB adapter builds a table's indexes on its first write
 *   in each process, outside any transaction, even when that write is inside
 *   one. The build waits for the transaction's lock and the transaction waits
 *   for the build, until the socket times out (45 s). Once the index exists
 *   that call returns at once.
 *
 * Either way the adapter reports "Cannot call abortTransaction after calling
 * commitTransaction", hiding the cause.
 */
export async function prepareOAuthCollections(db: Db, tables: Record<string, AuthTable>): Promise<void> {
  await ensureCollections(db, OAUTH_COLLECTIONS);
  await Promise.all([ensureIndexes(db, OAUTH_COLLECTIONS), createAdapterIndexes(db, Object.values(tables))]);
}

/** The indexes Better Auth's adapter would build lazily, with the same names and keys. */
export function adapterIndexes(tables: AuthTable[]) {
  return tables
    .filter((table) => !table.disableMigrations)
    .flatMap((table) =>
      resolveDatabaseTableIndexes({ fields: table.fields, indexes: table.indexes, tableName: table.modelName }).map((index) => ({
        collection: table.modelName,
        key: Object.fromEntries(index.columns.map((column) => [column === "id" ? "_id" : column, 1])),
        name: index.name,
        unique: index.unique ?? false,
      })),
    );
}

async function createAdapterIndexes(db: Db, tables: AuthTable[]): Promise<void> {
  await Promise.all(
    adapterIndexes(tables).map(({ collection, key, name, unique }) =>
      db
        .collection(collection)
        .createIndex(key, { name, unique })
        .catch((error) => logError(`[Auth] Could not create index ${name}`, { error: error })),
    ),
  );
}

/** Creates the given collections if they are missing. */
export async function ensureCollections(db: Db, names: readonly string[]): Promise<void> {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  await Promise.all(
    names
      .filter((name) => !existing.has(name))
      .map((name) =>
        db.createCollection(name).catch((error: { code?: number }) => {
          // Another instance created it first.
          if (error.code !== NAMESPACE_EXISTS) throw error;
        }),
      ),
  );
}
