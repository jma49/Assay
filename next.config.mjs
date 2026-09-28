import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { LEGACY_PAGE_REDIRECTS } from "./src/lib/legacy-redirects.mjs";

const isDev = process.env.NODE_ENV === "development";

// Everything the app loads is same-origin (sign-in is Better Auth on this
// domain, fonts are self-hosted by next/font); only avatars come from the
// OAuth providers' image hosts. Next.js needs inline scripts to hydrate, and
// the dev server also needs eval and a websocket for hot reload.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.2.1",
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
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
      {
        source: "/_next/static/css/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              process.env.NODE_ENV === "development"
                ? "no-cache, no-store, must-revalidate"
                : "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return LEGACY_PAGE_REDIRECTS;
  },
  async rewrites() {
    return [
      // In development, a stale layout.css request would 404; serve an empty stylesheet instead.
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              source: "/_next/static/css/app/layout.css",
              destination: "/api/css-fallback",
            },
          ]
        : []),
    ];
  },
};

// The dev server writes to its own folder, so `npm run build` or `preview`
// while `npm run dev` is running cannot overwrite its files and break it.
export default function config(phase) {
  return phase === PHASE_DEVELOPMENT_SERVER ? { ...nextConfig, distDir: ".next-dev" } : nextConfig;
}
