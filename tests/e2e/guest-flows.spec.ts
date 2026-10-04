import { type APIRequestContext, expect, test } from "@playwright/test";

// Any 32-hex token is a valid demo guest; see src/lib/auth/guest.ts.
const GUEST_TOKEN = "fedcba9876543210fedcba9876543210";

type Summary = { scriptId: string; name: string; state: { outcome: "error" | "issues" | "clean"; lastRunId: string } | null };

let testNumber = 0;
test.beforeEach(async ({ context, baseURL }) => {
  testNumber += 1;
  await context.addCookies([{ name: "assay_guest", value: GUEST_TOKEN, url: baseURL }]);
  // Its own client address, so demo-run and sign-in rate limits never mix tests (see tests/visual).
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `198.19.0.${testNumber}`, cookie: `assay_guest=${GUEST_TOKEN}` });
});

async function checks(request: APIRequestContext): Promise<Summary[]> {
  const response = await request.get("/api/checks", { headers: { cookie: `assay_guest=${GUEST_TOKEN}` } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { checks: Summary[] }).checks;
}

test("the Issues tile filters the list to checks that found rows", async ({ page, request }) => {
  const all = await checks(request);
  const issues = all.filter((check) => check.state?.outcome === "issues");
  test.skip(issues.length === 0, "the demo data has no check with issues");

  await page.goto("/checks");
  await page.getByRole("button", { name: /^With issues/ }).click();
  await expect(page.getByText("Issues found")).toBeVisible();
  await expect(page.getByText("Broken checks")).toHaveCount(0);
  for (const check of issues) await expect(page.getByText(check.name, { exact: true }).first()).toBeVisible();
});

test("a guest runs a demo check and the new run appears", async ({ page, request }) => {
  const check = (await checks(request)).find((c) => c.state);
  test.skip(!check, "the demo data has no check that ran");
  const before = check!.state!.lastRunId;

  await page.goto(`/checks/${check!.scriptId}`);
  await page.getByRole("button", { name: "Run now" }).click();
  await expect(page.getByRole("button", { name: "Run now" })).toBeEnabled({ timeout: 45_000 });

  await expect
    .poll(async () => (await checks(request)).find((c) => c.scriptId === check!.scriptId)?.state?.lastRunId, { timeout: 30_000 })
    .not.toBe(before);
});

test("a run's report opens from its id", async ({ page, request }) => {
  const check = (await checks(request)).find((c) => c.state?.outcome === "issues") ?? (await checks(request)).find((c) => c.state);
  test.skip(!check, "the demo data has no run");

  const response = await page.goto(`/runs/${check!.state!.lastRunId}`);
  expect(response?.ok()).toBe(true);
  await expect(page.getByText(check!.name).first()).toBeVisible();
});

test("a guest cannot create a check", async ({ page, request }) => {
  // The proxy keeps guests off the editor and sends them to sign up.
  await page.goto("/checks/new");
  await expect(page).toHaveURL(/\/sign-up\?redirect_url=%2Fchecks%2Fnew/);

  const response = await request.post("/api/checks", {
    headers: { cookie: `assay_guest=${GUEST_TOKEN}` },
    data: { scriptId: "e2e-should-not-exist", name: "Nope", sqlContent: "SELECT 1" },
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
});
