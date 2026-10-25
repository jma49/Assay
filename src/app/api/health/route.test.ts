import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ checkHealth: vi.fn(), logWarn: vi.fn() }));

vi.mock("@/server/health/checks", () => ({ checkHealth: () => mocks.checkHealth() }));
vi.mock("@/lib/logging/log", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/logging/log")>()),
  logWarn: (...args: unknown[]) => mocks.logWarn(...args),
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.checkHealth.mockReset();
    mocks.logWarn.mockReset();
  });

  it("is public and answers 200 with the component report", async () => {
    mocks.checkHealth.mockResolvedValue({ status: "ok", checks: [{ name: "mongo", status: "ok" }] });
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", checks: [{ name: "mongo", status: "ok" }] });
    // The probe's request id rides along for log correlation.
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(mocks.logWarn).not.toHaveBeenCalled();
  });

  it("answers 503 while anything is degraded", async () => {
    mocks.checkHealth.mockResolvedValue({ status: "degraded", checks: [{ name: "mongo", status: "down" }] });
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("degraded");
  });

  it("logs which caller saw a degraded report, by user agent only", async () => {
    mocks.checkHealth.mockResolvedValue({ status: "degraded", checks: [{ name: "postgres", status: "down" }] });
    await GET(new NextRequest("http://localhost/api/health", { headers: { "user-agent": "ExampleMonitor/1.0" } }));
    expect(mocks.logWarn).toHaveBeenCalledWith("Health degraded", { caller: "ExampleMonitor/1.0" });
  });

  it("stays a valid probe even if the health check itself throws", async () => {
    mocks.checkHealth.mockRejectedValueOnce(new Error("probe bug"));
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded", checks: [] });
  });
});
