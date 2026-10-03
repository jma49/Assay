import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ checkHealth: vi.fn() }));

vi.mock("@/server/health/checks", () => ({ checkHealth: () => mocks.checkHealth() }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.checkHealth.mockReset();
  });

  it("is public and answers 200 with the component report", async () => {
    mocks.checkHealth.mockResolvedValue({ status: "ok", checks: [{ name: "mongo", status: "ok" }] });
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", checks: [{ name: "mongo", status: "ok" }] });
    // The probe's request id rides along for log correlation.
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("answers 503 while anything is degraded", async () => {
    mocks.checkHealth.mockResolvedValue({ status: "degraded", checks: [{ name: "mongo", status: "down" }] });
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("degraded");
  });

  it("stays a valid probe even if the health check itself throws", async () => {
    mocks.checkHealth.mockRejectedValueOnce(new Error("probe bug"));
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded", checks: [] });
  });
});
