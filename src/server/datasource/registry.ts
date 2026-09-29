import type { Pool } from "pg";
import { DEFAULT_SOURCE_ID } from "@/domain/data-source";
import { readOnlyTransaction } from "@/lib/database/db";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { postgresSource, type PostgresSource } from "./postgres";

/** No source with this id: never added, deleted, or DATABASE_URL unset for `default`. */
export class UnknownDataSourceError extends Error {
  constructor(readonly sourceId: string) {
    super(`No data source with the id '${sourceId}'`);
  }
}

/** What the registry needs of a stored source; `connection` is still sealed. */
export interface SourceRecord {
  sourceId: string;
  version: number;
  connection: string;
}

export interface ResolvedSource {
  sourceId: string;
  /** Changes with every edit of the source; 0 for the built-in one. Keys pools and schema caches. */
  version: number;
  source: PostgresSource;
}

interface RegistryDeps {
  loadRecord(sourceId: string): Promise<SourceRecord | null>;
  /** A new pool for the record's connection. */
  createPool(record: SourceRecord): Pool;
  /** DATABASE_URL, or null when it is not set. */
  defaultSource(): PostgresSource | null;
  /** How long a looked-up record is trusted before it is read again. */
  recordTtlMs?: number;
}

/**
 * Resolves a source id to something checks can run against. One pool per
 * added source per instance, keyed by the source's version: after an edit
 * the next resolve opens a new pool and ends the old one (pg lets queries
 * in flight on it finish). Records are cached briefly, so another instance
 * picks up an edit within `recordTtlMs`.
 */
export function createSourceRegistry(deps: RegistryDeps) {
  const pools = new Map<string, { version: number; pool: Pool }>();
  const records = new TtlCache<SourceRecord | null>(deps.recordTtlMs ?? 5_000);

  const endPool = (sourceId: string) => {
    const current = pools.get(sourceId);
    if (!current) return;
    pools.delete(sourceId);
    current.pool.end().catch((error: unknown) => console.error(`[db] Closing the pool of source ${sourceId} failed:`, error));
  };

  async function recordOf(sourceId: string): Promise<SourceRecord | null> {
    const cached = records.get(sourceId);
    if (cached !== undefined) return cached;
    const record = await deps.loadRecord(sourceId);
    records.set(sourceId, record);
    return record;
  }

  function poolFor(record: SourceRecord): Pool {
    const current = pools.get(record.sourceId);
    if (current?.version === record.version) return current.pool;
    endPool(record.sourceId);
    const pool = deps.createPool(record);
    pools.set(record.sourceId, { version: record.version, pool });
    return pool;
  }

  return {
    async resolve(sourceId: string): Promise<ResolvedSource> {
      if (sourceId === DEFAULT_SOURCE_ID) {
        const source = deps.defaultSource();
        if (!source) throw new UnknownDataSourceError(sourceId);
        return { sourceId, version: 0, source };
      }
      const record = await recordOf(sourceId);
      if (!record) {
        endPool(sourceId);
        throw new UnknownDataSourceError(sourceId);
      }
      const pool = poolFor(record);
      return { sourceId, version: record.version, source: postgresSource((fn) => readOnlyTransaction(pool, fn)) };
    },

    /** Drops what this instance knows of a source after it was edited or deleted here. */
    forget(sourceId: string): void {
      records.delete(sourceId);
      endPool(sourceId);
    },

    /** Ends every pool, for scripts that must exit. */
    async closeAll(): Promise<void> {
      const all = [...pools.values()];
      pools.clear();
      records.clear();
      await Promise.all(all.map(({ pool }) => pool.end().catch(() => undefined)));
    },
  };
}

export type SourceRegistry = ReturnType<typeof createSourceRegistry>;
