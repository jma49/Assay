import { serverEnv } from "@/lib/config/env";
type Env = Record<string, string | undefined>;

/**
 * Whether output goes to a CI log. This repository's GitHub Actions logs are
 * public, so there the scheduled runs print only check ids, outcomes and row
 * counts; error text (which PostgreSQL may fill with data values) and
 * connection details stay in the stored runs and the app's own logs.
 */
export const inPublicCi = (env: Env = serverEnv()): boolean => env.CI === "true" || env.GITHUB_ACTIONS === "true";

/** An error's type and code (e.g. `DatabaseError (42P01)`), never its message. */
export function errorKind(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,32}$/i.test(code) ? `${error.name} (${code})` : error.name;
}
