import { describe, expect, it } from "vitest";
import { cleanRunMessage, runErrorText, runResultLabel, runRowCount } from "./run-message";

describe("cleanRunMessage", () => {
  it("collapses the doubled word from old runs", () => {
    expect(cleanRunMessage("Script executed successfully. Found Found 2 records")).toBe(
      "Script executed successfully. Found 2 records",
    );
  });

  it("leaves correct and empty messages alone", () => {
    expect(cleanRunMessage("Found 2 records")).toBe("Found 2 records");
    expect(cleanRunMessage(undefined)).toBe("");
  });
});

describe("runResultLabel", () => {
  it("counts rows in the reader's language", () => {
    expect(runResultLabel({ outcome: "issues", rowCount: 3 }, "en")).toBe("3 rows");
    expect(runResultLabel({ outcome: "issues", rowCount: 1 }, "en")).toBe("1 row");
    expect(runResultLabel({ outcome: "issues", rowCount: 3 }, "zh")).toBe("3 行");
  });

  it("says a clean run returned no rows", () => {
    expect(runResultLabel({ outcome: "clean", rowCount: 0 }, "en")).toBe("No rows");
    expect(runResultLabel({ outcome: "clean", message: "Completed successfully (no data returned)" }, "zh")).toBe("没有返回行");
  });

  it("shows the query's error for a broken run", () => {
    expect(runResultLabel({ outcome: "error", error: 'relation "x" does not exist' }, "en")).toBe('relation "x" does not exist');
    expect(runResultLabel({ outcome: "error", message: "timeout", findings: "Execution incomplete" }, "en")).toBe("timeout");
    expect(runResultLabel({ outcome: "error" }, "zh")).toBe("查询出错");
  });

  it("recovers the count from the summary older runs stored", () => {
    expect(runResultLabel({ outcome: "issues", findings: "Found 6 records" }, "en")).toBe("6 rows");
    expect(runResultLabel({ outcome: "issues", message: "Script executed successfully. Found Found 2 records" }, "en")).toBe("2 rows");
    expect(runResultLabel({ outcome: "issues" }, "en")).toBe("Rows found");
  });
});

describe("runRowCount and runErrorText", () => {
  it("prefer the stored fields", () => {
    expect(runRowCount({ outcome: "issues", rowCount: 4, findings: "Found 9 records" })).toBe(4);
    expect(runErrorText({ outcome: "error", error: "boom", message: "other" })).toBe("boom");
    expect(runErrorText({ outcome: "issues", error: "ignored" })).toBeNull();
  });
});
