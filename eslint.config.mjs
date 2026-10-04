import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Server code logs through src/lib/logging/log.ts: JSON lines with the
    // request id, sensitive keys and URL credentials redacted.
    files: ["src/server/**/*.ts", "src/app/api/**/*.ts", "src/lib/database/**/*.ts", "src/lib/auth/**/*.ts", "src/lib/workflows/**/*.ts"],
    ignores: ["**/*.test.ts", "src/lib/logging/log.ts"],
    rules: { "no-console": "error" },
  },
  {
    // Server code reads the environment through serverEnv() in src/lib/config/env.ts,
    // which declares every variable. Browser code keeps process.env.NEXT_PUBLIC_* and
    // NODE_ENV, which Next.js inlines at build time.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/lib/config/env.ts",
      "src/instrumentation.ts",
      "src/instrumentation-client.ts",
      "src/sentry.*.config.ts",
      "src/components/**",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Read the environment through serverEnv() from @/lib/config/env, and declare new variables there." },
      ],
    },
  },
  // Layering (docs/architecture.md, Module layout): dependencies point one way.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/server/*", "@/lib/*", "@/app/*", "@/components/*", "@/client/*"], message: "src/domain is pure: no app modules." },
        { group: ["next", "next/*", "mongodb", "pg", "react"], message: "src/domain is pure: no frameworks or drivers." },
      ] }],
    },
  },
  {
    files: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/server/*", "@/app/*", "@/components/*"], message: "src/lib is infrastructure: it must not depend on server, app or components." },
      ] }],
    },
  },
  {
    files: ["src/components/**/*.ts", "src/components/**/*.tsx", "src/client/**/*.ts", "src/client/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        {
          group: ["@/server/*", "@/lib/database/*", "@/lib/auth/server", "@/lib/workflows/*", "@/lib/logging/*", "@/lib/config/env"],
          message: "Browser code cannot import server-only modules; go through an API route and @/contracts.",
        },
      ] }],
    },
  },
  {
    // Routes are thin adapters: data access lives in src/server/services and src/server/repos.
    files: ["src/app/**/route.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.property.name='collection']", message: "Routes do not query MongoDB; call a service or repo in src/server." },
      ],
    },
  },
  globalIgnores(["node_modules/**", ".next/**", ".visual/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
