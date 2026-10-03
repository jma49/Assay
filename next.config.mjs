import { withSentryConfig } from "@sentry/nextjs/config";
import { LEGACY_PAGE_REDIRECTS } from "./src/lib/legacy-redirects.mjs";

const isDev = process.env.NODE_ENV === "development";

// Everything the app loads is same-origin (sign-in is Better Auth on this
// domain, fonts are self-hosted by next/font); only avatars come from the
// OAuth providers' image hosts, and browser error telemetry goes to Sentry's
// ingest hosts when NEXT_PUBLIC_SENTRY_DSN is set. Next.js needs inline
// scripts to hydrate, and the dev server also needs eval and a websocket
// for hot reload.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Sentry ingest: without this the browser blocks the telemetry upload.
  `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            // Warnings are operational (e.g. both old and new collection
            // names exist) and must reach the Vercel logs too.
            exclude: ["error", "warn"],
          }
        : false,
  },
  ...(process.env.NODE_ENV === "development" && {
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
  }),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  async redirects() {
    return LEGACY_PAGE_REDIRECTS;
  },
};

export default withSentryConfig(nextConfig, {
  // Source map upload and release management. Set SENTRY_ORG, SENTRY_PROJECT
  // and SENTRY_AUTH_TOKEN to enable; without them error capture still works.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Tree-shake Sentry's internal logger statements from the client bundle.
  disableLogger: true,
});
