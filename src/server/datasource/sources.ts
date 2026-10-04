import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { openPool } from "@/lib/database/db";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { inPublicCi } from "@/lib/utils/public-log";
import { open } from "@/server/crypto/secret-box";
import { findSourceRecord } from "@/server/repos/data-source-store";
import { clientConfig, parseConnectionString } from "./connection";
import { defaultPostgresSource } from "./postgres";
import { createSourceRegistry, type ResolvedSource, type SourceRecord, type SourceRegistry } from "./registry";
import { logInfo } from "@/lib/logging/log";
import { serverEnv } from "@/lib/config/env";

type Env = Record<string, string | undefined>;

/** ALLOW_PRIVATE_DATA_SOURCES=true lets added sources reach hosts on private networks (self-hosted setups). */
export const allowPrivateSources = (env: Env = serverEnv()) => env.ALLOW_PRIVATE_DATA_SOURCES === "true";

/** Connections per added source and instance: PG_SOURCE_POOL_MAX, 3 by default. */
function sourcePoolMax(env: Env = serverEnv()): number {
  const value = Number(env.PG_SOURCE_POOL_MAX);
  return Number.isInteger(value) && value > 0 ? value : 3;
}

function createPool(record: SourceRecord) {
  const config = clientConfig(parseConnectionString(open(record.connection)), {
    allowPrivate: allowPrivateSources(),
    connectTimeoutMs: 10_000,
  });
  // Never the host or user; public CI logs do not even get the id.
  logInfo(inPublicCi() ? "[db] Pool created for a data source" : `[db] Pool for data source ${record.sourceId} (version ${record.version})`);
  return openPool({ ...config, max: sourcePoolMax() }, `source ${record.sourceId}`);
}

const shared = globalThis as unknown as { assaySourceRegistry?: SourceRegistry };

function registry(): SourceRegistry {
  shared.assaySourceRegistry ??= createSourceRegistry({
    loadRecord: async (sourceId) => findSourceRecord(await getMongoDbClient().getDb(), DEFAULT_WORKSPACE_ID, sourceId),
    createPool,
    defaultSource: () => (serverEnv().DATABASE_URL ? defaultPostgresSource : null),
  });
  return shared.assaySourceRegistry;
}

/** The source a check or an editor asks for; throws UnknownDataSourceError. */
export const resolveSource = (sourceId: string): Promise<ResolvedSource> => registry().resolve(sourceId);

/** After an edit or delete on this instance: the next resolve reads the source again. */
export const forgetSource = (sourceId: string): void => registry().forget(sourceId);

/** Ends the pools of added sources, for scripts that must exit. */
export const closeSourcePools = (): Promise<void> => registry().closeAll();
