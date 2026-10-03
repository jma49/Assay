import * as Sentry from "@sentry/nextjs";

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
});
