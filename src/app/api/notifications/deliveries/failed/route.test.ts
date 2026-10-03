import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ failedDeliveries: vi.fn() }));

vi.mock("@/server/repos/notify-store", () => ({
  mongoNotifyStore: () => ({ failedDeliveries: mocks.failedDeliveries }),
}));

vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({ getDb: async () => ({}) }),
}));

vi.mock("@/server/http/route", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/http/route")>();
  return {
    ...mod,
    withAuth: (
      _access: unknown,
      handler: (req: NextRequest, ctx: { principal: object; params: Record<string, string> }) => Promise<Response>,
    ) =>
      (req: NextRequest) =>
        handler(req, {
          principal: { id: "u1", name: "Op", email: "op@example.com", isGuest: false },
          params: {},
        }),
  };
});

import { GET } from "./route";

const get = (query = "") =>
  GET(new NextRequest(`http://localhost/api/notifications/deliveries/failed${query}`));

describe("GET /api/notifications/deliveries/failed", () => {
  beforeEach(() => {
    mocks.failedDeliveries.mockReset().mockResolvedValue([]);
  });

  it("lists failed deliveries with ISO dates", async () => {
    mocks.failedDeliveries.mockResolvedValue([
      {
        id: "d1",
        eventId: "e1",
        checkId: "orders",
        destinationId: "dest1",
        destinationName: "Ops",
        attempts: 6,
        lastError: "HTTP 500",
        failedAt: new Date("2026-09-28T13:00:00Z"),
      },
    ]);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      deliveries: [
        {
          id: "d1",
          eventId: "e1",
          checkId: "orders",
          destinationId: "dest1",
          destinationName: "Ops",
          attempts: 6,
          lastError: "HTTP 500",
          failedAt: "2026-09-28T13:00:00.000Z",
        },
      ],
    });
    expect(mocks.failedDeliveries).toHaveBeenCalledWith("default", 50);
  });

  it("clamps the limit between 1 and 200", async () => {
    await get("?limit=500");
    expect(mocks.failedDeliveries).toHaveBeenCalledWith("default", 200);
    await get("?limit=abc");
    expect(mocks.failedDeliveries).toHaveBeenCalledWith("default", 50);
  });
});
