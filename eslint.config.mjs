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
    // Server code logs through src/server/logging/log.ts: JSON lines with the
    // request id, sensitive keys and URL credentials redacted.
    files: ["src/server/**/*.ts", "src/app/api/**/*.ts", "src/lib/database/**/*.ts", "src/lib/auth/**/*.ts", "src/lib/workflows/**/*.ts"],
    ignores: ["**/*.test.ts", "src/server/logging/log.ts"],
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
  globalIgnores(["node_modules/**", ".next/**", ".visual/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
