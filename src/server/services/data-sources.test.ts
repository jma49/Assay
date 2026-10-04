import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientConfig } from "pg";
import type { DataSourceDoc } from "@/server/repos/data-source-store";
import { open } from "@/server/crypto/secret-box";

const store = vi.hoisted(() => ({
  docs: new Map<string, DataSourceDoc>(),
  checkCounts: new Map<string, number>(),
}));

vi.mock("@/server/repos/data-source-store", () => ({
  listSourceDocs: async () => [...store.docs.values()],
  findSourceDoc: async (_db: unknown, _ws: string, id: string) => store.docs.get(id) ?? null,
  insertSourceDoc: async (_db: unknown, doc: DataSourceDoc) => {
    if (store.docs.has(doc.sourceId)) throw Object.assign(new Error("E11000"), { code: 11000 });
    store.docs.set(doc.sourceId, structuredClone(doc));
  },
  updateSourceDoc: async (_db: unknown, _ws: string, id: string, version: number, set: Partial<DataSourceDoc>) => {
    const doc = store.docs.get(id);
    if (!doc || doc.version !== version) return null;
    Object.assign(doc, set, { version: version + 1 });
    return doc;
  },
  deleteSourceDoc: async (_db: unknown, _ws: string, id: string) => store.docs.delete(id),
  recordSourceTest: async (_db: unknown, _ws: string, id: string, version: number, test: DataSourceDoc["lastTest"]) => {
    const doc = store.docs.get(id);
    if (doc?.version === version) doc.lastTest = test;
  },
  checkCountsBySource: async () => store.checkCounts,
  countChecksUsing: async (_db: unknown, id: string) => store.checkCounts.get(id) ?? 0,
}));
vi.mock("@/server/datasource/sources", () => ({
  allowPrivateSources: (env: Record<string, string | undefined>) => env.ALLOW_PRIVATE_DATA_SOURCES === "true",
  forgetSource: () => undefined,
  resolveSource: async () => undefined,
}));
vi.mock("@/lib/database/db", () => ({
  defaultConnectionConfig: async () => ({ connectionString: "postgres://env-user:env-pw@primary.example.com/app" }),
}));

import {
  assertDataSourceExists,
  createDataSource,
  deleteDataSource,
  listDataSources,
  testSavedSource,
  testUnsavedConnection,
  updateDataSource,
  type DataSourceDeps,
} from "./data-sources";

const db = {} as never;
const WS = "default";
const admin = { id: "u1", name: "Ada" };
const PASSWORD = "hunter2-secret";
const CONNECTION = `postgresql://reader:${PASSWORD}@billing.example.com/billing?sslmode=require`;

function deps(env: Record<string, string | undefined> = {}): DataSourceDeps & { probed: ClientConfig[]; forgotten: string[] } {
  const probed: ClientConfig[] = [];
  const forgotten: string[] = [];
  return {
    env: { ASSAY_SECRET_KEY: KEY, DATABASE_URL: "postgres://env-user:env-pw@primary.example.com/app", ...env },
    resolve: async (host) => (host.endsWith(".internal") ? ["10.0.0.9"] : ["3.18.12.40"]),
    probe: async (config) => {
      probed.push(config);
      return { ok: true, serverVersion: "17.2", currentUser: String(config.user ?? "env-user"), readOnly: false, writeAccess: ["table_write"] };
    },
    forget: (id) => forgotten.push(id),
    now: () => new Date("2026-09-29T12:00:00Z"),
    probed,
    forgotten,
  };
}
const KEY = randomBytes(32).toString("base64");

const create = (input: Partial<{ sourceId: string; name: string; connectionString: string }> = {}, d = deps()) =>
  createDataSource(db, WS, admin, { sourceId: "billing", name: "Billing", engine: "postgres", connectionString: CONNECTION, ...input }, d);

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return `${(error as { status?: number }).status} ${(error as { code?: string }).code}`;
  }
  return "ok";
}

