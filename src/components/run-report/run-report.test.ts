import { describe, expect, it } from "vitest";
import { runReportMessages } from "./messages";
import {
  buildFindingsCsv,
  columnLabel,
  csvCell,
  csvFileName,
  findingColumns,
  localized,
  numericColumns,
  readRunResponse,
  rowCount,
  runHeadline,
  tableRows,
} from "./run-report";

describe("readRunResponse", () => {
  it("returns the run on success", async () => {
    const run = { _id: "r1", checkId: "s", outcome: "clean" };
    await expect(readRunResponse(Response.json(run))).resolves.toEqual(run);
  });

  it("reads a missing or malformed id as no run", async () => {
    await expect(readRunResponse(Response.json({ error: { code: "not_found", message: "not found" } }, { status: 404 }))).resolves.toBeNull();
    await expect(readRunResponse(Response.json({ error: { code: "invalid_input", message: "bad id" } }, { status: 400 }))).resolves.toBeNull();
  });

  it("uses the API's message on failure", async () => {
    await expect(readRunResponse(Response.json({ error: { code: "forbidden", message: "Not allowed" } }, { status: 403 }))).rejects.toThrow("Not allowed");
  });

  it("falls back to the status when the error body is not JSON", async () => {
    const res = new Response("<html>Bad gateway</html>", { status: 502 });
    await expect(readRunResponse(res)).rejects.toThrow("Error: 502");
  });
});

describe("not-found message", () => {
  it("reads as one sentence in each language, with no Chinese in English", () => {
    expect(runReportMessages.en.notFound).toBe("No run with this id.");
    expect(runReportMessages.zh.notFound).toBe("找不到这次执行。");
    for (const text of Object.values(runReportMessages.en)) expect(text).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe("findings shape", () => {
  it("only treats a non-empty array as table rows", () => {
    expect(tableRows([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(tableRows([])).toBeNull();
    expect(tableRows("no table")).toBeNull();
  });

  it("counts rows only when findings are an array", () => {
    expect(rowCount([{ a: 1 }, { a: 2 }])).toBe(2);
    expect(rowCount([])).toBe(0);
    expect(rowCount("text")).toBeNull();
  });
});

describe("runHeadline", () => {
  it("counts rows needing attention, with singular and plural", () => {
    expect(runHeadline("issues", 1, "en")).toBe("1 row needs attention");
    expect(runHeadline("issues", 3, "en")).toBe("3 rows need attention");
    expect(runHeadline("issues", 3, "zh")).toBe("3 行需要关注");
    expect(runHeadline("issues", null, "en")).toBe("Needs attention");
  });

  it("describes clean and failed runs", () => {
    expect(runHeadline("clean", 0, "en")).toBe("Clean: no rows returned");
    expect(runHeadline("error", null, "en")).toBe("The query failed");
    expect(runHeadline("error", null, "zh")).toBe("查询出错");
  });
});

describe("localized", () => {
  it("uses the Chinese text in Chinese when present, else the English one", () => {
    expect(localized("zh", "Name", "名称")).toBe("名称");
    expect(localized("zh", "Name", undefined)).toBe("Name");
    expect(localized("zh", "Name", "")).toBe("Name");
    expect(localized("en", "Name", "名称")).toBe("Name");
    expect(localized("en", undefined, "名称")).toBeUndefined();
  });
});

describe("columns", () => {
  const rows = [
    { id: "1", user_name: "ann", amount: "12.50", note: null },
    { id: "2", user_name: "bob", amount: null, note: "" },
  ];

  it("takes columns from the first row in query order", () => {
    expect(findingColumns(rows)).toEqual(["id", "user_name", "amount", "note"]);
    expect(findingColumns([])).toEqual([]);
  });

  it("marks columns whose non-null values are all numeric", () => {
    const numeric = numericColumns(rows, findingColumns(rows));
    expect([...numeric]).toEqual(["id", "amount"]);
  });

  it("labels columns with spaces instead of underscores", () => {
    expect(columnLabel("user_name_full")).toBe("user name full");
  });
});

describe("CSV export", () => {
  it("leaves plain values alone and blanks missing ones", () => {
    expect(csvCell("abc")).toBe("abc");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(false)).toBe("false");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes values with commas, quotes or newlines and doubles inner quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("quotes values with carriage returns", () => {
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  it("prefixes text that a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+cmd")).toBe("'+cmd");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tcmd")).toBe("'\tcmd");
    expect(csvCell("=1,2")).toBe("\"'=1,2\"");
  });

  it("keeps plain numbers, including negative ones and numeric strings", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("-12.50")).toBe("-12.50");
    expect(csvCell("+3")).toBe("+3");
    expect(csvCell("-1e5")).toBe("-1e5");
    expect(csvCell("a=b")).toBe("a=b");
  });

  it("writes object values as JSON, as the table shows them", () => {
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvCell([1, 2])).toBe('"[1,2]"');
  });

  it("escapes and guards header cells too", () => {
    expect(buildFindingsCsv([{ "=cmd": 1, "a,b": 2 }])).toBe("'=cmd,\"a,b\"\n1,2");
  });

  it("writes a header row then one line per row", () => {
    const csv = buildFindingsCsv([
      { id: 1, name: "a,b" },
      { id: 2, name: null },
    ]);
    expect(csv).toBe('id,name\n1,"a,b"\n2,');
  });

  it("names the file after the check and the UTC date", () => {
    expect(csvFileName("orphan_orders", new Date("2026-09-27T23:30:00Z"))).toBe("orphan_orders_findings_2026-09-27.csv");
  });
});
