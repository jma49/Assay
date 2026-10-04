import { describe, expect, it, vi } from "vitest";
import { probeConnection, writeAccessOf } from "./test-connection";

const readOnlyRow = { server_version: "17.2", current_user: "assay_readonly", superuser: false, write_all_data: false, create_schema: false, table_write: false };

function fakeClient(options: { fail?: Error; row?: object; noRows?: boolean } = {}) {
  const queries: string[] = [];
  const client = {
    on: vi.fn(),
    connect: vi.fn(async () => {
      if (options.fail) throw options.fail;
    }),
    query: vi.fn(async (text: string) => {
      queries.push(text.trim().split(/\s+/).slice(0, 2).join(" "));
      return { rows: options.noRows ? [] : [options.row ?? readOnlyRow] };
    }),
    end: vi.fn(async () => undefined),
  };
  return { client, queries };
}

describe("probeConnection", () => {
  it("reads inside a READ ONLY transaction with a statement timeout, then disconnects", async () => {
    const { client, queries } = fakeClient();
    const connect = vi.fn((_config: object) => client as never);
    const result = await probeConnection({ host: "h" }, connect);
    expect(result).toEqual({ ok: true, serverVersion: "17.2", currentUser: "assay_readonly", readOnly: true, writeAccess: [] });
    expect(queries).toEqual(["BEGIN READ", "SET LOCAL", "SELECT current_setting('server_version')", "COMMIT"]);
    expect(connect.mock.calls[0]?.[0]).toMatchObject({ connectionTimeoutMillis: 5000 });
    expect(client.end).toHaveBeenCalledOnce();
  });

  it("warns when the role can write", async () => {
    const { client } = fakeClient({ row: { ...readOnlyRow, current_user: "neondb_owner", write_all_data: true, create_schema: true } });
    expect(await probeConnection({}, () => client as never)).toMatchObject({ readOnly: false, writeAccess: ["pg_write_all_data", "create_schema"] });
  });

  it("reports a failed connection instead of throwing, and still disconnects", async () => {
    const { client } = fakeClient({ fail: new Error('password authentication failed for user "reader"') });
    expect(await probeConnection({}, () => client as never)).toEqual({ ok: false, error: 'password authentication failed for user "reader"' });
    expect(client.end).toHaveBeenCalledOnce();
    const refused = fakeClient({ fail: Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }) });
    expect(await probeConnection({}, () => refused.client as never)).toEqual({ ok: false, error: "ECONNREFUSED" });
  });

  it("reports a probe that returned no row as a failure", async () => {
    const { client } = fakeClient({ noRows: true });
    expect(await probeConnection({}, () => client as never)).toEqual({ ok: false, error: "The connection probe returned no row" });
    expect(client.end).toHaveBeenCalledOnce();
  });
});

describe("writeAccessOf", () => {
  it("names every way the role could write", () => {
    expect(writeAccessOf({ superuser: true, write_all_data: true, create_schema: true, table_write: true })).toEqual([
      "superuser",
      "pg_write_all_data",
      "table_write",
      "create_schema",
    ]);
  });
});
