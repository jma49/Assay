import { describe, expect, it } from "vitest";
import { parseEditHistoryQuery } from "./query";

const parse = (query: string) => parseEditHistoryQuery(new URLSearchParams(query));
const ok = (query: string) => {
  const result = parse(query);
  if (!result.ok) throw new Error(result.message);
  return result.query;
};

describe("parseEditHistoryQuery", () => {
  it("defaults to the newest entries first, 20 a page", () => {
    expect(ok("")).toEqual({ filter: {}, sort: { operationTime: -1 }, page: 1, limit: 20 });
  });

  it("refuses unknown sort fields, orders, operations and dates instead of failing in MongoDB", () => {
    expect(parse("sortBy=__proto__")).toEqual({ ok: false, message: "Unknown sortBy: __proto__" });
    expect(parse("sortBy=password")).toMatchObject({ ok: false });
    expect(parse("sortOrder=sideways")).toMatchObject({ ok: false });
    expect(parse("operation=drop")).toMatchObject({ ok: false });
    expect(parse("dateFrom=soon")).toEqual({ ok: false, message: "Invalid date" });
  });

  it("sorts by name or author, newest first within one", () => {
    expect(ok("sortBy=scriptName&sortOrder=asc").sort).toEqual({ searchableScriptName: 1, operationTime: -1 });
    expect(ok("sortBy=author").sort).toEqual({ searchableAuthor: -1, operationTime: -1 });
  });

  it("builds the filter", () => {
    expect(ok("scriptId=orders&author=ann&operation=update&dateFrom=2026-09-01T00:00:00.000Z&dateTo=2026-09-02T00:00:00.000Z").filter).toEqual({
      "scriptSnapshot.scriptId": "orders",
      searchableAuthor: { $regex: "ann", $options: "i" },
      operationType: "update",
      operationTime: { $gte: new Date("2026-09-01T00:00:00.000Z"), $lt: new Date("2026-09-03T00:00:00.000Z") },
    });
    expect(ok("scriptName=a.b").filter).toEqual({
      $or: [{ searchableScriptName: { $regex: "a\\.b", $options: "i" } }, { "scriptSnapshot.scriptId": { $regex: "a\\.b", $options: "i" } }],
    });
    expect(ok("operation=all").filter).toEqual({});
  });

  it("keeps the page within the counted entries", () => {
    expect(ok("page=999999&limit=100").page).toBe(100);
    expect(ok("limit=5000").limit).toBe(100);
  });
});
