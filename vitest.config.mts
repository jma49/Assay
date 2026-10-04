import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      include: ["src/server/**/*.ts", "src/domain/**/*.ts", "src/lib/sql/**/*.ts"],
      exclude: ["**/*.test.ts"],
      // A floor a little under today's numbers (2026-10-04: domain 94%,
      // lib/sql 98%, server 78% of lines): the rules people trust most may
      // not lose their tests. Raise them as coverage grows.
      thresholds: {
        "src/domain/**": { lines: 90, branches: 80 },
        "src/lib/sql/**": { lines: 95, branches: 85 },
        "src/server/**": { lines: 75 },
      },
    },
  },
});
