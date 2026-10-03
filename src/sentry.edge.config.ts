import * as Sentry from "@sentry/nextjs";

// Runs in the edge runtime (middleware) via src/instrumentation.ts.
// Same no-DSN behavior as the server config: disabled, never throws.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0,
});
