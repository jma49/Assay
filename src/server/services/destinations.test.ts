import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { open } from "@/server/crypto/secret-box";
import { createPastedDestination } from "./destinations";

vi.mock("@/server/notify/safe-url", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/notify/safe-url")>();
  return {
    ...original,
    assertPublicHost: async (host: string) => {
      if (host === "internal.example") throw new Error("Webhook host is not public");
      if (host === "typo.example") throw new original.HostNotFoundError(host);
    },
  };
});

beforeAll(() => {
  process.env.ASSAY_SECRET_KEY = randomBytes(32).toString("base64");
});

function fakeDb() {
  const inserted: Record<string, unknown>[] = [];
  const db = { collection: () => ({ insertOne: async (doc: Record<string, unknown>) => (inserted.push(doc), { insertedId: "65f000000000000000000001" }) }) };
  return { db: db as unknown as Db, inserted };
}

const by = { id: "u1", name: "Ada" };
const base = { name: "Alerts", language: "en" as const, alerts: ["broken" as const], tags: [], digest: null, remind: null };

describe("createPastedDestination", () => {
  it("stores the URL sealed and shows only a masked label", async () => {
    const { db, inserted } = fakeDb();
    const { destination, signingSecret } = await createPastedDestination(db, "default", by, {
      ...base,
      kind: "slack",
      url: "https://hooks.slack.com/services/T0/B0/abcdWXYZ",
    });
    expect(destination).toMatchObject({ kind: "slack", label: "hooks.slack.com/…WXYZ", createdBy: "Ada" });
    expect(signingSecret).toBeUndefined();
    expect(JSON.stringify(inserted[0])).not.toContain("abcdWXYZ");
    expect(JSON.parse(open(String(inserted[0].sealed)))).toEqual({ url: "https://hooks.slack.com/services/T0/B0/abcdWXYZ" });
  });

  it("refuses a URL that belongs to another service", async () => {
    const { db, inserted } = fakeDb();
    await expect(
      createPastedDestination(db, "default", by, { ...base, kind: "slack", url: "https://example.com/services/x" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_url" });
    expect(inserted).toHaveLength(0);
  });

  it("gives a generic webhook a signing secret once, and refuses private hosts", async () => {
    const { db, inserted } = fakeDb();
    const { signingSecret } = await createPastedDestination(db, "default", by, { ...base, kind: "webhook", url: "https://hooks.example.com/in" });
    expect(signingSecret).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(JSON.parse(open(String(inserted[0].sealed))).signingSecret).toBe(signingSecret);
    await expect(
      createPastedDestination(db, "default", by, { ...base, kind: "webhook", url: "https://internal.example/in" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      createPastedDestination(db, "default", by, { ...base, kind: "webhook", url: "https://typo.example/in" }),
    ).rejects.toMatchObject({ status: 400, code: "host_not_found", message: "Couldn't resolve host typo.example. Check the URL." });
  });
});

describe("CreateDestination", () => {
  it("needs an alert kind or the daily summary", async () => {
    const { CreateDestination } = await import("@/contracts/notifications");
    const url = "https://hooks.slack.com/services/x";
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, alerts: [] }).success).toBe(false);
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, alerts: [], digest: { enabled: true, hour: 9, timeZone: "Asia/Shanghai" } }).success).toBe(true);
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, digest: { enabled: true, hour: 9, timeZone: "Nowhere/City" } }).success).toBe(false);
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, digest: { enabled: true, hour: 24, timeZone: "UTC" } }).success).toBe(false);
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, remind: { afterHours: 4 } }).success).toBe(true);
    expect(CreateDestination.safeParse({ kind: "slack", name: "A", url, remind: { afterHours: 0.01 } }).success).toBe(false);
  });
});
