import { beforeEach, describe, expect, it, vi } from "vitest";
import { poolLogLine, withReadOnlyTransaction } from "./db";

const client = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  return { query: vi.fn(), release: vi.fn() };
});

vi.mock("pg", () => {
  class Pool {
    connect = vi.fn(async () => client);
    query = vi.fn(async () => ({ rows: [] }));
    on = vi.fn();
    end = vi.fn();
  }
  const types = { setTypeParser: vi.fn() };
  return { Pool, types, default: { Pool, types } };
});

const executedSql = () => client.query.mock.calls.map(([sql]) => sql);

// Installed before any test runs, so it sees the logs from lazy pool creation.
const consoleLog = vi.spyOn(console, "log");

describe("pool creation logging", () => {
  it("does not log the database password", async () => {
    await withReadOnlyTransaction(async () => undefined);

    const logged = JSON.stringify(consoleLog.mock.calls);
    expect(logged).toContain("[db] Pool");
    expect(logged).not.toMatch(/user:|pass@/);
  });

  it("names the host outside CI and nothing in public CI logs", () => {
    const url = "postgres://owner:s3cret@db.internal:5432/prod?password=s3cret";
    expect(poolLogLine(url, undefined, {})).toBe("[db] Pool for postgres://****@db.internal:5432/prod?password=****");
    for (const env of [{ CI: "true" }, { GITHUB_ACTIONS: "true" }]) {
      const line = poolLogLine(url, { ca: "ca" }, env);
      expect(line).toBe("[db] Pool created with TLS verified against the configured CA");
      expect(line).not.toMatch(/owner|db\.internal|prod|s3cret/);
    }
  });
});

describe("withReadOnlyTransaction", () => {
  beforeEach(() => {
    client.query.mockReset().mockResolvedValue({ rows: [] });
    client.release.mockReset();
  });

  it("runs fn inside a read-only transaction on one connection", async () => {
    const result = await withReadOnlyTransaction(async (c) => {
      await c.query("SELECT 1");
      return "done";
    });

    expect(result).toBe("done");
    expect(executedSql()).toEqual(["BEGIN READ ONLY", "SELECT 1", "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back, releases the connection and rethrows on failure", async () => {
    const failure = new Error("cannot execute DELETE in a read-only transaction");

    await expect(
      withReadOnlyTransaction(async () => {
        throw failure;
      })
    ).rejects.toBe(failure);

    expect(executedSql()).toEqual(["BEGIN READ ONLY", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("still rethrows the original error when rollback fails", async () => {
    const failure = new Error("query failed");
    client.query.mockImplementation(async (sql: string) => {
      if (sql === "ROLLBACK") throw new Error("connection lost");
      return { rows: [] };
    });

    await expect(
      withReadOnlyTransaction(async () => {
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(client.release).toHaveBeenCalledOnce();
  });
});

describe("tlsOptions", () => {
  const read = vi.fn(async (url: string) => Buffer.from(`cert:${url}`));
  beforeEach(() => read.mockClear());

  it("verifies the server against the configured CA", async () => {
    const { tlsOptions } = await import("./db");
    const ssl = await tlsOptions({ CA_CERT_BLOB_URL: "https://blob.example/ca.pem" }, read);
    expect(ssl?.rejectUnauthorized).toBe(true);
    expect(String(ssl?.ca)).toBe("cert:https://blob.example/ca.pem");
    expect(ssl?.cert).toBeUndefined();
  });

  it("adds a client certificate only when both halves are given", async () => {
    const { tlsOptions } = await import("./db");
    const both = await tlsOptions({ CA_CERT_BLOB_URL: "https://b/ca", CLIENT_CERT_BLOB_URL: "https://b/c", CLIENT_KEY_BLOB_URL: "https://b/k" }, read);
    expect(String(both?.cert)).toBe("cert:https://b/c");
    expect(String(both?.key)).toBe("cert:https://b/k");
    const half = await tlsOptions({ CA_CERT_BLOB_URL: "https://b/ca", CLIENT_CERT_BLOB_URL: "https://b/c" }, read);
    expect(half?.cert).toBeUndefined();
  });

  it("leaves TLS to DATABASE_URL without a CA, and refuses certificates over plain http", async () => {
    const { tlsOptions } = await import("./db");
    expect(await tlsOptions({}, read)).toBeUndefined();
    await expect(tlsOptions({ CA_CERT_BLOB_URL: "http://blob.example/ca.pem" })).rejects.toThrow(/https/);
  });
});

describe("pool", () => {
  it("is created once even when the first calls race", async () => {
    const pg = await import("pg");
    const created = vi.spyOn(pg, "Pool");
    const db = await import("./db");
    await db.closePool();
    await Promise.all([db.withReadOnlyTransaction(async () => 1), db.withReadOnlyTransaction(async () => 2), db.query("SELECT 1")]);
    expect(created.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
