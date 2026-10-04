import { MongoClient } from "mongodb";
import { serverEnv } from "@/lib/config/env";

type Env = Record<string, string | undefined>;

export const DEFAULT_DATABASE = "sql_script_monitoring";

/**
 * The database everything in the app uses: the path of MONGODB_URI if it
 * names one, else MONGODB_DB_NAME, else the default. Sign-in, roles, checks
 * and runs must agree on it, so this is the only place it is decided.
 */
export function mongoDatabaseName(env: Env = serverEnv()): string {
  return databaseInUri(env.MONGODB_URI ?? "") || env.MONGODB_DB_NAME || DEFAULT_DATABASE;
}

/** The database named in a MongoDB URI's path. Works on multi-host URIs, which `new URL` rejects. */
export function databaseInUri(uri: string): string {
  const afterScheme = uri.split("://")[1] ?? "";
  const afterCredentials = afterScheme.slice(afterScheme.lastIndexOf("@") + 1);
  const slash = afterCredentials.indexOf("/");
  if (slash < 0) return "";
  return decodeURIComponent(afterCredentials.slice(slash + 1).split("?")[0] ?? "");
}

const OPTIONS = {
  // Small pools: each serverless instance holds one, and Atlas limits connections per cluster.
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  maxIdleTimeMS: 30_000,
};

const shared = globalThis as unknown as { assayMongo?: MongoClient };

/**
 * The process's one MongoClient, created on first use and kept across dev
 * reloads. The driver connects lazily, so creating it costs nothing until a
 * query runs.
 */
export function sharedMongoClient(env: Env = serverEnv()): MongoClient {
  if (shared.assayMongo) return shared.assayMongo;
  const uri = env.MONGODB_URI;
  if (!uri) {
    // `next build` loads route modules to collect page data without secrets; nothing is dialled there.
    if (env.NEXT_PHASE === "phase-production-build") return new MongoClient("mongodb://build.invalid");
    throw new Error("MONGODB_URI is not set");
  }
  shared.assayMongo = new MongoClient(uri, OPTIONS);
  return shared.assayMongo;
}

/** Closes the shared client, for scripts that must exit. */
export async function closeSharedMongoClient(): Promise<void> {
  const client = shared.assayMongo;
  shared.assayMongo = undefined;
  await client?.close();
}
