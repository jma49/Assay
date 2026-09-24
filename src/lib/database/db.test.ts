import { beforeEach, describe, expect, it, vi } from "vitest";
import { withReadOnlyTransaction } from "./db";

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
    expect(logged).toContain("postgres://user:****@localhost:5432/db");
    expect(logged).not.toContain("pass@");
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
