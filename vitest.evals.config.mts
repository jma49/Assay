import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/** Evals call a real model; they run only through `npm run eval`, never with `npm test`. */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    testTimeout: 120_000,
    fileParallelism: false,
    // DATABASE_URL and gateway credentials from .env.local; AI_ENABLED must still be set on the command line.
    env: loadEnv("", process.cwd(), ""),
  },
});
