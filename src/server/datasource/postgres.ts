import { withReadOnlyTransaction } from "@/lib/database/db";
import { singleStatement } from "@/lib/sql/single-statement";
import { QueryTimeoutError, type DataSource, type StatementResult } from "./types";

// 57014 query_canceled: what PostgreSQL raises when statement_timeout fires.
const QUERY_CANCELED = "57014";

/** The monitored PostgreSQL database, reached through the shared pool in a read-only transaction. */
export const postgresDataSource: DataSource = {
  runReadOnly(statements, { timeoutMs }) {
    return withReadOnlyTransaction(async (client) => {
      // The server cancels a slow statement; a client-side timer would leave it running.
      await client.query(`SET LOCAL statement_timeout = ${Math.floor(timeoutMs)}`);
      const results: StatementResult[] = [];
      for (const statement of statements) {
        try {
          const result = await client.query(singleStatement(statement));
          results.push({ command: result.command, rows: result.rows ?? [] });
        } catch (error) {
          if ((error as { code?: string }).code === QUERY_CANCELED) throw new QueryTimeoutError(timeoutMs);
          throw error;
        }
      }
      return results;
    });
  },
};
