import type { Db, WithId } from "mongodb";
import type { ClientConfig } from "pg";
import type { ConnectionTestDto, CreateDataSource, DataSourceDto, UpdateDataSource } from "@/contracts/data-sources";
import { DEFAULT_SOURCE_ID, isReservedSourceId } from "@/domain/data-source";
import { defaultConnectionConfig } from "@/lib/database/db";
import { hasSecretKey, open, seal } from "@/server/crypto/secret-box";
import { clientConfig, displayOf, displayOfUrl, parseConnectionString, SourceConnectionError, vetConnectionString } from "@/server/datasource/connection";
import { UnknownDataSourceError, type ResolvedSource } from "@/server/datasource/registry";
import { allowPrivateSources, forgetSource, resolveSource } from "@/server/datasource/sources";
import { probeConnection, TEST_TIMEOUT_MS, type ConnectionProbe } from "@/server/datasource/test-connection";
import { ApiError } from "@/server/http/route";
import type { Resolver } from "@/server/net/safe-url";
import {
  checkCountsBySource,
  countChecksUsing,
  deleteSourceDoc,
  findSourceDoc,
  insertSourceDoc,
  listSourceDocs,
  recordSourceTest,
  updateSourceDoc,
  type DataSourceDoc,
  type StoredTest,
} from "@/server/repos/data-source-store";

/**
 * Data sources: the databases checks run against. DATABASE_URL is the
 * built-in `default`; admins add more. Connection strings are sealed at
 * rest and never returned, logged or put in an error: pages get `display`.
 */

type Env = Record<string, string | undefined>;

export interface DataSourceDeps {
  env: Env;
  /** DNS for the host check; the real resolver unless a test replaces it. */
  resolve?: Resolver;
  probe: (config: ClientConfig) => Promise<ConnectionProbe>;
  /** Tells this instance's registry that a source changed. */
  forget: (sourceId: string) => void;
  now: () => Date;
}

export const defaultDataSourceDeps = (): DataSourceDeps => ({
  env: process.env,
  probe: (config) => probeConnection(config),
  forget: forgetSource,
  now: () => new Date(),
});

type Actor = { id: string; name: string };

/** The built-in source's name; pages show it in the reader's language. */
const BUILT_IN_NAME = "Primary";

const toTestDto = (test: StoredTest | null): ConnectionTestDto | null =>
  test && { ...test, at: new Date(test.at).toISOString() };

