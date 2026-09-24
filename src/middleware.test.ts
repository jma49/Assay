import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import middleware from "./middleware";

const auth = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware:
    (handler: (auth: unknown, req: NextRequest) => unknown) =>
    (req: NextRequest) =>
      handler(auth, req),
  createRouteMatcher: (patterns: string[]) => (req: NextRequest) =>
    patterns.some((p) => new RegExp(`^${p}$`).test(req.nextUrl.pathname)),
}));

const run = (path: string) =>
  (middleware as unknown as (req: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost${path}`)
  );

describe("middleware", () => {
  beforeEach(() => {
    auth.mockReset();
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_x";
  });

  it("rejects every request when Clerk is not configured", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const res = await run("/api/run-check");

    expect(res.status).toBe(503);
    expect(auth).not.toHaveBeenCalled();
  });

  it("lets public routes through without a session", async () => {
    const res = await run("/sign-in");

    expect(res.headers.get("location")).toBeNull();
    expect(auth).not.toHaveBeenCalled();
  });

  it("serves the landing page at / without a session", async () => {
    const res = await run("/");

    expect(res.headers.get("location")).toBeNull();
    expect(auth).not.toHaveBeenCalled();
  });

  it("keeps other pages private when / is public", async () => {
    auth.mockResolvedValue({ userId: null });

    const res = await run("/manage-scripts");

    expect(res.headers.get("location")).toBe("http://localhost/sign-in");
  });

  it("redirects signed-out users to sign-in", async () => {
    auth.mockResolvedValue({ userId: null });

    const res = await run("/api/execution-details/abc.js");

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/sign-in");
  });

  it("lets signed-in users through", async () => {
    auth.mockResolvedValue({ userId: "user_1" });

    const res = await run("/manage-scripts");

    expect(res.headers.get("location")).toBeNull();
  });
});
