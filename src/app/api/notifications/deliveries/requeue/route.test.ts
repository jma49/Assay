import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requeueDelivery: vi.fn() }));

vi.mock("@/server/repos/notify-store", () => ({
  mongoNotifyStore: () => ({ requeueDelivery: mocks.requeueDelivery }),
}));

vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({ getDb: async () => ({}) }),
}));

vi.mock("@/server/http/route", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/http/route")>();
  return {
    ...mod,
    // Bypasses auth but keeps the real error mapping, like withAuth does.
    withAuth: (
      _access: unknown,
      handler: (req: NextRequest, ctx: { principal: object; params: Record<string, string> }) => Promise<Response>,
    ) =>
      async (req: NextRequest) => {
        try {
          return await handler(req, {
            principal: { id: "u1", name: "Op", email: "op@example.com", isGuest: false },
            params: {},
          });
        } catch (error) {
          return mod.errorResponse(error);
        }
      },
  };
});

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/notifications/deliveries/requeue", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/notifications/deliveries/requeue", () => {
  beforeEach(() => {
    mocks.requeueDelivery.mockReset().mockResolvedValue(true);
  });

  it("requeues a failed delivery", async () => {
    const res = await post({ id: "d1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ requeued: true });
    expect(mocks.requeueDelivery).toHaveBeenCalledWith("default", "d1");
  });

  it("answers 404 when nothing was requeued", async () => {
    mocks.requeueDelivery.mockResolvedValue(false);
    const res = await post({ id: "d1" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("rejects a body without an id", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });
});
