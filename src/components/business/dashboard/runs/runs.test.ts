import { describe, expect, it } from "vitest";
import type { ScriptInfo } from "../types";
import {
  DEFAULT_SORT,
  apiSort,
  buildCheckHistoryQuery,
  nextSort,
  pageRange,
  parseRuns,
  nextScheduledRunOf,
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
  outcome: null,
  search: "",
  hashtags: [],
  sort: DEFAULT_SORT,
  ...overrides,
});

describe("buildCheckHistoryQuery", () => {
  it("asks for a page without the result rows, newest first by default", () => {
    expect(buildCheckHistoryQuery(query(), 50)).toBe(
      "page=1&limit=50&include_sample=false&sort_by=finishedAt&sort_order=desc",
    );
  });

  it("adds the outcome, a trimmed search and tags", () => {
    const params = buildCheckHistoryQuery(
      query({
        page: 3,
        outcome: "error",
        search: "  orders ",
        hashtags: ["billing", "daily"],
        sort: { key: "checkId", direction: "ascending" },
      }),
      50,
    );
    expect(params).toBe(
      "page=3&limit=50&include_sample=false&outcome=error&search=orders&hashtags=billing%2Cdaily&sort_by=checkId&sort_order=asc",
    );
  });

  it("leaves out a blank search", () => {
    expect(buildCheckHistoryQuery(query({ search: "   " }), 50)).not.toContain("search");
  });
});

describe("sorting", () => {
  it("maps the table's sort to the API's", () => {
    expect(apiSort({ key: "checkId", direction: "descending" })).toEqual({ sortBy: "checkId", sortOrder: "desc" });
    expect(apiSort({ key: "finishedAt", direction: "ascending" })).toEqual({ sortBy: "finishedAt", sortOrder: "asc" });
  });

  it("flips the sorted column and starts a new one descending", () => {
    expect(nextSort(DEFAULT_SORT, "finishedAt")).toEqual({ key: "finishedAt", direction: "ascending" });
    expect(nextSort({ key: "finishedAt", direction: "ascending" }, "finishedAt").direction).toBe("descending");
    expect(nextSort({ key: "finishedAt", direction: "ascending" }, "checkId")).toEqual({
      key: "checkId",
      direction: "descending",
    });
  });
});

describe("response parsing", () => {
  it("reads the run list and rejects a body without one", () => {
    expect(parseRuns({ data: [{ _id: "a" }, { _id: "b" }] })?.map((run) => run._id)).toEqual(["a", "b"]);
    expect(parseRuns({ data: "nope" })).toBeNull();
    expect(parseRuns(null)).toBeNull();
  });

  it("keeps only the pagination fields the page uses", () => {
    expect(parsePagination({ pagination: { total: 120, totalPages: 3, hasNext: true, hasPrev: false, page: 1 } })).toEqual({
      total: 120,
      totalCapped: false,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
    expect(parsePagination({ pagination: { total: 10000, totalCapped: true, totalPages: 200, hasNext: true, hasPrev: false } })).toMatchObject({ totalCapped: true });
    expect(parsePagination({})).toBeNull();
  });

  it("lists the checks by name, as MongoDB sorts them", () => {
    const list = [{ scriptId: "b", name: "b" }, { scriptId: "c", name: "B" }, { scriptId: "a", name: "A" }] as ScriptInfo[];
    expect(parseScriptList(list).map((s) => s.scriptId)).toEqual(["a", "c", "b"]);
    expect(parseScriptList({ message: "nope" })).toEqual([]);
    expect(parseScriptList(null)).toEqual([]);
  });

  it("finds the earliest next run across scheduled checks", () => {
    const now = new Date("2026-09-27T07:30:00Z");
    const scripts = [
      { scriptId: "hourly", name: "h", isScheduled: true, cronSchedule: "0 * * * *" },
      { scriptId: "daily", name: "d", isScheduled: true, cronSchedule: "0 9 * * *" },
      { scriptId: "manual", name: "m", isScheduled: false, cronSchedule: "*/5 * * * *" },
      { scriptId: "broken", name: "x", isScheduled: true, cronSchedule: "not cron" },
    ] as ScriptInfo[];
    expect(nextScheduledRunOf(scripts, now)).toEqual(new Date("2026-09-27T08:00:00Z"));
    expect(nextScheduledRunOf([], now)).toBeNull();
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
    expect(takeSearchParam("https://assay.test/runs?search=%20orders%20&tab=x")).toEqual({
      search: "orders",
      cleanedHref: "https://assay.test/runs?tab=x",
    });
  });

  it("ignores a missing or empty search", () => {
    expect(takeSearchParam("https://assay.test/runs")).toBeNull();
    expect(takeSearchParam("https://assay.test/runs?search=")).toBeNull();
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