function toDto(doc: DataSourceDoc, checkCount: number, guest: boolean): DataSourceDto {
  return {
    sourceId: doc.sourceId,
    name: doc.name,
    engine: doc.engine,
    display: guest ? null : doc.display,
    builtIn: false,
    version: doc.version,
    lastTest: toTestDto(doc.lastTest),
    checkCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function builtInDto(env: Env, checkCount: number, guest: boolean): DataSourceDto | null {
  if (!env.DATABASE_URL) return null;
  return {
    sourceId: DEFAULT_SOURCE_ID,
    name: BUILT_IN_NAME,
    engine: "postgres",
    display: guest ? null : displayOfUrl(env.DATABASE_URL),
    builtIn: true,
    version: 0,
    lastTest: null,
    checkCount,
    createdAt: null,
    updatedAt: null,
  };
}

/** Every source, the built-in one first, with how many checks use each. Guests get no `display`. */
export async function listDataSources(db: Db, workspaceId: string, options: { guest: boolean; env?: Env }): Promise<DataSourceDto[]> {
  const [docs, counts] = await Promise.all([listSourceDocs(db, workspaceId), checkCountsBySource(db)]);
  const builtIn = builtInDto(options.env ?? process.env, counts.get(DEFAULT_SOURCE_ID) ?? 0, options.guest);
  return [...(builtIn ? [builtIn] : []), ...docs.map((doc) => toDto(doc, counts.get(doc.sourceId) ?? 0, options.guest))];
}

export async function getDataSource(db: Db, workspaceId: string, sourceId: string, options: { guest: boolean; env?: Env }): Promise<DataSourceDto> {
  const env = options.env ?? process.env;
  if (sourceId === DEFAULT_SOURCE_ID) {
    const builtIn = builtInDto(env, await countChecksUsing(db, sourceId), options.guest);
    if (builtIn) return builtIn;
  } else {
    const doc = await findSourceDoc(db, workspaceId, sourceId);
    if (doc) return toDto(doc, await countChecksUsing(db, sourceId), options.guest);
  }
  throw notFound(sourceId);
}

/** Names and ids only, for the check editor's picker and agents. */
export async function listSourceOptions(db: Db, workspaceId: string, env: Env = process.env) {
  const docs = await listSourceDocs(db, workspaceId);
  const builtIn = env.DATABASE_URL ? [{ sourceId: DEFAULT_SOURCE_ID, name: BUILT_IN_NAME, engine: "postgres" as const }] : [];
  return [...builtIn, ...docs.map(({ sourceId, name, engine }) => ({ sourceId, name, engine }))];
}

/** Refuses a check that names a source that does not exist. `default` is always accepted: it is what no source means. */
export async function assertDataSourceExists(db: Db, workspaceId: string, sourceId: string | null | undefined): Promise<void> {
  if (!sourceId || sourceId === DEFAULT_SOURCE_ID) return;
  if (!(await findSourceDoc(db, workspaceId, sourceId))) {
    throw new ApiError(400, "unknown_data_source", `No data source with the id '${sourceId}'`);
  }
}

/** The source an editor or page asked for; an unknown id answers 400 `unknown_data_source`. */
export async function requireSource(sourceId: string | null | undefined): Promise<ResolvedSource> {
  const id = sourceId || DEFAULT_SOURCE_ID;
  try {
    return await resolveSource(id);
  } catch (error) {
    if (error instanceof UnknownDataSourceError) throw new ApiError(400, "unknown_data_source", error.message);
    throw error;
  }
}

const notFound = (sourceId: string) => new ApiError(404, "not_found", `No data source with the id '${sourceId}'`);
const builtInRefused = () => new ApiError(400, "built_in_source", "The built-in source comes from DATABASE_URL; change it in the environment");

function requireSecretKey(env: Env): void {
  if (!hasSecretKey(env)) throw new ApiError(503, "not_configured", "Set ASSAY_SECRET_KEY to store data sources");
}

/** Parses and vets a connection string; its problems answer 400 with their code. */
async function vet(connectionString: string, deps: DataSourceDeps) {
  try {
    return await vetConnectionString(connectionString, allowPrivateSources(deps.env), deps.resolve);
  } catch (error) {
    if (error instanceof SourceConnectionError) throw new ApiError(400, error.code, error.message);
    throw error;
  }
}

export async function createDataSource(db: Db, workspaceId: string, by: Actor, input: CreateDataSource, deps: DataSourceDeps): Promise<DataSourceDto> {
  if (isReservedSourceId(input.sourceId)) throw new ApiError(400, "source_id_reserved", `The id '${input.sourceId}' is reserved`);
  requireSecretKey(deps.env);
  const connection = await vet(input.connectionString, deps);
  if (await findSourceDoc(db, workspaceId, input.sourceId)) throw sourceIdTaken(input.sourceId);

  const now = deps.now();
  const doc: DataSourceDoc = {
    workspaceId,
    sourceId: input.sourceId,
    name: input.name,
    engine: input.engine,
    connection: seal(input.connectionString, deps.env),
    display: displayOf(connection),
    createdBy: by,
    createdAt: now,
    updatedBy: by,
    updatedAt: now,
    version: 1,
    lastTest: null,
  };
  try {
    await insertSourceDoc(db, doc);
  } catch (error) {
    // Two creates with the same id at once: the unique index lets one through.
    if ((error as { code?: number }).code === 11000) throw sourceIdTaken(input.sourceId);
    throw error;
  }
  return toDto(doc, 0, false);
}

const sourceIdTaken = (sourceId: string) => new ApiError(409, "source_id_taken", `A data source with the id '${sourceId}' already exists`);

/**
 * Renames a source or replaces its connection, only onto the version the
 * edit started from. A new connection clears the last test, and this
 * instance's pool is dropped; others notice the new version on their next
 * resolve.
 */
export async function updateDataSource(
  db: Db,
  workspaceId: string,
  sourceId: string,
  by: Actor,
  input: UpdateDataSource,
  deps: DataSourceDeps,
): Promise<DataSourceDto> {
  if (sourceId === DEFAULT_SOURCE_ID) throw builtInRefused();
  const set: Partial<DataSourceDoc> = { updatedBy: by, updatedAt: deps.now() };
  if (input.name) set.name = input.name;
  if (input.connectionString) {
    requireSecretKey(deps.env);
    set.display = displayOf(await vet(input.connectionString, deps));
    set.connection = seal(input.connectionString, deps.env);
    set.lastTest = null;
  }
  const updated = await updateSourceDoc(db, workspaceId, sourceId, input.version, set);
  if (!updated) {
    if (await findSourceDoc(db, workspaceId, sourceId)) {
      throw new ApiError(409, "conflict", "Someone else changed this data source. Reload to see their changes.");
    }
    throw notFound(sourceId);
  }
  deps.forget(sourceId);
  return toDto(updated, await countChecksUsing(db, sourceId), false);
}

/** Deletes a source no check uses; while checks use it, 409 `source_in_use`. */
export async function deleteDataSource(db: Db, workspaceId: string, sourceId: string, deps: Pick<DataSourceDeps, "forget">): Promise<void> {
  if (sourceId === DEFAULT_SOURCE_ID) throw builtInRefused();
  const inUse = await countChecksUsing(db, sourceId);
  if (inUse > 0) {
    throw new ApiError(409, "source_in_use", `${inUse} ${inUse === 1 ? "check uses" : "checks use"} this data source; move them to another source first`);
  }
  if (!(await deleteSourceDoc(db, workspaceId, sourceId))) throw notFound(sourceId);
  deps.forget(sourceId);
}

const testDto = (probe: ConnectionProbe, at: Date): ConnectionTestDto => ({ ...probe, at: at.toISOString() });

/** Tests a connection string before it is saved: the same checks as saving, then one read-only probe. */
export async function testUnsavedConnection(connectionString: string, deps: DataSourceDeps): Promise<ConnectionTestDto> {
  const connection = await vet(connectionString, deps);
  const config = clientConfig(connection, { allowPrivate: allowPrivateSources(deps.env), connectTimeoutMs: TEST_TIMEOUT_MS });
  return testDto(await deps.probe(config), deps.now());
}

/** Tests a saved source and records the result on it; the built-in one is tested but not recorded. */
export async function testSavedSource(db: Db, workspaceId: string, sourceId: string, deps: DataSourceDeps): Promise<ConnectionTestDto> {
  if (sourceId === DEFAULT_SOURCE_ID) {
    if (!deps.env.DATABASE_URL) throw notFound(sourceId);
    return testDto(await deps.probe(await defaultConnectionConfig()), deps.now());
  }
  const doc: WithId<DataSourceDoc> | null = await findSourceDoc(db, workspaceId, sourceId);
  if (!doc) throw notFound(sourceId);
  requireSecretKey(deps.env);
  let probe: ConnectionProbe;
  try {
    const config = clientConfig(parseConnectionString(open(doc.connection, deps.env)), {
      allowPrivate: allowPrivateSources(deps.env),
      connectTimeoutMs: TEST_TIMEOUT_MS,
    });
    probe = await deps.probe(config);
  } catch (error) {
    // A stored string that no longer passes (e.g. private hosts were turned off) fails the test instead of the request.
    probe = { ok: false, error: error instanceof SourceConnectionError ? error.message : "The stored connection could not be opened" };
  }
  const at = deps.now();
  const stored = Object.fromEntries(Object.entries(probe).filter(([, value]) => value !== undefined)) as ConnectionProbe;
  await recordSourceTest(db, workspaceId, sourceId, doc.version, { ...stored, at });
  return testDto(probe, at);
}
