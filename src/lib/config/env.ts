/**
 * Every environment variable Assay reads, declared once. Server code reads
 * the environment only through serverEnv() (ESLint forbids process.env
 * elsewhere), and env.test.ts next to it fails when code reads a name that
 * is not declared here, or when a declared name is missing from
 * .env.example. Edge-safe: no Node APIs, so the proxy can import it.
 */

type Kind =
  /** A production server refuses to start without it (src/lib/config/required-env.ts). */
  | "required"
  /** Turns a feature on or tunes a limit; documented in .env.example. */
  | "optional"
  /** Set by the runtime or the host (Node, Next.js, Vercel, GitHub Actions), not by people. */
  | "platform";

interface EnvVar {
  kind: Kind;
  /** The expected form, checked on start when the variable is set. */
  format?: Format;
}

type Format = "url" | "mongodb-uri" | "postgres-uri" | "int" | "bool" | "base64-32";

function decodedLength(base64: string): number {
  try {
    return atob(base64).length;
  } catch {
    return -1;
  }
}

const FORMATS: Record<Format, { valid: (value: string) => boolean; expected: string }> = {
  url: { valid: (v) => URL.canParse(v) && /^https?:/i.test(v), expected: "an http(s) URL" },
  "mongodb-uri": { valid: (v) => /^mongodb(\+srv)?:\/\//i.test(v), expected: "a mongodb:// or mongodb+srv:// URI" },
  "postgres-uri": { valid: (v) => /^postgres(ql)?:\/\//i.test(v), expected: "a postgres:// or postgresql:// URI" },
  int: { valid: (v) => /^\d+$/.test(v), expected: "a whole number" },
  bool: { valid: (v) => v === "true" || v === "false", expected: '"true" or "false"' },
  "base64-32": { valid: (v) => /^[A-Za-z0-9+/]+={0,2}$/.test(v) && decodedLength(v) === 32, expected: "32 bytes, base64-encoded" },
};

export const ENV_VARS = {
  // Sign-in
  BETTER_AUTH_SECRET: { kind: "required" },
  BETTER_AUTH_URL: { kind: "optional", format: "url" },
  GOOGLE_CLIENT_ID: { kind: "optional" },
  GOOGLE_CLIENT_SECRET: { kind: "optional" },
  GITHUB_CLIENT_ID: { kind: "optional" },
  GITHUB_CLIENT_SECRET: { kind: "optional" },
  ALLOWED_EMAIL_DOMAINS: { kind: "optional" },
  AUTH_DEV_PASSWORD_LOGIN: { kind: "optional", format: "bool" },
  // Data
  MONGODB_URI: { kind: "required", format: "mongodb-uri" },
  MONGODB_DB_NAME: { kind: "optional" },
  DATABASE_URL: { kind: "required", format: "postgres-uri" },
  SEED_DATABASE_URL: { kind: "optional", format: "postgres-uri" },
  CA_CERT_BLOB_URL: { kind: "optional", format: "url" },
  CLIENT_CERT_BLOB_URL: { kind: "optional", format: "url" },
  CLIENT_KEY_BLOB_URL: { kind: "optional", format: "url" },
  UPSTASH_REDIS_REST_URL: { kind: "optional", format: "url" },
  UPSTASH_REDIS_REST_TOKEN: { kind: "optional" },
  ALLOW_PRIVATE_DATA_SOURCES: { kind: "optional", format: "bool" },
  // Runs
  CHECK_TIMEOUT_MS: { kind: "optional", format: "int" },
  CHECK_CONCURRENCY: { kind: "optional", format: "int" },
  PG_POOL_MAX: { kind: "optional", format: "int" },
  PG_SOURCE_POOL_MAX: { kind: "optional", format: "int" },
  RUN_RETENTION_DAYS: { kind: "optional", format: "int" },
  // Alerts, data sources and the scheduler
  ASSAY_SECRET_KEY: { kind: "optional", format: "base64-32" },
  APP_URL: { kind: "required", format: "url" },
  CRON_SECRET: { kind: "optional" },
  QSTASH_CURRENT_SIGNING_KEY: { kind: "optional" },
  QSTASH_NEXT_SIGNING_KEY: { kind: "optional" },
  SLACK_CLIENT_ID: { kind: "optional" },
  SLACK_CLIENT_SECRET: { kind: "optional" },
  SLACK_SIGNING_SECRET: { kind: "optional" },
  DISCORD_CLIENT_ID: { kind: "optional" },
  DISCORD_CLIENT_SECRET: { kind: "optional" },
  TELEGRAM_BOT_TOKEN: { kind: "optional" },
  TELEGRAM_BOT_USERNAME: { kind: "optional" },
  TELEGRAM_WEBHOOK_SECRET: { kind: "optional" },
  // AI (AI_GATEWAY_API_KEY is read by the AI SDK itself)
  AI_ENABLED: { kind: "optional", format: "bool" },
  AI_GATEWAY_MODEL: { kind: "optional" },
  AI_GATEWAY_API_KEY: { kind: "optional" },
  // Demo
  DEMO_MODE: { kind: "optional", format: "bool" },
  TRUSTED_PROXY_COUNT: { kind: "optional", format: "int" },
  // Error tracking
  SENTRY_DSN: { kind: "optional", format: "url" },
  NEXT_PUBLIC_SENTRY_DSN: { kind: "optional", format: "url" },
  NEXT_PUBLIC_SENTRY_RELEASE: { kind: "optional" },
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: { kind: "optional" },
  // Set by the runtime or the host
  NODE_ENV: { kind: "platform" },
  NEXT_RUNTIME: { kind: "platform" },
  NEXT_PHASE: { kind: "platform" },
  VERCEL: { kind: "platform" },
  VERCEL_ENV: { kind: "platform" },
  VERCEL_GIT_COMMIT_SHA: { kind: "platform" },
  VERCEL_PROJECT_PRODUCTION_URL: { kind: "platform" },
  CI: { kind: "platform" },
  GITHUB_ACTIONS: { kind: "platform" },
  GITHUB_RUN_ID: { kind: "platform" },
} as const satisfies Record<string, EnvVar>;

export type EnvName = keyof typeof ENV_VARS;

/** The environment as server code sees it: only declared names type-check. */
export type ServerEnv = Partial<Record<EnvName, string>>;

/** The process environment. The one place server code reads it. */
export function serverEnv(): ServerEnv {
  return process.env as ServerEnv;
}

/** Names of the variables a production server cannot start without, in declaration order. */
export const REQUIRED_ENV_NAMES = (Object.keys(ENV_VARS) as EnvName[]).filter((name) => ENV_VARS[name].kind === "required");

export interface EnvProblem {
  name: EnvName;
  expected: string;
}

/** Set variables whose value does not have the expected form. Names only: never a value. */
export function envFormatProblems(env: ServerEnv = serverEnv()): EnvProblem[] {
  const problems: EnvProblem[] = [];
  for (const name of Object.keys(ENV_VARS) as EnvName[]) {
    const spec: EnvVar = ENV_VARS[name];
    const value = env[name]?.trim();
    if (!value || !spec.format) continue;
    const format = FORMATS[spec.format];
    if (!format.valid(value)) problems.push({ name, expected: format.expected });
  }
  return problems;
}
