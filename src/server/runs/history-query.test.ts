import { describe, expect, it } from "vitest";
import { maxPage } from "@/server/http/paging";
import { checksWithAllTags, historyFilter, historySort, parseHistoryParams } from "./history-query";

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

describe("checksWithAllTags", () => {
  it("keeps only checks carrying every tag", () => {
    const checks = [{ scriptId: "a", hashtags: ["x", "y"] }, { scriptId: "b", hashtags: ["x"] }, { scriptId: "c" }];
    expect(checksWithAllTags(checks, ["x", "y"])).toEqual(["a"]);
  });
});
