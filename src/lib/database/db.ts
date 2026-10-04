import fs from "node:fs";
import https from "node:https";
import type { ConnectionOptions } from "node:tls";
import pg, { Pool, type PoolClient, type PoolConfig, type QueryResult } from "pg";
import { pgConnection } from "./pg-connection";
import { redactConnectionString } from "./redact-connection-string";
import { inPublicCi } from "@/lib/utils/public-log";
import { logError, logInfo } from "@/lib/logging/log";
import { serverEnv } from "@/lib/config/env";

// BIGINT (OID 20) as strings: JavaScript numbers lose precision past 2^53 and JSON cannot hold BigInt.
pg.types.setTypeParser(20, (value: string) => value);

type Env = Record<string, string | undefined>;

/**
 * Reads a certificate from https://… (e.g. a private blob) or, for local
 * development, file://…. Plain http is refused: a certificate fetched in
 * the clear could be swapped on the way.
 */
function readCertificate(url: string): Promise<Buffer> {
  if (url.startsWith("file://")) return fs.promises.readFile(url.slice("file://".length));
  if (!url.startsWith("https://")) return Promise.reject(new Error("Certificate URLs must use https:// (or file:// locally)"));
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Downloading a certificate failed with HTTP ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * TLS options from CA_CERT_BLOB_URL (and, for client certificates, both
 * CLIENT_CERT_BLOB_URL and CLIENT_KEY_BLOB_URL). The server's certificate
 * is verified against that CA. Without a CA, TLS follows DATABASE_URL:
 * an sslmode that asks for TLS gets full verification against the system
 * CAs (see pgConnection).
 */
export async function tlsOptions(env: Env = serverEnv(), read = readCertificate): Promise<ConnectionOptions | undefined> {
  if (!env.CA_CERT_BLOB_URL) return undefined;
  const ssl: ConnectionOptions = { ca: await read(env.CA_CERT_BLOB_URL), rejectUnauthorized: true };
  if (env.CLIENT_CERT_BLOB_URL && env.CLIENT_KEY_BLOB_URL) {
    const [cert, key] = await Promise.all([read(env.CLIENT_CERT_BLOB_URL), read(env.CLIENT_KEY_BLOB_URL)]);
    Object.assign(ssl, { cert, key });
  }
  return ssl;
}

/**
 * What pool creation logs. Public CI logs (the scheduled workflow) get no
 * host, database or user; elsewhere the connection string is redacted.
 */
export function poolLogLine(connectionString: string, ssl: ConnectionOptions | undefined, env: Env = serverEnv()): string {
  const verifiedAgainst = ssl?.ca ? "the configured CA" : "the system CAs";
  const tls = ssl ? ` with TLS verified against ${verifiedAgainst}${ssl.cert ? " and a client certificate" : ""}` : "";
  return inPublicCi(env) ? `[db] Pool created${tls}` : `[db] Pool for ${redactConnectionString(connectionString)}${tls}`;
}

/** A pool with the settings every source shares; `label` names it in logs, never with secrets. */
export function openPool(config: PoolConfig, label: string): Pool {
  // Never wait forever for a free connection (checks are bounded by a semaphore, dry runs are not).
  const pool = new Pool({ connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, ...config });
  // An idle client dropped by the server emits 'error' on the pool; unhandled, it would crash the process.
  pool.on("error", (error) => logError(`[db] Idle PostgreSQL client error (${label})`, { error }));
  return pool;
}

/** How pg connects to DATABASE_URL, the built-in source, with its TLS settings from the environment. */
export async function defaultConnectionConfig(): Promise<{ connectionString: string; ssl?: ConnectionOptions }> {
  const databaseUrl = serverEnv().DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const { connectionString, ssl } = pgConnection(databaseUrl, await tlsOptions());
  return ssl ? { connectionString, ssl } : { connectionString };
}

async function createDefaultPool(): Promise<Pool> {
  const { connectionString, ssl } = await defaultConnectionConfig();
  logInfo(poolLogLine(connectionString, ssl));
  return openPool({ connectionString, ssl, max: Number(serverEnv().PG_POOL_MAX) || 10 }, "default");
}

const shared = globalThis as unknown as { assayPgPool?: Promise<Pool> | null };

/** The process's pool for DATABASE_URL. The promise is shared, so concurrent first calls cannot create two. */
function getDefaultPool(): Promise<Pool> {
  shared.assayPgPool ??= createDefaultPool().catch((error) => {
    shared.assayPgPool = null;
    throw error;
  });
  return shared.assayPgPool;
}

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return (await getDefaultPool()).query(text, params);
}

/** Runs fn on one connection of `pool` inside a READ ONLY transaction; the database rejects any write. */
export async function readOnlyTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let broken: Error | undefined;
  try {
    await client.query("BEGIN READ ONLY");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError) => {
      // A connection that cannot roll back is discarded instead of going back to the pool.
      broken = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
      logError("[db] Rollback failed", { error: rollbackError });
    });
    throw error;
  } finally {
    client.release(broken);
  }
}

/** readOnlyTransaction on the DATABASE_URL pool. */
export async function withReadOnlyTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return readOnlyTransaction(await getDefaultPool(), fn);
}

/** Closes the DATABASE_URL pool, for scripts that must exit. */
export async function closePool(): Promise<void> {
  const pool = shared.assayPgPool;
  shared.assayPgPool = null;
  if (pool) await (await pool.catch(() => null))?.end();
}

const db = { query, withReadOnlyTransaction, closePool };

export default db;
