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

/** The monitored PostgreSQL database, reached through the shared pool in a read-only transaction. */
export const postgresDataSource: DataSource = {
  runReadOnly(statements, { timeoutMs, maxRows }) {
    return withReadOnlyTransaction(async (client) => {
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
    });
  },
};
