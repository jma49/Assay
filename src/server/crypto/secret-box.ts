import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Encrypts integration secrets (webhook URLs, chat ids) at rest with
 * AES-256-GCM. ASSAY_SECRET_KEY is 32 random bytes, base64; every purpose
 * gets its own key derived with HKDF, so the same key never both encrypts
 * and signs.
 */
const VERSION = "v1";

export class SecretKeyMissingError extends Error {
  constructor() {
    super("ASSAY_SECRET_KEY is not set");
  }
}

function masterKey(env: Record<string, string | undefined>): Buffer {
  const raw = env.ASSAY_SECRET_KEY;
  if (!raw) throw new SecretKeyMissingError();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ASSAY_SECRET_KEY must be 32 bytes, base64-encoded");
  return key;
}

function derive(purpose: string, env: Record<string, string | undefined>): Buffer {
  return Buffer.from(hkdfSync("sha256", masterKey(env), Buffer.alloc(0), `assay:${purpose}`, 32));
}

export function hasSecretKey(env: Record<string, string | undefined> = process.env): boolean {
  try {
    masterKey(env);
    return true;
  } catch {
    return false;
  }
}

export function seal(plaintext: string, env: Record<string, string | undefined> = process.env): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive("secrets", env), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function open(sealed: string, env: Record<string, string | undefined> = process.env): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined) throw new Error("Unrecognised sealed secret");
  const decipher = createDecipheriv("aes-256-gcm", derive("secrets", env), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

/** A tamper-proof, expiring token, e.g. an OAuth `state`. */
export function signToken(payload: object, ttlMs: number, now = Date.now(), env: Record<string, string | undefined> = process.env): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlMs })).toString("base64url");
  const mac = createHmac("sha256", derive("tokens", env)).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyToken<T extends object>(token: string, now = Date.now(), env: Record<string, string | undefined> = process.env): T | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", derive("tokens", env)).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Constant-time comparison for shared secrets such as webhook tokens. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
