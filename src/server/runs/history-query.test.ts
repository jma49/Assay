import { describe, expect, it } from "vitest";
import { maxPage } from "@/server/http/paging";
import { checkNameOrder, checksMatchingName, checksWithAllTags, historyFilter, historySort, nameSortPipeline, parseHistoryParams } from "./history-query";

const params = (query: string) => parseHistoryParams(new URLSearchParams(query));

describe("parseHistoryParams", () => {
  it("falls back to defaults for missing or bad values", () => {
    expect(params("page=abc&limit=9999&hashtags=a, ,b&startDate=soon")).toMatchObject({ page: 1, limit: 500, hashtags: ["a", "b"], sortBy: "finishedAt", sortOrder: "desc", checkId: null, startDate: null, endDate: null });
    expect(params("")).toMatchObject({ limit: 50 });
  });

  it("keeps the page within the counted runs", () => {
    expect(params("page=100000&limit=50")).toMatchObject({ page: 200 });
    expect(params("page=100000&limit=500")).toMatchObject({ page: 20 });
    expect(maxPage(3)).toBe(3334);
  });
});

describe("historyFilter", () => {
  it("searches check ids as escaped text", () => {
    expect(historyFilter(params("search=(a%2B)%2B$"), null)).toEqual({ checkId: { $regex: "\\(a\\+\\)\\+\\$", $options: "i" } });
  });

  it("combines the search with the tagged checks on one field", () => {
    expect(historyFilter(params("search=ord"), ["orders", "refunds"])).toEqual({
      checkId: { $regex: "ord", $options: "i", $in: ["orders", "refunds"] },
    });
  });

  it("matches one check exactly and runs finished within a date range", () => {
    expect(historyFilter(params("checkId=orders&startDate=2026-09-01T00:00:00.000Z&endDate=2026-09-08T00:00:00.000Z"), null)).toEqual({
      checkId: { $eq: "orders" },
      finishedAt: { $gte: new Date("2026-09-01T00:00:00.000Z"), $lte: new Date("2026-09-08T00:00:00.000Z") },
    });
    expect(historyFilter(params("startDate=2026-09-01T00:00:00.000Z"), null)).toEqual({ finishedAt: { $gte: new Date("2026-09-01T00:00:00.000Z") } });
  });

  it("filters by outcome and ignores unknown ones", () => {
    expect(historyFilter(params("outcome=issues"), null)).toEqual({ outcome: "issues" });
    expect(historyFilter(params("outcome=error"), null)).toEqual({ outcome: "error" });
    expect(historyFilter(params("outcome=attention_needed"), null)).toEqual({});
  });
});

describe("historySort", () => {
  it("sorts by the run's own fields", () => {
    expect(historySort(params("sort_by=finishedAt&sort_order=asc"))).toEqual({ finishedAt: 1 });
    expect(historySort(params("sort_by=checkId"))).toEqual({ checkId: -1, finishedAt: -1 });
    expect(historySort(params("sort_by=$where"))).toEqual({ finishedAt: -1 });
  });
});

describe("searching and sorting by name", () => {
  const checks = [
    { scriptId: "b-dupes", name: "Duplicate orders", cnName: "重复下单" },
    { scriptId: "a-stale", name: "stale pending orders", cnName: "长期待处理订单" },
    { scriptId: "c-emails", name: "Invalid emails" },
  ];

  it("reads sort_by=name with the language, and ignores unknown languages", () => {
    expect(params("sort_by=name&lang=zh")).toMatchObject({ sortBy: "name", language: "zh" });
    expect(params("sort_by=name&lang=fr")).toMatchObject({ sortBy: "name", language: "en" });
  });

  it("finds checks by either name, ignoring case", () => {
    expect(checksMatchingName(checks, "ORDERS")).toEqual(["b-dupes", "a-stale"]);
    expect(checksMatchingName(checks, "下单")).toEqual(["b-dupes"]);
    expect(checksMatchingName(checks, "  ")).toEqual([]);
  });

  it("matches the id or a name when the search hits a name", () => {
    expect(historyFilter(params("search=dup"), null, ["b-dupes"])).toEqual({
      $or: [{ checkId: { $regex: "dup", $options: "i" } }, { checkId: { $in: ["b-dupes"] } }],
    });
  });

  it("orders checks by their name in the reader's language, case-insensitively", () => {
    expect(checkNameOrder(checks, "en")).toEqual(["b-dupes", "c-emails", "a-stale"]);
    // Chinese names by pinyin (chang before chong); without one the English name stands in.
    const zh = checkNameOrder(checks, "zh");
    expect(zh.indexOf("a-stale")).toBeLessThan(zh.indexOf("b-dupes"));
    expect(zh).toContain("c-emails");
  });

  it("pages runs by the check's rank, unknown checks last", () => {
    const pipeline = nameSortPipeline({ outcome: "issues" }, ["b", "a"], { sortOrder: "asc", page: 2, limit: 10 }, { checkId: 1 });
    expect(pipeline[0]).toEqual({ $match: { outcome: "issues" } });
    expect(pipeline.slice(2)).toEqual([
      { $sort: { _nameRank: 1, checkId: 1, finishedAt: -1 } },
      { $skip: 10 },
      { $limit: 10 },
      { $project: { checkId: 1 } },
    ]);
    expect(JSON.stringify(pipeline[1])).toContain('"in":{"$cond":[{"$lt":["$$rank",0]},2,"$$rank"]}');
  });
});

describe("checksWithAllTags", () => {
  it("keeps only checks carrying every tag", () => {
    const checks = [{ scriptId: "a", hashtags: ["x", "y"] }, { scriptId: "b", hashtags: ["x"] }, { scriptId: "c" }];
    expect(checksWithAllTags(checks, ["x", "y"])).toEqual(["a"]);
  });
});
