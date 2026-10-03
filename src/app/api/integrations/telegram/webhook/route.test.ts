import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  handleUpdate: vi.fn(),
  handleCalls: [] as unknown[][],
}));

vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/integrations/telegram", () => ({
  handleUpdate: (...args: unknown[]) => (mocks.handleCalls.push(args), mocks.handleUpdate(...args)),
}));
vi.mock("@/server/crypto/secret-box", () => ({
  // The timing detail does not matter for these tests; only the comparison.
  safeEqual: (a: string, b: string) => a.length > 0 && a === b,
}));

import { POST } from "./route";

const update = (body: unknown, token?: string) =>
  POST(
    new NextRequest("http://localhost/api/integrations/telegram/webhook", {
      method: "POST",
      headers: token === undefined ? {} : { "x-telegram-bot-api-secret-token": token },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/integrations/telegram/webhook", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cret";
    mocks.handleCalls = [];
    mocks.handleUpdate.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("answers 401 for a wrong or missing secret token", async () => {
    expect((await update({ update_id: 1 }, "wrong")).status).toBe(401);
    expect((await update({ update_id: 1 })).status).toBe(401);
    expect(mocks.handleUpdate).not.toHaveBeenCalled();
  });

  it("answers 401 while no webhook secret is configured", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect((await update({ update_id: 1 }, "s3cret")).status).toBe(401);
    expect(mocks.handleUpdate).not.toHaveBeenCalled();
  });

  it("handles the update and answers ok", async () => {
    const res = await update({ update_id: 7 }, "s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.handleCalls).toEqual([[expect.anything(), { update_id: 7 }]]);
  });

  it("answers 200 anyway when an update cannot be handled, so Telegram stops resending", async () => {
    mocks.handleUpdate.mockRejectedValueOnce(new Error("bad payload"));
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    const res = await update({ update_id: 7 }, "s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
