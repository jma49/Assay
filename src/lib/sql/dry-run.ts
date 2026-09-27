import type { PoolClient } from "pg";
import { withReadOnlyTransaction } from "@/lib/database/db";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { singleStatement } from "@/lib/sql/single-statement";
import { splitStatements } from "@/lib/sql/statements";

export const DRY_RUN_TIMEOUT_MS = 10_000;
export const DRY_RUN_SAMPLE_ROWS = 5;

export type DryRunResult =
  | { ok: true; rowCount: number; sample: Record<string, unknown>[] }
  | { ok: false; error: string };

/**
 * The query wrapped as a subquery so it can be counted and sampled without
 * returning every row. The newline keeps a trailing `--` comment from
 * swallowing the closing parenthesis.
 */
export function wrapForDryRun(sql: string): { count: string; sample: string } {
  const body = sql.replace(/[;\s]+$/, "").trim();
  const inner = `(\n${body}\n) AS assay_check`;
  return {
    count: `SELECT count(*)::int AS n FROM ${inner}`,
    sample: `SELECT * FROM ${inner} LIMIT ${DRY_RUN_SAMPLE_ROWS}`,
  };
}

const LEADING_COMMENTS = /^(\s*(--[^\n]*(\n|$)|\/\*[\s\S]*?\*\/))*\s*/;

type Runner = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

/**
 * Runs a candidate check once to see whether it parses and how many rows it
 * flags. Only SELECT/WITH queries, only after the static check, and always
 * in a read-only transaction with a short statement timeout.
 */
export async function dryRunCheck(sql: string, run: Runner = withReadOnlyTransaction): Promise<DryRunResult> {
  const validation = validateReadOnlySql(sql);
  if (!validation.isValid) {
    return { ok: false, error: validation.reasonEn ?? validation.reason ?? "Not a read-only query" };
  }
  if (!/^(SELECT|WITH)\b/i.test(sql.replace(LEADING_COMMENTS, "")) || splitStatements(sql).length !== 1) {
    return { ok: false, error: "A check must be a single SELECT or WITH query" };
  }

  const { count, sample } = wrapForDryRun(sql);
  try {
    return await run(async (client) => {
      await client.query(`SET LOCAL statement_timeout = ${DRY_RUN_TIMEOUT_MS}`);
      const counted = await client.query<{ n: number }>(singleStatement(count));
      const sampled = await client.query(singleStatement(sample));
      return { ok: true as const, rowCount: counted.rows[0]?.n ?? 0, sample: sampled.rows };
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
