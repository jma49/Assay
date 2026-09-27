import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import middleware from "./middleware";

const run = async (path: string, cookie?: string) =>
  middleware(new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined));

const SESSION = "better-auth.session_token=abc.def";

const GUEST = `assay_guest=${"a".repeat(32)}`;

describe("middleware", () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  });

  it("rejects every request when authentication is not configured", async () => {
    delete process.env.BETTER_AUTH_SECRET;

    const res = await run("/api/run-check", SESSION);

    expect(res.status).toBe(503);
  });

  it("keeps sign-in and the machine endpoints reachable without a session", async () => {
    for (const path of ["/api/auth/sign-in/social", "/api/auth/callback/github", "/api/notifications/dispatch", "/api/integrations/slack/interactions"]) {
      expect((await run(path)).headers.get("location"), path).toBeNull();
    }
  });

  it("serves the generated icons without a session", async () => {
    for (const path of ["/apple-icon", "/icon.svg"]) {
      expect((await run(path)).headers.get("location"), path).toBeNull();
    }
  });

  it("lets public routes through without a session", async () => {
    const res = await run("/sign-in");

    expect(res.headers.get("location")).toBeNull();
  });

  it("serves the landing page at / without a session", async () => {
    const res = await run("/");

    expect(res.headers.get("location")).toBeNull();
  });

  it("serves the docs without a session", async () => {
    for (const path of ["/docs", "/docs/quick-start"]) {
      const res = await run(path);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("does not let a docs-like prefix open the app or the API", async () => {
    for (const path of ["/docsx", "/api/docs"]) {
      const res = await run(path);
      expect(res.headers.get("location")).toContain("/sign-in");
    }
  });

  it("keeps other pages private when / is public", async () => {
    const res = await run("/dashboard");

    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?redirect_url=%2Fdashboard"
    );
  });

  it("sends signed-out users back to the page they asked for", async () => {
    const res = await run("/manage-scripts?scriptId=demo-duplicate-orders");

    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("http://localhost/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe(
      "/manage-scripts?scriptId=demo-duplicate-orders"
    );
  });

  it("redirects signed-out users to sign-in", async () => {
    const res = await run("/api/execution-details/abc.js");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?redirect_url=%2Fapi%2Fexecution-details%2Fabc.js"
    );
  });

  it("lets signed-in users through", async () => {
    const res = await run("/manage-scripts", SESSION);

    expect(res.headers.get("location")).toBeNull();
  });

  describe("demo guests", () => {
    beforeEach(() => {
      process.env.DEMO_MODE = "true";
    });

    it("lets a guest open the read-only pages and the APIs", async () => {
      for (const path of ["/dashboard", "/checks", "/checks/demo-duplicate-orders", "/manage-scripts", "/view-execution-result/abc", "/api/scripts"]) {
        expect((await run(path, GUEST)).headers.get("location"), path).toBeNull();
      }
    });

    it("sends a guest to sign-up for pages that need an account", async () => {
      for (const path of ["/admin/users", "/scripts/new", "/manage-scripts/approvals"]) {
        expect(new URL((await run(path, GUEST)).headers.get("location")!).pathname, path).toBe("/sign-up");
      }
    });

    it("ignores the guest cookie outside demo mode or when malformed", async () => {
      delete process.env.DEMO_MODE;
      expect(new URL((await run("/dashboard", GUEST)).headers.get("location")!).pathname).toBe("/sign-in");
      process.env.DEMO_MODE = "true";
      expect(new URL((await run("/dashboard", "assay_guest=nope")).headers.get("location")!).pathname).toBe("/sign-in");
    });
  });
});
