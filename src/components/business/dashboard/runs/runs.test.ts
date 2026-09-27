import { describe, expect, it } from "vitest";
import type { ScriptInfo } from "../types";
import {
  DEFAULT_SORT,
  apiSort,
  buildCheckHistoryQuery,
  nextSort,
  pageRange,
  parseChecks,
  parseNextScheduled,
  parsePagination,
  parseScriptList,
  passRate,
  scriptDisplayNames,
  takeSearchParam,
  triggerErrorMessage,
  type HistoryQuery,
} from "./runs";

const query = (overrides: Partial<HistoryQuery> = {}): HistoryQuery => ({
  page: 1,
  status: null,
  search: "",
  hashtags: [],
  sort: DEFAULT_SORT,
  ...overrides,
});

describe("buildCheckHistoryQuery", () => {
  it("asks for a page without the result rows, newest first by default", () => {
    expect(buildCheckHistoryQuery(query(), 50)).toBe(
      "page=1&limit=50&include_results=false&sort_by=execution_time&sort_order=desc",
    );
  });

  it("adds status, trimmed name search and tags in the order the API has always received them", () => {
    const params = buildCheckHistoryQuery(
      query({
        page: 3,
        status: "failure",
        search: "  orders ",
        hashtags: ["billing", "daily"],
        sort: { key: "script_name", direction: "ascending" },
      }),
      50,
    );
    expect(params).toBe(
      "page=3&limit=50&include_results=false&status=failure&script_name=orders&hashtags=billing%2Cdaily&sort_by=script_name&sort_order=asc",
    );
  });

  it("leaves out a blank search", () => {
    expect(buildCheckHistoryQuery(query({ search: "   " }), 50)).not.toContain("script_name");
  });
});

describe("sorting", () => {
  it("maps the table's sort to the API's; anything but the name sorts by time", () => {
    expect(apiSort({ key: "script_name", direction: "descending" })).toEqual({ sortBy: "script_name", sortOrder: "desc" });
    expect(apiSort({ key: "", direction: "ascending" })).toEqual({ sortBy: "execution_time", sortOrder: "asc" });
  });

  it("flips the sorted column and starts a new one descending", () => {
    expect(nextSort(DEFAULT_SORT, "execution_time")).toEqual({ key: "execution_time", direction: "ascending" });
    expect(nextSort({ key: "execution_time", direction: "ascending" }, "execution_time").direction).toBe("descending");
    expect(nextSort({ key: "execution_time", direction: "ascending" }, "script_name")).toEqual({
      key: "script_name",
      direction: "descending",
    });
  });
});

describe("response parsing", () => {
  it("normalizes createdAt to a string and rejects a body without a run list", () => {
    const now = new Date("2026-09-27T00:00:00Z");
    const checks = parseChecks({ data: [{ _id: "a", createdAt: "2026-09-26" }, { _id: "b" }] }, now);
    expect(checks?.map((check) => check.createdAt)).toEqual(["2026-09-26", now.toISOString()]);
    expect(parseChecks({ data: "nope" })).toBeNull();
    expect(parseChecks(null)).toBeNull();
  });

  it("keeps only the pagination fields the page uses", () => {
    expect(parsePagination({ pagination: { total: 120, totalPages: 3, hasNext: true, hasPrev: false, page: 1 } })).toEqual({
      total: 120,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
    expect(parsePagination({})).toBeNull();
  });

  it("finds the check list in any of the shapes the scripts API has used", () => {
    const list = [{ scriptId: "a", name: "A" }] as ScriptInfo[];
    expect(parseScriptList(list)).toBe(list);
    expect(parseScriptList({ success: true, data: list })).toBe(list);
    expect(parseScriptList({ scripts: list })).toBe(list);
    expect(parseScriptList({ results: list })).toBe(list);
    expect(parseScriptList({ data: "nope" })).toEqual([]);
    expect(parseScriptList(null)).toEqual([]);
  });

  it("reads the next scheduled run when there is one", () => {
    expect(parseNextScheduled({ nextScheduledAt: "2026-09-27T08:00:00Z" })).toEqual(new Date("2026-09-27T08:00:00Z"));
    expect(parseNextScheduled({ data: [] })).toBeNull();
    expect(parseNextScheduled([])).toBeNull();
  });
});

describe("page numbers", () => {
  it("gives the row range of a page, clamped to the total", () => {
    expect(pageRange(1, 120, 50)).toEqual({ startIndex: 0, endIndex: 50 });
    expect(pageRange(3, 120, 50)).toEqual({ startIndex: 100, endIndex: 120 });
    expect(pageRange(2, 0, 50)).toEqual({ startIndex: 0, endIndex: 0 });
  });

  it("rounds the pass rate and is zero without runs", () => {
    expect(passRate({ totalCount: 3, successCount: 2, failureCount: 1, needsAttentionCount: 0 })).toBe(67);
    expect(passRate({ totalCount: 0, successCount: 0, failureCount: 0, needsAttentionCount: 0 })).toBe(0);
  });
});

describe("takeSearchParam", () => {
  it("returns the trimmed search and the URL without it", () => {
    expect(takeSearchParam("https://assay.test/dashboard?search=%20orders%20&tab=x")).toEqual({
      search: "orders",
      cleanedHref: "https://assay.test/dashboard?tab=x",
    });
  });

  it("ignores a missing or empty search", () => {
    expect(takeSearchParam("https://assay.test/dashboard")).toBeNull();
    expect(takeSearchParam("https://assay.test/dashboard?search=")).toBeNull();
  });
});

describe("triggerErrorMessage", () => {
  it("prefers the API's localized message, then the error's own", () => {
    expect(triggerErrorMessage(new Error("boom", { cause: { localizedMessage: "出错了" } }))).toBe("出错了");
    expect(triggerErrorMessage(new Error("boom"))).toBe("boom");
    expect(triggerErrorMessage(new Error(""))).toBe("Trigger failed");
    expect(triggerErrorMessage("boom")).toBe("Trigger failed");
  });
});

describe("row display", () => {
  it("names checks in the UI language, falling back to English and then the id", () => {
    const scripts = [
      { scriptId: "a", name: "Orders", cnName: "订单" },
      { scriptId: "b", name: "Refunds" },
      { scriptId: "c", name: "" },
    ] as ScriptInfo[];
    expect([...scriptDisplayNames(scripts, "zh").values()]).toEqual(["订单", "Refunds", "c"]);
    expect(scriptDisplayNames(scripts, "en").get("a")).toBe("Orders");
  });
});
