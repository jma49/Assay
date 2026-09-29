import type { PoolClient } from "pg";
import Cursor from "pg-cursor";
import { withReadOnlyTransaction } from "@/lib/database/db";
import { QueryTimeoutError, type DataSource, type StatementResult } from "./types";

// 57014 query_canceled: what PostgreSQL raises when statement_timeout fires.
const QUERY_CANCELED = "57014";
const BATCH_ROWS = 1_000;

/**
 * Reads a statement's rows in batches, keeping the first `maxRows` and
 * counting the rest, so a check that matches millions of rows cannot exhaust
 * memory. A cursor uses the extended protocol, where PostgreSQL rejects a
 * second statement smuggled into the same query.
 */
export async function readCapped(
  read: (count: number) => Promise<Record<string, unknown>[]>,
  maxRows: number,
): Promise<StatementResult> {
  const rows: Record<string, unknown>[] = [];
  let rowCount = 0;
  for (;;) {
    const batch = await read(BATCH_ROWS);
    if (batch.length === 0) break;
    rowCount += batch.length;
    if (rows.length < maxRows) rows.push(...batch.slice(0, maxRows - rows.length));
  }
  return { rows, rowCount };
}

async function runStatement(client: PoolClient, statement: string, maxRows: number): Promise<StatementResult> {
  const cursor = client.query(new Cursor<Record<string, unknown>>(statement));
  try {
    return await readCapped((count) => cursor.read(count), maxRows);
  } finally {
    await cursor.close().catch(() => undefined);
  }
}

/** Runs fn on one connection inside a READ ONLY transaction (readOnlyTransaction on a source's pool). */
export type ReadOnlyRunner = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

/** A PostgreSQL source: checks go through runReadOnly, the schema browser and dry runs through `transaction`. */
export interface PostgresSource extends DataSource {
  transaction: ReadOnlyRunner;
}

/** A PostgreSQL database reached through `transaction`, always in a read-only transaction. */
export function postgresSource(transaction: ReadOnlyRunner): PostgresSource {
  return {
    transaction,
    runReadOnly: (statements, { timeoutMs, maxRows }) =>
      transaction(async (client) => {
        const deadline = Date.now() + timeoutMs;
        const results: StatementResult[] = [];
        for (const statement of statements) {
          // The server cancels a slow statement; a client-side timer would leave it running.
          const remaining = Math.floor(deadline - Date.now());
          if (remaining <= 0) throw new QueryTimeoutError(timeoutMs);
          await client.query(`SET LOCAL statement_timeout = ${remaining}`);
          try {
            results.push(await runStatement(client, statement, maxRows));
          } catch (error) {
            if ((error as { code?: string }).code === QUERY_CANCELED) throw new QueryTimeoutError(timeoutMs);
            throw error;
          }
        }
        return results;
      }),
  };
}

/** DATABASE_URL, the built-in source. */
export const defaultPostgresSource = postgresSource((fn) => withReadOnlyTransaction(fn));
