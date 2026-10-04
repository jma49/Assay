import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

// Any 32-hex token is a valid demo guest; see src/lib/auth/guest.ts.
const GUEST_TOKEN = "0123456789abcdef0123456789abcdef";
const GUEST_COOKIE = `assay_guest=${GUEST_TOKEN}`;

type Summary = { scriptId: string; state: { outcome: "error" | "issues" | "clean"; lastRunId: string } | null };
type Ids = { issues?: Summary; error?: Summary; clean?: Summary };

type Target = {
  name: string;
  guest?: boolean;
  path: string | ((ids: Ids) => string | null | undefined);
};

const targets: Target[] = [
  { name: "landing", path: "/" },
  { name: "sign-in", path: "/sign-in" },
  { name: "docs-quick-start", path: "/docs/quick-start" },
  { name: "docs-writing-checks", path: "/docs/writing-checks" },
  { name: "unauthorized", path: "/unauthorized" },
  { name: "checks", guest: true, path: "/checks" },
  { name: "check-issues", guest: true, path: (ids) => ids.issues && `/checks/${ids.issues.scriptId}` },
  { name: "check-broken", guest: true, path: (ids) => ids.error && `/checks/${ids.error.scriptId}` },
  { name: "check-clean", guest: true, path: (ids) => ids.clean && `/checks/${ids.clean.scriptId}` },
  { name: "checks-manage", guest: true, path: "/checks/manage" },
  { name: "runs", guest: true, path: "/runs" },
  { name: "run-report", guest: true, path: (ids) => ids.issues?.state && `/runs/${ids.issues.state.lastRunId}` },
  { name: "coverage", guest: true, path: "/coverage" },
  { name: "analysis", guest: true, path: "/data-analysis" },
  { name: "activity", guest: true, path: "/activity" },
  { name: "notifications", guest: true, path: "/settings/notifications" },
];

const languages = ["en", "zh"] as const;

/** One check per outcome, the first by id, so both sides pick the same ones. */
async function checkIds(request: APIRequestContext): Promise<Ids> {
  const response = await request.get("/api/checks", { headers: { cookie: GUEST_COOKIE } });
  expect(response.ok(), `GET /api/checks as a guest: ${response.status()}`).toBe(true);
  const { checks } = (await response.json()) as { checks: Summary[] };
  const sorted = [...checks].sort((a, b) => a.scriptId.localeCompare(b.scriptId));
  const first = (outcome: string) => sorted.find((check) => check.state?.outcome === outcome);
  return { issues: first("issues"), error: first("error"), clean: first("clean") };
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

for (const language of languages) {
  for (const target of targets) {
    test(`${language} ${target.name}`, async ({ page, context, request, baseURL }, testInfo) => {
      const path = typeof target.path === "string" ? target.path : target.path(await checkIds(request));
      test.skip(!path, `the seeded data has no check for ${target.name}`);

      if (target.guest) await context.addCookies([{ name: "assay_guest", value: GUEST_TOKEN, url: baseURL }]);
      await page.addInitScript((lang) => localStorage.setItem("assay-language", lang), language);
      await page.clock.setFixedTime(new Date(process.env.VISUAL_NOW ?? Date.now()));

      const errors = collectErrors(page);
      const response = await page.goto(path as string);
      // Some pages keep polling (sign-in), so the network may never go idle;
      // the skeleton check and the screenshot's own stability check follow.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      expect(response?.url(), "the page redirected elsewhere").toContain(path);
      await expect(page.locator(".skeleton-shimmer")).toHaveCount(0, { timeout: 15_000 });
      // The language provider sets <html lang> after hydration, and Chinese
      // glyphs fall back to a different CJK face until it does.
      await expect(page.locator("html")).toHaveAttribute("lang", language === "zh" ? "zh-CN" : "en");
      await page.evaluate(() => document.fonts.ready);


      await expect(page).toHaveScreenshot(`${language}-${target.name}.png`, { fullPage: true, timeout: 30_000 });

      // A baseline run records the base branch as it is; only the change
      // under test must be free of errors.
      const recordingBaseline = ["all", "changed"].includes(testInfo.config.updateSnapshots);
      if (!recordingBaseline) expect(errors).toEqual([]);
    });
  }
}
