import { describe, expect, it } from "vitest";
import {
  EMPTY_FORM,
  afterSaveHref,
  firstInvalid,
  saveErrorField,
  tableFromSearch,
  toScriptId,
  validateNewCheck,
} from "./new-check";

const valid = { ...EMPTY_FORM, name: "Duplicate orders", scriptId: "duplicate-orders" };
const SQL = "SELECT id FROM demo.orders WHERE total < 0";

describe("validateNewCheck", () => {
  it("passes a complete, read-only check", () => {
    expect(validateNewCheck(valid, SQL, "en")).toEqual({});
  });

  it("marks every missing field at once, in page order", () => {
    const errors = validateNewCheck(EMPTY_FORM, "  ", "en");
    expect(errors).toEqual({ sql: "Write the query.", name: "Add a name.", scriptId: "Add a check ID." });
    expect(firstInvalid(errors)).toBe("sql");
    expect(firstInvalid({ scriptId: "x", name: "y" })).toBe("name");
    expect(firstInvalid({})).toBeNull();
  });

  it("explains a malformed id and a query that writes, in Chinese too", () => {
    const errors = validateNewCheck({ ...valid, scriptId: "Bad ID" }, "DELETE FROM demo.orders", "zh");
    expect(errors.scriptId).toBe("只能使用小写字母、数字和连字符。");
    expect(errors.sql).toBeTruthy();
    expect(errors.name).toBeUndefined();
  });

  it("checks the schedule only when it is on", () => {
    expect(validateNewCheck({ ...valid, isScheduled: false, cronSchedule: "nope" }, SQL, "en").cronSchedule).toBeUndefined();
    expect(validateNewCheck({ ...valid, isScheduled: true, cronSchedule: "nope" }, SQL, "en").cronSchedule).toBeTruthy();
  });
});

describe("new check helpers", () => {
  it("derives an id from the name", () => {
    expect(toScriptId("  Duplicate   orders! ")).toBe("duplicate-orders");
  });

  it("accepts only plain table names from a coverage link", () => {
    expect(tableFromSearch("?table=demo.orders")).toBe("demo.orders");
    expect(tableFromSearch("?table=demo.orders;drop")).toBeNull();
    expect(tableFromSearch("")).toBeNull();
  });

  it("moves a taken id onto the id field", () => {
    expect(saveErrorField("id_taken", "en")).toEqual({ scriptId: "A check with this ID already exists." });
    expect(saveErrorField("forbidden", "en")).toBeNull();
    expect(saveErrorField(undefined, "en")).toBeNull();
  });

  it("opens the new check, or the list while it waits for approval", () => {
    expect(afterSaveHref("duplicate-orders", false)).toBe("/checks/duplicate-orders");
    expect(afterSaveHref("duplicate-orders", true)).toBe("/checks");
  });
});
