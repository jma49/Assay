import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ handleAlertButton: vi.fn() }));

vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/alert-buttons", () => ({
  handleAlertButton: (...args: unknown[]) => mocks.handleAlertButton(...args),
  buttonReply: () => "noted",
}));

import { POST } from "./route";

const SECRET = "signing-secret";
const sign = (body: string, timestamp: string) =>
  `v0=${createHmac("sha256", SECRET).update(`v0:${timestamp}:${body}`).digest("hex")}`;

const post = (payload: unknown, signature?: string) => {
  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  return POST(
    new NextRequest("http://localhost/api/integrations/slack/interactions", {
      method: "POST",
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": signature ?? sign(body, timestamp),
      },
      body,
    }),
  );
};

describe("POST /api/integrations/slack/interactions", () => {
  const original = process.env.SLACK_SIGNING_SECRET;

  beforeEach(() => {
    process.env.SLACK_SIGNING_SECRET = SECRET;
    mocks.handleAlertButton.mockReset().mockResolvedValue("acknowledged");
  });
  afterEach(() => {
    if (original === undefined) delete process.env.SLACK_SIGNING_SECRET;
    else process.env.SLACK_SIGNING_SECRET = original;
  });

  it("answers 401 for a forged signature", async () => {
    const res = await post({ type: "block_actions" }, "v0=deadbeef");
    expect(res.status).toBe(401);
    expect(mocks.handleAlertButton).not.toHaveBeenCalled();
  });

  it("answers 401 while no signing secret is configured", async () => {
    delete process.env.SLACK_SIGNING_SECRET;
    expect((await post({ type: "block_actions" })).status).toBe(401);
    expect(mocks.handleAlertButton).not.toHaveBeenCalled();
  });

  it("answers 200 to non-button traffic without touching anything", async () => {
    const res = await post({ type: "view_submission" });
    expect(res.status).toBe(200);
    expect(mocks.handleAlertButton).not.toHaveBeenCalled();
  });

  it("answers 200 to clicks on buttons it does not own", async () => {
    const res = await post({
      type: "block_actions",
      user: { id: "U1" },
      actions: [{ action_id: "some_link_button", value: "x" }],
    });
    expect(res.status).toBe(200);
    expect(mocks.handleAlertButton).not.toHaveBeenCalled();
  });

  it("handles an acknowledge click as the Slack user and answers 200", async () => {
    const res = await post({
      type: "block_actions",
      user: { id: "U1", username: "alice" },
      actions: [{ action_id: "assay_ack", value: "run:123" }],
      message: { text: "2 duplicate orders", blocks: [] },
    });
    expect(res.status).toBe(200);
    expect(mocks.handleAlertButton).toHaveBeenCalledWith(
      expect.anything(),
      "assay_ack",
      "run:123",
      { id: "slack:U1", name: "@alice" },
      "slack",
    );
  });
});
