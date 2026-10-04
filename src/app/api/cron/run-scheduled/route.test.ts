import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ trusted: true, run: vi.fn(), verifyUrl: "" }));

vi.mock("@/server/http/scheduler-auth", () => ({
  isTrustedScheduler: vi.fn(async (_request: Request, _body: string, url: string) => {
    mocks.verifyUrl = url;
    return mocks.trusted;
  }),
}));
vi.mock("@/server/services/scheduled-trigger", async () => {
  class TriggerRunError extends Error {
    constructor(readonly summary: object) {
      super("failed");
    }
  }
  return { runScheduledTrigger: (...args: unknown[]) => mocks.run(...args), TriggerRunError };
});

import { POST } from "./route";
import { TriggerRunError } from "@/server/services/scheduled-trigger";

const call = (headers: Record<string, string> = {}) =>
  POST(new NextRequest("https://assay.example.com/api/cron/run-scheduled", { method: "POST", headers }));

describe("POST /api/cron/run-scheduled", () => {
  beforeEach(() => {
    mocks.trusted = true;
    mocks.run.mockReset();
    vi.stubEnv("APP_URL", "https://assay.example.com");
  });

  it("refuses an untrusted caller without running anything", async () => {
    mocks.trusted = false;
    const res = await call();
    expect(res.status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("verifies the signature against the public URL of the endpoint", async () => {
    mocks.run.mockResolvedValue({ ran: 0, failed: 0, deferred: 0, skipped: 0 });
    await call();
    expect(mocks.verifyUrl).toBe("https://assay.example.com/api/cron/run-scheduled");
  });

  it("runs the due checks and answers with counts only", async () => {
    mocks.run.mockResolvedValue({ ran: 2, failed: 0, deferred: 1, skipped: 4 });
    const res = await call({ "upstash-message-id": "msg_1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: 2, failed: 0, deferred: 1, skipped: 4 });
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({ runId: "msg_1" }));
  });

  it("answers 500 when a check failed to run, so QStash retries", async () => {
    mocks.run.mockRejectedValue(new TriggerRunError({ ran: 1, failed: 1, deferred: 0, skipped: 0 }));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ran: 1, failed: 1, deferred: 0, skipped: 0 });
  });

  it("hides internal errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.run.mockRejectedValue(new Error("mongodb://user:pass@host down"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("mongodb://");
  });
});
