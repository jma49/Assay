import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isTrustedScheduler } from "./scheduler-auth";

const URL = "https://assay.example.com/api/cron/run-scheduled";
const KEYS = { QSTASH_CURRENT_SIGNING_KEY: "sig_current_fake", QSTASH_NEXT_SIGNING_KEY: "sig_next_fake" };

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");

/** A QStash-style signature: an HS256 JWT over the URL and the body hash. */
function sign(key: string, { url = URL, body = "", expOffset = 300 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iss: "Upstash", sub: url, iat: now, nbf: now, exp: now + expOffset, jti: "m1", body: b64url(createHash("sha256").update(body).digest()) }),
  );
  const signature = b64url(createHmac("sha256", key).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

function request(headers: Record<string, string>) {
  return new Request(URL, { method: "POST", headers });
}

describe("isTrustedScheduler", () => {
  it("accepts the CRON_SECRET bearer token", async () => {
    expect(await isTrustedScheduler(request({ authorization: "Bearer s3cret" }), "", URL, { CRON_SECRET: "s3cret" })).toBe(true);
    expect(await isTrustedScheduler(request({ authorization: "Bearer wrong" }), "", URL, { CRON_SECRET: "s3cret" })).toBe(false);
  });

  it("refuses a bearer token when CRON_SECRET is unset", async () => {
    expect(await isTrustedScheduler(request({ authorization: "Bearer " }), "", URL, {})).toBe(false);
  });

  it("accepts a QStash signature made with the current or the next key", async () => {
    for (const key of [KEYS.QSTASH_CURRENT_SIGNING_KEY, KEYS.QSTASH_NEXT_SIGNING_KEY]) {
      expect(await isTrustedScheduler(request({ "upstash-signature": sign(key) }), "", URL, KEYS)).toBe(true);
    }
  });

  it("refuses a signature with another key, for another URL, over another body, or expired", async () => {
    const cases = [
      { signature: sign("sig_attacker"), body: "" },
      { signature: sign(KEYS.QSTASH_CURRENT_SIGNING_KEY, { url: "https://assay.example.com/api/other" }), body: "" },
      { signature: sign(KEYS.QSTASH_CURRENT_SIGNING_KEY, { body: "{}" }), body: '{"tampered":true}' },
      { signature: sign(KEYS.QSTASH_CURRENT_SIGNING_KEY, { expOffset: -60 }), body: "" },
    ];
    for (const { signature, body } of cases) {
      expect(await isTrustedScheduler(request({ "upstash-signature": signature }), body, URL, KEYS)).toBe(false);
    }
  });

  it("refuses signatures when the signing keys are not configured, even with QSTASH_DEV on", async () => {
    const signature = sign(KEYS.QSTASH_CURRENT_SIGNING_KEY);
    expect(await isTrustedScheduler(request({ "upstash-signature": signature }), "", URL, { QSTASH_DEV: "true" })).toBe(false);
  });
});
