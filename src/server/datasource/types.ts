/** The rows one statement returned. */
export interface StatementResult {
  command: string;
  rows: Record<string, unknown>[];
}

/**
 * A database checks run against. Every call is read-only and bounded by a
 * statement timeout; adapters for other databases implement the same shape.
 */
export interface DataSource {
  runReadOnly(statements: string[], options: { timeoutMs: number }): Promise<StatementResult[]>;
}

/** The query ran past its statement timeout. */
export class QueryTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`The query ran longer than ${Math.round(timeoutMs / 1000)} seconds and was stopped.`);
  }
}
