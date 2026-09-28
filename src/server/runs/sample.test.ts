import { describe, expect, it } from "vitest";
import { storedSample } from "./sample";

describe("storedSample", () => {
  it("reads the sample, falling back to the retired raw_results", () => {
    expect(storedSample({ sample: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(storedSample({ raw_results: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(storedSample({ sample: [], raw_results: [{ id: 2 }] })).toEqual([]);
  });

  it("gives no rows for a missing run or a malformed field", () => {
    expect(storedSample(null)).toEqual([]);
    expect(storedSample({ sample: "oops" })).toEqual([]);
  });
});
