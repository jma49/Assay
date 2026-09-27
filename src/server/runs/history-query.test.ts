import { describe, expect, it } from "vitest";
import { checksWithAllTags, historyFilter, historySort, parseHistoryParams } from "./history-query";

const params = (query: string) => parseHistoryParams(new URLSearchParams(query));

describe("parseHistoryParams", () => {
  it("falls back to defaults for missing or bad values", () => {
    expect(params("page=abc&limit=9999&hashtags=a, ,b&startDate=soon")).toMatchObject({ page: 1, limit: 500, hashtags: ["a", "b"], sortBy: "execution_time", sortOrder: "desc", includeResults: false, checkId: null, startDate: null, endDate: null });
  });

  it("allows fewer runs per page when they carry their rows", () => {
    expect(params("limit=9999&include_results=true")).toMatchObject({ limit: 200, includeResults: true });
    expect(params("")).toMatchObject({ limit: 50 });
  });
});

describe("historyFilter", () => {
  it("searches check ids as escaped text", () => {
    expect(historyFilter(params("script_name=(a%2B)%2B$"), null)).toEqual({ checkId: { $regex: "\\(a\\+\\)\\+\\$", $options: "i" } });
  });

  it("combines the search with the tagged checks on one field", () => {
    expect(historyFilter(params("script_name=ord"), ["orders", "refunds"])).toEqual({
      checkId: { $regex: "ord", $options: "i", $in: ["orders", "refunds"] },
    });
  });

  it("matches one check exactly and runs finished within a date range", () => {
    expect(historyFilter(params("scriptId=orders&startDate=2026-09-01T00:00:00.000Z&endDate=2026-09-08T00:00:00.000Z"), null)).toEqual({
      checkId: { $eq: "orders" },
      finishedAt: { $gte: new Date("2026-09-01T00:00:00.000Z"), $lte: new Date("2026-09-08T00:00:00.000Z") },
    });
    expect(historyFilter(params("startDate=2026-09-01T00:00:00.000Z"), null)).toEqual({ finishedAt: { $gte: new Date("2026-09-01T00:00:00.000Z") } });
  });

  it("maps the legacy status filter to an outcome and ignores unknown ones", () => {
    expect(historyFilter(params("status=attention_needed"), null)).toEqual({ outcome: "issues" });
    expect(historyFilter(params("status=failure"), null)).toEqual({ outcome: "error" });
    expect(historyFilter(params("status=all"), null)).toEqual({});
  });
});

describe("historySort", () => {
  it("sorts by the run's own fields", () => {
    expect(historySort(params("sort_by=execution_time&sort_order=asc"))).toEqual({ finishedAt: 1 });
    expect(historySort(params("sort_by=script_name"))).toEqual({ checkId: -1, finishedAt: -1 });
    expect(historySort(params("sort_by=$where"))).toEqual({ finishedAt: -1 });
  });
});

describe("checksWithAllTags", () => {
  it("keeps only checks carrying every tag", () => {
    const checks = [{ scriptId: "a", hashtags: ["x", "y"] }, { scriptId: "b", hashtags: ["x"] }, { scriptId: "c" }];
    expect(checksWithAllTags(checks, ["x", "y"])).toEqual(["a"]);
  });
});
