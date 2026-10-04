import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The header the edge proxy (src/proxy.ts) sets on every request that passes
 * through. It stays a literal there: middleware cannot import this module,
 * because the edge runtime lacks node:async_hooks.
 */
export const REQUEST_ID_HEADER = "x-request-id";

const requestIds = new AsyncLocalStorage<string>();

/**
 * Runs fn with the request id attached. Server code below the call
 * (route handlers, services, repos) then logs with the id included.
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestIds.run(requestId, fn);
}

/** The current request's id; undefined outside a request (scripts, build). */
export function currentRequestId(): string | undefined {
  return requestIds.getStore();
}

export type LogFields = Record<string, unknown>;

/**
 * Keys whose values must never reach the logs verbatim. Substring match,
 * case-insensitive: dbPassword, accessToken, apiKey, connectionString,
 * userEmail and an authorization header value are all redacted.
 */
const SENSITIVE_KEY_PATTERN = /password|secret|token|api[-_]?key|connection|email|authorization/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Returns a copy of `value` with sensitive fields replaced by "[redacted]",
 * recursing into plain objects and arrays. Non-plain values (Date, Error,
 * class instances) pass through untouched so their JSON shape is unchanged.
 * Exported for unit testing.
 */
export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : scrub(val);
    }
    return out;
  }
  return value;
}

function emit(level: "info" | "warn" | "error", message: string, fields: LogFields): void {
  const requestId = currentRequestId();
  // Production builds strip console.log/info (next.config.mjs), so info is a
  // dev-time signal; warn and error always reach the production logs.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(requestId ? { requestId } : {}),
    ...(scrub(fields) as LogFields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** JSON log line for an operation; dropped from production builds. */
export function logInfo(message: string, fields: LogFields = {}): void {
  emit("info", message, fields);
}

/** JSON log line for a recoverable problem; kept in production builds. */
export function logWarn(message: string, fields: LogFields = {}): void {
  emit("warn", message, fields);
}

/** JSON log line for a failure; kept in production builds. */
export function logError(message: string, fields: LogFields = {}): void {
  emit("error", message, fields);
}
