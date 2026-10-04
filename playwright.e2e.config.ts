import { defineConfig, devices } from "@playwright/test";

// Behaviour tests: the main flows a demo guest can take, against a running
// build with the demo data (CI: the pull request's server in the visual job).
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: ".visual/e2e-results",
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL, locale: "en-US", timezoneId: "UTC" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: `npx next start -p ${port}`, url: baseURL, reuseExistingServer: true },
});