describe("data sources service", () => {
  beforeEach(() => {
    store.docs.clear();
    store.checkCounts = new Map([["default", 4]]);
  });

  it("seals the connection string and never returns it", async () => {
    const source = await create();
    const stored = store.docs.get("billing")!;
    expect(stored.connection).not.toContain(PASSWORD);
    expect(open(stored.connection, { ASSAY_SECRET_KEY: KEY })).toBe(CONNECTION);
    expect(source).toMatchObject({ sourceId: "billing", display: "reader@billing.example.com:5432/billing", builtIn: false, version: 1, checkCount: 0 });
    expect(JSON.stringify(source)).not.toContain(PASSWORD);
    expect(source).not.toHaveProperty("connection");

    const listed = await listDataSources(db, WS, { guest: false, env: deps().env });
    expect(JSON.stringify(listed)).not.toContain(PASSWORD);
    expect(JSON.stringify(listed)).not.toContain("env-pw");
  });

  it("lists the built-in source first, from DATABASE_URL, with check counts; guests get no display", async () => {
    await create();
    store.checkCounts.set("billing", 2);
    const listed = await listDataSources(db, WS, { guest: false, env: deps().env });
    expect(listed.map((s) => [s.sourceId, s.builtIn, s.checkCount, s.display])).toEqual([
      ["default", true, 4, "env-user@primary.example.com:5432/app"],
      ["billing", false, 2, "reader@billing.example.com:5432/billing"],
    ]);
    const forGuest = await listDataSources(db, WS, { guest: true, env: deps().env });
    expect(forGuest.every((s) => s.display === null)).toBe(true);
    expect((await listDataSources(db, WS, { guest: false, env: {} })).map((s) => s.sourceId)).toEqual(["billing"]);
  });

  it("refuses reserved and taken ids, a missing secret key, and private hosts", async () => {
    expect(await code(create({ sourceId: "default" }))).toBe("400 source_id_reserved");
    expect(await code(create({ sourceId: "test" }))).toBe("400 source_id_reserved");
    expect(await code(create({}, deps({ ASSAY_SECRET_KEY: undefined })))).toBe("503 not_configured");
    expect(await code(create({ connectionString: "postgres://u:p@169.254.169.254/db" }))).toBe("400 host_not_public");
    expect(await code(create({ connectionString: "postgres://u:p@db.corp.internal/db" }))).toBe("400 host_not_public");
    expect(await code(create({ connectionString: "postgres://u:p@billing.example.com/db?sslmode=disable" }))).toBe("400 tls_required");
    expect(store.docs.size).toBe(0);
    await create();
    expect(await code(create())).toBe("409 source_id_taken");
  });

  it("accepts a private host when the deployment allows it", async () => {
    const d = deps({ ALLOW_PRIVATE_DATA_SOURCES: "true" });
    expect(await code(create({ connectionString: "postgres://u:p@db.corp.internal/db?sslmode=disable" }, d))).toBe("ok");
  });

  it("edits onto the version it started from; a new connection clears the last test and drops the pool", async () => {
    await create();
    store.docs.get("billing")!.lastTest = { ok: true, at: new Date() };
    const d = deps();
    const renamed = await updateDataSource(db, WS, "billing", admin, { name: "Billing (EU)", connectionString: "", version: 1 }, d);
    expect(renamed).toMatchObject({ name: "Billing (EU)", version: 2, display: "reader@billing.example.com:5432/billing" });
    expect(store.docs.get("billing")!.lastTest).not.toBeNull();
    expect(open(store.docs.get("billing")!.connection, d.env)).toBe(CONNECTION);

    const moved = await updateDataSource(db, WS, "billing", admin, { connectionString: "postgres://r2:pw2@eu.billing.example.com/b", version: 2 }, d);
    expect(moved).toMatchObject({ version: 3, display: "r2@eu.billing.example.com:5432/b", lastTest: null });
    expect(d.forgotten).toEqual(["billing", "billing"]);

    expect(await code(updateDataSource(db, WS, "billing", admin, { name: "Stale", version: 1 }, d))).toBe("409 conflict");
    expect(await code(updateDataSource(db, WS, "nope", admin, { name: "X", version: 1 }, d))).toBe("404 not_found");
    expect(await code(updateDataSource(db, WS, "default", admin, { name: "X", version: 1 }, d))).toBe("400 built_in_source");
  });

  it("refuses to delete a source checks still use, and the built-in one", async () => {
    await create();
    store.checkCounts.set("billing", 3);
    const d = deps();
    const refused = deleteDataSource(db, WS, "billing", d);
    await expect(refused).rejects.toMatchObject({ status: 409, code: "source_in_use", message: expect.stringContaining("3 checks use") });
    expect(store.docs.has("billing")).toBe(true);
    expect(await code(deleteDataSource(db, WS, "default", d))).toBe("400 built_in_source");

    store.checkCounts.delete("billing");
    await deleteDataSource(db, WS, "billing", d);
    expect(store.docs.has("billing")).toBe(false);
    expect(d.forgotten).toEqual(["billing"]);
  });

  it("tests an unsaved string with the same host rules, through the public-only socket", async () => {
    const d = deps();
    const result = await testUnsavedConnection(CONNECTION, d);
    expect(result).toMatchObject({ ok: true, serverVersion: "17.2", currentUser: "reader", readOnly: false, writeAccess: ["table_write"] });
    expect(d.probed[0]).toMatchObject({ host: "billing.example.com", ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5000 });
    expect(typeof d.probed[0]?.stream).toBe("function");
    expect(await code(testUnsavedConnection("postgres://u:p@127.0.0.1/db", d))).toBe("400 host_not_public");
    expect(d.probed).toHaveLength(1);
  });

  it("records the test of a saved source on the version tested; the built-in one is tested but not stored", async () => {
    await create();
    const d = deps();
    const result = await testSavedSource(db, WS, "billing", d);
    expect(result.ok).toBe(true);
    expect(store.docs.get("billing")!.lastTest).toMatchObject({ ok: true, currentUser: "reader" });

    const builtIn = await testSavedSource(db, WS, "default", d);
    expect(builtIn.ok).toBe(true);
    expect(d.probed[1]).toMatchObject({ connectionString: expect.stringContaining("primary.example.com") });
  });

  it("accepts a check's source only when it exists", async () => {
    await create();
    await expect(assertDataSourceExists(db, WS, undefined)).resolves.toBeUndefined();
    await expect(assertDataSourceExists(db, WS, "default")).resolves.toBeUndefined();
    await expect(assertDataSourceExists(db, WS, "billing")).resolves.toBeUndefined();
    await expect(assertDataSourceExists(db, WS, "gone")).rejects.toMatchObject({ status: 400, code: "unknown_data_source" });
  });
});
