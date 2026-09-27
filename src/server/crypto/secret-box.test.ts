import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hasSecretKey, open, safeEqual, seal, SecretKeyMissingError, signToken, verifyToken } from "./secret-box";

const env = { ASSAY_SECRET_KEY: randomBytes(32).toString("base64") };
const otherEnv = { ASSAY_SECRET_KEY: randomBytes(32).toString("base64") };

describe("seal / open", () => {
  it("round-trips and never repeats a ciphertext", () => {
    const a = seal("https://hooks.slack.com/services/T/B/x", env);
    const b = seal("https://hooks.slack.com/services/T/B/x", env);
    expect(a).not.toBe(b);
    expect(a).not.toContain("hooks.slack.com");
    expect(open(a, env)).toBe("https://hooks.slack.com/services/T/B/x");
  });

  it("rejects a tampered ciphertext or another key", () => {
    const sealed = seal("secret", env);
    const parts = sealed.split(".");
    parts[3] = Buffer.from("other!").toString("base64url");
    expect(() => open(parts.join("."), env)).toThrow();
    expect(() => open(sealed, otherEnv)).toThrow();
  });

  it("needs a 32-byte key", () => {
    expect(() => seal("x", {})).toThrow(SecretKeyMissingError);
    expect(() => seal("x", { ASSAY_SECRET_KEY: "c2hvcnQ=" })).toThrow(/32 bytes/);
    expect(hasSecretKey({})).toBe(false);
    expect(hasSecretKey(env)).toBe(true);
  });
});

describe("signToken / verifyToken", () => {
  it("verifies its own tokens until they expire", () => {
    const token = signToken({ uid: "u1" }, 1000, 0, env);
    expect(verifyToken<{ uid: string }>(token, 500, env)?.uid).toBe("u1");
    expect(verifyToken(token, 1001, env)).toBeNull();
  });

  it("rejects forged or foreign tokens", () => {
    const token = signToken({ uid: "u1" }, 1000, 0, env);
    const [, mac] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "admin", exp: 999 })).toString("base64url")}.${mac}`;
    expect(verifyToken(forged, 0, env)).toBeNull();
    expect(verifyToken(token, 0, otherEnv)).toBeNull();
    expect(verifyToken("garbage", 0, env)).toBeNull();
  });
});

it("safeEqual compares exactly", () => {
  expect(safeEqual("abc", "abc")).toBe(true);
  expect(safeEqual("abc", "abd")).toBe(false);
  expect(safeEqual("abc", "abcd")).toBe(false);
});
