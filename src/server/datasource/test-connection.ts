import pg, { type ClientConfig } from "pg";

/** What connecting to a source and reading from it once showed. */
export interface ConnectionProbe {
  ok: boolean;
  error?: string;
  serverVersion?: string;
  currentUser?: string;
  readOnly?: boolean;
  writeAccess?: string[];
}

/** Connecting and the probe each give up after this long. */
export const TEST_TIMEOUT_MS = 5_000;

interface ProbeRow {
  server_version: string;
  current_user: string;
  superuser: boolean;
  write_all_data: boolean;
  create_schema: boolean;
  table_write: boolean;
}

/**
 * Who the role is and whether it could write anywhere. Checks only need
 * SELECT, so any write access is reported as a warning: every run is read
 * only anyway, but a read-only role is the layer that cannot be talked out
 * of it.
 */
const PROBE = `
  SELECT current_setting('server_version') AS server_version,
         current_user AS current_user,
         coalesce((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) AS superuser,
         coalesce((SELECT pg_has_role(current_user, oid, 'USAGE') FROM pg_roles WHERE rolname = 'pg_write_all_data'), false) AS write_all_data,
         has_database_privilege(current_database(), 'CREATE') AS create_schema,
         EXISTS (
           SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relkind IN ('r', 'p')
             AND n.nspname NOT IN ('pg_catalog', 'information_schema')
             AND n.nspname NOT LIKE 'pg\\_%'
             AND has_table_privilege(c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE')
         ) AS table_write`;

/** The ways the probe says the role could write. */
export function writeAccessOf(row: Pick<ProbeRow, "superuser" | "write_all_data" | "create_schema" | "table_write">): string[] {
  return [
    row.superuser && "superuser",
    row.write_all_data && "pg_write_all_data",
    row.table_write && "table_write",
    row.create_schema && "create_schema",
  ].filter((access): access is string => Boolean(access));
}

type Connect = (config: ClientConfig) => Pick<pg.Client, "connect" | "query" | "end" | "on">;

/** Connects once (no pool), reads the probe inside a READ ONLY transaction, and disconnects. */
export async function probeConnection(config: ClientConfig, connect: Connect = (c) => new pg.Client(c)): Promise<ConnectionProbe> {
  const client = connect({ ...config, connectionTimeoutMillis: TEST_TIMEOUT_MS, query_timeout: TEST_TIMEOUT_MS * 2 });
  // A connection dropped after the probe must not surface as an unhandled 'error'.
  client.on("error", () => undefined);
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${TEST_TIMEOUT_MS}`);
    const { rows } = await client.query<ProbeRow>(PROBE);
    await client.query("COMMIT");
    const row = rows[0];
    const writeAccess = writeAccessOf(row);
    return {
      ok: true,
      serverVersion: row.server_version,
      currentUser: row.current_user,
      readOnly: writeAccess.length === 0,
      writeAccess,
    };
  } catch (error) {
    // Refused connections to several addresses arrive as an AggregateError with an empty message.
    const code = (error as { code?: string }).code;
    return { ok: false, error: (error instanceof Error && error.message) || code || "Could not connect" };
  } finally {
    await client.end().catch(() => undefined);
  }
}
