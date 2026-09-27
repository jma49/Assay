import { describe, expect, it } from "vitest";
import { cleanRunMessage } from "./run-message";

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
