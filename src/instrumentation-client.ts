import * as Sentry from "@sentry/nextjs";

// Next.js runs this file in the browser before the app is interactive
// (webpack and Turbopack alike; sentry.client.config.ts is webpack-only).
// NEXT_PUBLIC_SENTRY_DSN is the same value as SENTRY_DSN; unset it and the
// SDK stays disabled. NEXT_PUBLIC_SENTRY_RELEASE /
// NEXT_PUBLIC_SENTRY_ENVIRONMENT are optional tags (release and environment
// default when unset).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  // Error tracking only. PII is not attached to events by default.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
});

// Reports client-side navigations as breadcrumbs.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
