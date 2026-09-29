import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const run = async (path: string, cookie?: string) =>
  proxy(new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined));

const SESSION = "better-auth.session_token=abc.def";

const GUEST = `assay_guest=${"a".repeat(32)}`;

describe("proxy", () => {
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
    const res = await run("/runs");

    expect(res.headers.get("location")).toBe(
      "http://localhost/sign-in?redirect_url=%2Fruns"
    );
  });

  it("sends signed-out users back to the page they asked for", async () => {
    const res = await run("/checks/manage?scriptId=demo-duplicate-orders");

    const location = new URL(res.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("http://localhost/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe(
      "/checks/manage?scriptId=demo-duplicate-orders"
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
    const res = await run("/checks/manage", SESSION);

    expect(res.headers.get("location")).toBeNull();
  });

  it("accepts every session cookie name Better Auth sets", async () => {
    for (const cookie of ["__Secure-better-auth.session_token=secure; other=1", "better-auth-session_token=legacy"]) {
      expect((await run("/checks/manage", cookie)).headers.get("location"), cookie).toBeNull();
    }
  });

  it("does not count an empty session cookie or the session cache as a session", async () => {
    for (const cookie of ["better-auth.session_token=", "better-auth.session_data=cached", "theme=dark"]) {
      expect(new URL((await run("/checks/manage", cookie)).headers.get("location")!).pathname, cookie).toBe("/sign-in");
    }
  });

  describe("demo guests", () => {
    beforeEach(() => {
      process.env.DEMO_MODE = "true";
    });

    it("lets a guest open the read-only pages and the APIs", async () => {
      for (const path of ["/runs", "/checks", "/checks/demo-duplicate-orders", "/checks/manage", "/runs/abc", "/api/scripts"]) {
        expect((await run(path, GUEST)).headers.get("location"), path).toBeNull();
      }
    });

    it("sends a guest to sign-up for pages that need an account", async () => {
      for (const path of ["/admin/users", "/checks/new", "/checks/manage/history", "/approvals"]) {
        expect(new URL((await run(path, GUEST)).headers.get("location")!).pathname, path).toBe("/sign-up");
      }
    });

    it("ignores the guest cookie outside demo mode or when malformed", async () => {
      delete process.env.DEMO_MODE;
      expect(new URL((await run("/runs", GUEST)).headers.get("location")!).pathname).toBe("/sign-in");
      process.env.DEMO_MODE = "true";
      expect(new URL((await run("/runs", "assay_guest=nope")).headers.get("location")!).pathname).toBe("/sign-in");
    });
  });
});
