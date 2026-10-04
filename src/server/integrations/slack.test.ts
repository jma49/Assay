import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { blocksAfterAction, verifySlackSignature } from "./slack";

const secret = "8f742231b10e8888abcd99yyyzzz85a5";
const sign = (ts: string, body: string) => `v0=${createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex")}`;

describe("verifySlackSignature", () => {
  const now = 1_790_000_000_000;
  const ts = String(now / 1000);
  const body = "payload=%7B%7D";

  it("accepts Slack's signature", () => {
    expect(verifySlackSignature(body, ts, sign(ts, body), secret, now)).toBe(true);
  });

  it("refuses tampering, other secrets, missing headers and replays", () => {
    expect(verifySlackSignature(`${body}x`, ts, sign(ts, body), secret, now)).toBe(false);
    expect(verifySlackSignature(body, ts, sign(ts, body), "other", now)).toBe(false);
    expect(verifySlackSignature(body, null, sign(ts, body), secret, now)).toBe(false);
    expect(verifySlackSignature(body, ts, sign(ts, body), undefined, now)).toBe(false);
    const old = String(now / 1000 - 600);
    expect(verifySlackSignature(body, old, sign(old, body), secret, now)).toBe(false);
  });
});

describe("blocksAfterAction", () => {
  it("drops the action buttons, keeps Open, and replaces an earlier note", () => {
    const blocks = [
      { type: "section", text: { type: "mrkdwn", text: "Orders found 3 rows" } },
      { type: "actions", elements: [{ action_id: "assay_open" }, { action_id: "assay_ack" }, { action_id: "assay_mute" }] },
    ];
    const once = blocksAfterAction(blocks, "✅ Acknowledged by @ada");
    expect(once[1]?.elements).toEqual([{ action_id: "assay_open" }]);
    const twice = blocksAfterAction(once, "🔕 Muted by @bob");
    expect(twice.filter((b) => b.type === "context")).toHaveLength(1);
    expect(JSON.stringify(twice)).toContain("Muted by @bob");
  });
});
