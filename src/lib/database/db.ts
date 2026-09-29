import fs from "node:fs";
import https from "node:https";
import type { ConnectionOptions } from "node:tls";
import pg, { Pool, type PoolClient, type PoolConfig, type QueryResult } from "pg";
import { redactConnectionString } from "./redact-connection-string";
import { inPublicCi } from "@/lib/utils/public-log";

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
 * is verified against that CA. Without a CA, TLS follows DATABASE_URL
 * (e.g. sslmode=require).
 */
export async function tlsOptions(env: Env = process.env, read = readCertificate): Promise<ConnectionOptions | undefined> {
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
export function poolLogLine(connectionString: string, ssl: ConnectionOptions | undefined, env: Env = process.env): string {
  const tls = ssl ? ` with TLS verified against the configured CA${ssl.cert ? " and a client certificate" : ""}` : "";
  return inPublicCi(env) ? `[db] Pool created${tls}` : `[db] Pool for ${redactConnectionString(connectionString)}${tls}`;
}

async function createPool(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const config: PoolConfig = {
    connectionString,
    // Never wait forever for a free connection (checks are bounded by a semaphore, dry runs are not).
    max: Number(process.env.PG_POOL_MAX) || 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  };
  const ssl = await tlsOptions();
  if (ssl) config.ssl = ssl;
  console.log(poolLogLine(connectionString, ssl));
  const pool = new Pool(config);
  // An idle client dropped by the server emits 'error' on the pool; unhandled, it would crash the process.
  pool.on("error", (error) => console.error("[db] Idle PostgreSQL client error:", error.message));
  return pool;
}

const shared = globalThis as unknown as { assayPgPool?: Promise<Pool> | null };

/** The process's one pool. The promise is shared, so concurrent first calls cannot create two. */
function getPool(): Promise<Pool> {
  shared.assayPgPool ??= createPool().catch((error) => {
    shared.assayPgPool = null;
    throw error;
  });
  return shared.assayPgPool;
}

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return (await getPool()).query(text, params);
}

/** Runs fn on a single connection inside a READ ONLY transaction; the database rejects any write. */
export async function withReadOnlyTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await (await getPool()).connect();
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
      console.error("[db] Rollback failed:", rollbackError);
    });
    throw error;
  } finally {
    client.release(broken);
  }
}

/** Closes the pool, for scripts that must exit. */
export async function closePool(): Promise<void> {
  const pool = shared.assayPgPool;
  shared.assayPgPool = null;
  if (pool) await (await pool.catch(() => null))?.end();
}

const db = { query, withReadOnlyTransaction, closePool };

export default db;
