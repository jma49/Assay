import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  dispatchNow: vi.fn(async () => ({ sent: 2 }) as Record<string, unknown> | null),
}));

vi.mock("@/server/services/notify-deps", () => ({ dispatchNow: mocks.dispatchNow }));

import { POST } from "./route";

const dispatch = (authorization?: string) =>
  POST(new NextRequest("http://localhost/api/notifications/dispatch", { method: "POST", headers: authorization ? { authorization } : {} }));

describe("POST /api/notifications/dispatch", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret-value";
    mocks.dispatchNow.mockClear().mockResolvedValue({ sent: 2 });
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("runs the outbox for the CRON_SECRET bearer", async () => {
    const res = await dispatch("Bearer cron-secret-value");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2 });
    expect(mocks.dispatchNow).toHaveBeenCalledOnce();
  });

  it("refuses a missing or wrong secret", async () => {
    for (const header of [undefined, "Bearer wrong", "Bearer ", "Bearer cron-secret-valu", "Bearer cron-secret-value-extra"]) {
      const res = await dispatch(header);
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("unauthorized");
    }
    expect(mocks.dispatchNow).not.toHaveBeenCalled();
  });

  it("refuses everyone when CRON_SECRET is unset or empty", async () => {
    for (const secret of [undefined, ""]) {
      if (secret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = secret;
      expect((await dispatch("Bearer ")).status).toBe(401);
      expect((await dispatch()).status).toBe(401);
    }
    expect(mocks.dispatchNow).not.toHaveBeenCalled();
  });

  it("reports a skip when no secret key is configured", async () => {
    mocks.dispatchNow.mockResolvedValueOnce(null);
    expect(await (await dispatch("Bearer cron-secret-value")).json()).toEqual({ skipped: "ASSAY_SECRET_KEY is not set" });
  });

  it("answers 500 without details when dispatch fails", async () => {
    mocks.dispatchNow.mockRejectedValueOnce(new Error("smtp password wrong"));
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    const res = await dispatch("Bearer cron-secret-value");
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("smtp");
  });
});
