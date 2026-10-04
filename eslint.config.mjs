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
  globalIgnores(["node_modules/**", ".next/**", ".visual/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
