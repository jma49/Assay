import type { QueryConfig } from "pg";

/**
 * A query sent over the extended protocol, where PostgreSQL rejects more than
 * one statement. User SQL is split and validated first; this is the backstop
 * that stops a statement from smuggling in `; END; ...` and running the rest
 * outside the read-only transaction.
 */
export function singleStatement(text: string): QueryConfig {
  return { text, queryMode: "extended" } as QueryConfig;
}
