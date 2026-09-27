import { describe, expect, it } from "vitest";
import { outcomeFilter, toLegacyRunView } from "./legacy-view";

const run = { _id: "r1", checkId: "orders", finishedAt: new Date("2026-09-27T00:00:00Z"), outcome: "issues", message: "m", findings: "Found 2", raw_results: [{ a: 1 }] };

describe("toLegacyRunView", () => {
  it("maps the current fields to the older names", () => {
    expect(toLegacyRunView(run)).toEqual({
      _id: "r1",
      script_name: "orders",
      execution_time: run.finishedAt,
      status: "success",
      statusType: "attention_needed",
      message: "m",
      findings: "Found 2",
    });
    expect(toLegacyRunView({ ...run, outcome: "error" }).status).toBe("failure");
    expect(toLegacyRunView(run, true).raw_results).toEqual([{ a: 1 }]);
  });
});

describe("outcomeFilter", () => {
  it("reads the three legacy statuses and ignores anything else", () => {
    expect(outcomeFilter("success")).toBe("clean");
    expect(outcomeFilter("attention_needed")).toBe("issues");
    expect(outcomeFilter("failure")).toBe("error");
    expect(outcomeFilter("all")).toBeNull();
    expect(outcomeFilter(null)).toBeNull();
  });
});
