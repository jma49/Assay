import { DEFAULT_SOURCE_ID } from "@/domain/data-source";
import { getMongoDbClient } from "@/lib/database/mongodb";
import redis from "@/lib/cache/redis";
import { errorKind } from "@/lib/utils/public-log";
import { UnknownDataSourceError } from "@/server/datasource/registry";
import { resolveSource } from "@/server/datasource/sources";
import { logError } from "@/server/logging/log";

/** How a component answered the probe. */
export type ComponentStatus = "ok" | "down" | "unconfigured";

export interface ComponentCheck {
  name: "mongodb" | "redis" | "postgres";
  status: ComponentStatus;
  /** How long the probe took; absent when the component is not configured. */
  latencyMs?: number;
}

export interface HealthReport {
  status: "ok" | "degraded";
  checks: ComponentCheck[];
}

export interface Probe {
  name: ComponentCheck["name"];
  /**
   * Throw when the component is down. Return "unconfigured" when the
   * component is intentionally absent (the app degrades without it).
   */
  run: () => Promise<"unconfigured" | void>;
}

/** A probe must answer fast; a hanging dependency is a down dependency. */
export const PROBE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`probe timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function runProbe(probe: Probe, timeoutMs: number): Promise<ComponentCheck> {
  const start = Date.now();
  try {
    const result = await withTimeout(probe.run(), timeoutMs);
    if (result === "unconfigured") return { name: probe.name, status: "unconfigured" };
    return { name: probe.name, status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    // The caller gets "down"; the detail stays in the server log.
    logError(`Health probe failed: ${probe.name}`, { kind: errorKind(error) });
    return { name: probe.name, status: "down", latencyMs: Date.now() - start };
  }
}

async function probeMongo(): Promise<"unconfigured" | void> {
  const db = await getMongoDbClient().getDb();
  await db.command({ ping: 1 });
}

async function probeRedis(): Promise<"unconfigured" | void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return "unconfigured";
  await redis.ping();
}

async function probePostgres(): Promise<"unconfigured" | void> {
  if (!process.env.DATABASE_URL) return "unconfigured";
  try {
    const { source } = await resolveSource(DEFAULT_SOURCE_ID);
    await source.transaction(async (client) => {
      await client.query("SELECT 1");
    });
  } catch (error) {
    if (error instanceof UnknownDataSourceError) return "unconfigured";
    throw error;
  }
}

/** The probes every deployment answers: the app's own stores. */
export function defaultProbes(): Probe[] {
  return [
    { name: "mongodb", run: probeMongo },
    { name: "redis", run: probeRedis },
    { name: "postgres", run: probePostgres },
  ];
}

/**
 * Runs the probes concurrently. The report is "degraded" when any component
 * is down; "unconfigured" components do not affect it.
 */
export async function checkHealth(
  probes: Probe[] = defaultProbes(),
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<HealthReport> {
  const checks = await Promise.all(probes.map((probe) => runProbe(probe, timeoutMs)));
  const status = checks.some((check) => check.status === "down") ? "degraded" : "ok";
  return { status, checks };
}
