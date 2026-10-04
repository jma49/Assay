import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EditHistoryRecord } from "@/contracts/edit-history";
import {
  EMPTY_FILTERS,
  buildHistoryQuery,
  changesPreview,
  formatChangeValue,
  fieldLabel,
  formatPageInfo,
  historyDescription,
  parseDateInput,
  operationBadgeClass,
  operationLabel,
  operationTimeIso,
  type FieldChange,
} from "./edit-history";

const t = (key: string) =>
  ({
    noResults: "No results",
    pageInfo: "Showing %s-%s of %s results (Page %s of %s)",
    operationCreate: "Create",
    noData: "No data",
    scheduled: "Scheduled",
    manual: "Manual",
    noChanges: "No changes",
    fieldChangesCount: "{count} changes",
  })[key] ?? key;

const change = (overrides: Partial<FieldChange> = {}): FieldChange => ({
  field: "name",
  fieldDisplayName: "Name",
  fieldDisplayNameCn: "名称",
  oldValue: "a",
  newValue: "b",
  ...overrides,
});

const record = (overrides: Partial<EditHistoryRecord> = {}): EditHistoryRecord => ({
  operation: "update",
  operationTime: new Date("2026-09-27T10:00:00Z"),
  userId: "u1",
  scriptSnapshot: { scriptId: "s1", name: "Check", author: "ann" },
  searchableAuthor: "ann",
  searchableScriptName: "check",
  searchableScriptNameCn: "",
  operationType: "update",
  ...overrides,
});

describe("buildHistoryQuery", () => {
  it("sends only the paging and sort params when no filter is set", () => {
    expect(buildHistoryQuery(EMPTY_FILTERS, 1, 10)).toBe("page=1&limit=10&sortBy=operationTime&sortOrder=desc");
  });

  it("narrows to one check by its exact id", () => {
    expect(new URLSearchParams(buildHistoryQuery({ ...EMPTY_FILTERS, scriptId: "orders" }, 1, 20)).get("scriptId")).toBe("orders");
  });

  it("trims text filters and skips the 'all' operation", () => {
    const query = new URLSearchParams(
      buildHistoryQuery({ ...EMPTY_FILTERS, scriptName: "  orders ", author: " ann ", operation: "all" }, 3, 10),
    );
    expect(query.get("scriptName")).toBe("orders");
    expect(query.get("author")).toBe("ann");
    expect(query.has("operation")).toBe(false);
    expect(query.get("page")).toBe("3");
  });

  it("drops text filters that are only whitespace and keeps a specific operation", () => {
    const query = new URLSearchParams(buildHistoryQuery({ ...EMPTY_FILTERS, scriptName: "   ", operation: "delete" }, 1, 10));
    expect(query.has("scriptName")).toBe(false);
    expect(query.get("operation")).toBe("delete");
  });

  it("sends date filters as ISO timestamps", () => {
    const query = new URLSearchParams(buildHistoryQuery({ ...EMPTY_FILTERS, dateFrom: "2026-09-01", dateTo: "2026-09-27" }, 1, 10));
    expect(Number.isNaN(Date.parse(query.get("dateFrom")!))).toBe(false);
    expect(Number.isNaN(Date.parse(query.get("dateTo")!))).toBe(false);
  });
});

describe("parseDateInput", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("returns local midnight of the picked day, not UTC midnight", () => {
    const date = parseDateInput("2026-09-27")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 27, 0]);
    expect(date.toISOString()).toBe("2026-09-27T07:00:00.000Z");
  });

  it("ignores empty or malformed input", () => {
    expect(parseDateInput("")).toBeUndefined();
    expect(parseDateInput("27/09/2026")).toBeUndefined();
  });
});

describe("formatPageInfo", () => {
  it("fills the range, total and page numbers in order", () => {
    expect(formatPageInfo(t, { currentPage: 2, totalPages: 3, totalRecords: 25, pageSize: 10 })).toBe(
      "Showing 11-20 of 25 results (Page 2 of 3)",
    );
  });

  it("caps the range at the total on the last page", () => {
    expect(formatPageInfo(t, { currentPage: 3, totalPages: 3, totalRecords: 25, pageSize: 10 })).toBe(
      "Showing 21-25 of 25 results (Page 3 of 3)",
    );
  });

  it("says there are no results when the total is zero", () => {
    expect(formatPageInfo(t, { currentPage: 1, totalPages: 0, totalRecords: 0, pageSize: 10 })).toBe("No results");
  });
});

describe("operation display", () => {
  it("maps known operations to their label and colors", () => {
    expect(operationLabel("create", t)).toBe("Create");
    expect(operationBadgeClass("delete")).toContain("text-failure");
  });

  it("falls back to the raw name and neutral colors for unknown operations", () => {
    expect(operationLabel("archive", t)).toBe("archive");
    expect(operationBadgeClass("archive")).toBe(operationBadgeClass("update"));
  });
});

describe("formatChangeValue", () => {
  it("shows missing values as no data and booleans as the schedule mode", () => {
    expect(formatChangeValue(null, t)).toBe("No data");
    expect(formatChangeValue(undefined, t)).toBe("No data");
    expect(formatChangeValue(true, t)).toBe("Scheduled");
    expect(formatChangeValue(false, t)).toBe("Manual");
  });

  it("shortens long strings to 50 characters", () => {
    expect(formatChangeValue("x".repeat(60), t)).toBe("x".repeat(50) + "...");
    expect(formatChangeValue("x".repeat(50), t)).toBe("x".repeat(50));
    expect(formatChangeValue("x".repeat(60), t, 100)).toBe("x".repeat(60));
  });

  it("stringifies other values", () => {
    expect(formatChangeValue(0, t)).toBe("0");
  });
});

describe("changesPreview", () => {
  it("says there are no changes for an empty or missing list", () => {
    expect(changesPreview(undefined, t, "en")).toBe("No changes");
    expect(changesPreview([], t, "en")).toBe("No changes");
  });

  it("names a single changed field in the UI language and counts several", () => {
    expect(changesPreview([change()], t, "en")).toBe("Name");
    expect(changesPreview([change()], t, "zh")).toBe("名称");
    expect(changesPreview([change(), change()], t, "en")).toBe("2 changes");
  });
});

describe("fieldLabel", () => {
  it("falls back to the other language when the UI language's name is missing", () => {
    expect(fieldLabel(change({ fieldDisplayName: "" }), "en")).toBe("名称");
    expect(fieldLabel(change({ fieldDisplayNameCn: "" }), "zh")).toBe("Name");
  });
});

describe("record accessors", () => {
  it("returns the operation time as an ISO string whether it arrived as a Date or a string", () => {
    expect(operationTimeIso(record())).toBe("2026-09-27T10:00:00.000Z");
    const fromJson = record({ operationTime: "2026-09-27T10:00:00Z" as unknown as Date });
    expect(operationTimeIso(fromJson)).toBe("2026-09-27T10:00:00Z");
  });

  it("returns the description in the UI language, or undefined when there is none", () => {
    expect(historyDescription(record(), "en")).toBeUndefined();
    const described = record({ description: "Renamed", descriptionCn: "已重命名" });
    expect(historyDescription(described, "en")).toBe("Renamed");
    expect(historyDescription(described, "zh")).toBe("已重命名");
    expect(historyDescription(record({ descriptionCn: "已重命名" }), "en")).toBe("已重命名");
  });
});
