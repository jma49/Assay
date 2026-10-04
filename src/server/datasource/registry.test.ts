import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { postgresSource } from "./postgres";
import { createSourceRegistry, UnknownDataSourceError, type SourceRecord } from "./registry";

vi.mock("@/lib/database/db", () => ({
  readOnlyTransaction: async (pool: { name: string }, fn: (client: unknown) => Promise<unknown>) => fn({ pool: pool.name }),
}));

function setup(initial: SourceRecord[] = [{ sourceId: "billing", version: 1, connection: "sealed-1" }]) {
  const records = new Map(initial.map((r) => [r.sourceId, r]));
  const pools: { name: string; end: ReturnType<typeof vi.fn> }[] = [];
  const loadRecord = vi.fn(async (id: string) => records.get(id) ?? null);
  const registry = createSourceRegistry({
    loadRecord,
    createPool: (record) => {
      const pool = { name: `${record.sourceId}@${record.version}`, end: vi.fn(async () => undefined) };
      pools.push(pool);
      return pool as unknown as Pool;
    },
    defaultSource: () => postgresSource(async (fn) => fn({ pool: "default" } as never)),
    recordTtlMs: 0,
  });
  return { registry, records, pools, loadRecord };
}

const poolOf = async (resolved: { source: { transaction: (fn: (c: { pool: string }) => Promise<string>) => Promise<string> } }) =>
  resolved.source.transaction(async (client) => client.pool);

describe("createSourceRegistry", () => {
  it("resolves the built-in source without reading MongoDB", async () => {
    const { registry, loadRecord } = setup();
    const resolved = await registry.resolve("default");
    expect(resolved).toMatchObject({ sourceId: "default", version: 0 });
    expect(await poolOf(resolved as never)).toBe("default");
    expect(loadRecord).not.toHaveBeenCalled();
  });

  it("keeps one pool per source while its version stays the same", async () => {
    const { registry, pools } = setup();
    const first = await registry.resolve("billing");
    const second = await registry.resolve("billing");
    expect(pools).toHaveLength(1);
    expect(await poolOf(first as never)).toBe("billing@1");
    expect(await poolOf(second as never)).toBe("billing@1");
  });

  it("opens a new pool for an edited source and ends the old one", async () => {
    const { registry, records, pools } = setup();
    await registry.resolve("billing");
    records.set("billing", { sourceId: "billing", version: 2, connection: "sealed-2" });
    const edited = await registry.resolve("billing");
    expect(edited.version).toBe(2);
    expect(await poolOf(edited as never)).toBe("billing@2");
    expect(pools.map((p) => p.name)).toEqual(["billing@1", "billing@2"]);
    expect(pools[0]?.end).toHaveBeenCalledOnce();
    expect(pools[1]?.end).not.toHaveBeenCalled();
  });

  it("fails for an unknown source, and ends the pool of one deleted since", async () => {
    const { registry, records, pools } = setup();
    await registry.resolve("billing");
    records.delete("billing");
    await expect(registry.resolve("billing")).rejects.toBeInstanceOf(UnknownDataSourceError);
    expect(pools[0]?.end).toHaveBeenCalledOnce();
    await expect(registry.resolve("nope")).rejects.toThrow("No data source with the id 'nope'");
  });

  it("fails for the built-in source when DATABASE_URL is not set", async () => {
    const registry = createSourceRegistry({ loadRecord: async () => null, createPool: vi.fn(), defaultSource: () => null });
    await expect(registry.resolve("default")).rejects.toBeInstanceOf(UnknownDataSourceError);
  });

  it("trusts a looked-up record for a short while, and forget drops it at once", async () => {
    const records = new Map([["billing", { sourceId: "billing", version: 1, connection: "x" }]]);
    const loadRecord = vi.fn(async (id: string) => records.get(id) ?? null);
    const end = vi.fn(async () => undefined);
    const registry = createSourceRegistry({ loadRecord, createPool: () => ({ end }) as never, defaultSource: () => null, recordTtlMs: 60_000 });
    await registry.resolve("billing");
    await registry.resolve("billing");
    expect(loadRecord).toHaveBeenCalledOnce();
    registry.forget("billing");
    expect(end).toHaveBeenCalledOnce();
    await registry.resolve("billing");
    expect(loadRecord).toHaveBeenCalledTimes(2);
  });

  it("ends every pool on closeAll", async () => {
    const { registry, pools } = setup([
      { sourceId: "a", version: 1, connection: "x" },
      { sourceId: "b", version: 1, connection: "y" },
    ]);
    await registry.resolve("a");
    await registry.resolve("b");
    await registry.closeAll();
    expect(pools.every((p) => p.end.mock.calls.length === 1)).toBe(true);
  });
});
