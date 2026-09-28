import { defineConfig, devices } from "@playwright/test";

// Screenshots compare two builds taken on the same machine against the same
// data (before and after a change, or the base branch and the pull request
// in CI), so baselines are never committed.
const port = Number(process.env.VISUAL_PORT ?? 3100);
// localhost, not 127.0.0.1: Next builds absolute redirects (such as /demo →
// /checks) with "localhost", and a different origin would trip the CSP.
const baseURL = process.env.VISUAL_BASE_URL ?? `http://localhost:${port}`;

const widths = { phone: 375, desktop: 1280 };
const schemes = ["light", "dark"] as const;

export default defineConfig({
  testDir: "tests/visual",
  globalSetup: "./tests/visual/global-setup.ts",
  snapshotPathTemplate: ".visual/snapshots/{projectName}/{arg}{ext}",
  outputDir: ".visual/results",
  fullyParallel: true,
  // The landing page renders a WebGL model every frame, which makes its
  // full-page screenshot slow in a browser without a GPU.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never", outputFolder: ".visual/report" }]]
    : [["list"]],
  expect: {
    toHaveScreenshot: {
      // Both sides render on the same machine, so unchanged pixels match
      // exactly; the default threshold (0.2) would let token changes such as
      // a darker status colour pass unnoticed.
      threshold: 0.02,
      maxDiffPixels: 20,
      animations: "disabled",
      caret: "hide",
      stylePath: "tests/visual/stable.css",
    },
  },
  use: {
    baseURL,
    reducedMotion: "reduce",
    timezoneId: "UTC",
    locale: "en-US",
  },
  projects: Object.entries(widths).flatMap(([size, width]) =>
    schemes.map((colorScheme) => ({
      name: `${size}-${colorScheme}`,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme,
      },
    })),
  ),
  webServer: process.env.VISUAL_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: true,
      },
});
