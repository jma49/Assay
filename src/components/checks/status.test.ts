import { describe, expect, it } from "vitest";
import { outcomeOf } from "./status";

describe("outcomeOf", () => {
  it("prefers the attention status, then success, and treats anything else as broken", () => {
    expect(outcomeOf({ status: "success", statusType: "attention_needed" })).toBe("issues");
    expect(outcomeOf({ status: "success" })).toBe("clean");
    expect(outcomeOf({ status: "success", statusType: "success" })).toBe("clean");
    expect(outcomeOf({ status: "failure" })).toBe("error");
    expect(outcomeOf({ status: "error", statusType: "failed" })).toBe("error");
  });
});
