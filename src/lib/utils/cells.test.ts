import { describe, expect, it } from "vitest";
import { cellText } from "./cells";

describe("cellText", () => {
  it("shortens ISO timestamps and keeps other values", () => {
    expect(cellText("2026-08-15T19:09:17.240Z")).toBe("2026-08-15 19:09:17");
    expect(cellText("2026-08-15")).toBe("2026-08-15");
    expect(cellText(null)).toBe("NULL");
    expect(cellText(12.5)).toBe("12.5");
    expect(cellText({ a: 1 })).toBe('{"a":1}');
  });
});
