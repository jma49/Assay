import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/**
 * node-postgres attaches these to DatabaseError as enumerable fields; the
 * values can hold SQL fragments and data (e.g. detail: "Key
 * (email)=(someone@example.com) already exists"). The SDK serializes the
 * error into the event (frame locals), so they must be stripped before the
 * event leaves the process.
 */
const PG_SENSITIVE_FIELDS = ["detail", "hint", "internalQuery", "where", "internalPosition"] as const;

/** A node-postgres DatabaseError carries the SQLSTATE in `code` (e.g. "23505"). */
function isPostgresError(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)["code"] === "string"
  );
}

/**
 * Deletes the pg-specific fields that can carry SQL fragments or data
 * values. A no-op for anything that is not a pg error: only objects with a
 * string `code` are touched. Exported for unit testing.
 */
export function scrubPostgresError(target: unknown): void {
  if (!isPostgresError(target)) return;
  for (const field of PG_SENSITIVE_FIELDS) delete target[field];
}

/**
 * beforeSend: strips pg data fields from the live error and from its
 * already-serialized copies inside the event (the local-variables
 * integration normalizes the error into frame `vars`, keeping every
 * enumerable field). Exported for unit testing.
 */
export function scrubPostgresEvent(event: ErrorEvent, hint: EventHint | undefined): ErrorEvent {
  if (!isPostgresError(hint?.originalException)) return event;
  scrubPostgresError(hint?.originalException);
  for (const value of event.exception?.values ?? []) {
    for (const frame of value.stacktrace?.frames ?? []) {
      const vars = frame.vars as Record<string, unknown> | undefined;
      if (!vars) continue;
      for (const local of Object.values(vars)) scrubPostgresError(local);
    }
  }
  return event;
}

// Runs in the Node.js runtime (route handlers, server components) via
// src/instrumentation.ts. When SENTRY_DSN is unset the SDK stays disabled:
// nothing is sent and nothing throws, so self-hosted installs without Sentry
// keep working.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // Error tracking only: no performance traces, so the free quota is spent
  // on errors. PII is not attached to events by default.
  tracesSampleRate: 0,
  // errorResponse (src/server/http/route.ts) reports the raw error; make
  // sure node-postgres DatabaseErrors do not carry SQL fragments or data
  // values into Sentry.
  beforeSend: (event, hint) => scrubPostgresEvent(event, hint),
});
