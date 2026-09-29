/** The rows one statement returned: at most `maxRows` of them, and how many there were in all. */
export interface StatementResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface RunOptions {
  /** One deadline for the whole script, not per statement. */
  timeoutMs: number;
  /** Rows kept per statement; the rest are counted and dropped as they stream in. */
  maxRows: number;
}

/**
 * A database checks run against. Every call is read-only and bounded by a
 * deadline; adapters for other databases implement the same shape.
 */
export interface DataSource {
  runReadOnly(statements: string[], options: RunOptions): Promise<StatementResult[]>;
}

/** The query ran past its deadline. */
export class QueryTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`The query ran longer than ${Math.round(timeoutMs / 1000)} seconds and was stopped.`);
  }
}
