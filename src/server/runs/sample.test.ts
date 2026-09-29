import { describe, expect, it } from "vitest";
import { jsonBytes, SAMPLE_BYTES } from "@/domain/run";
import { responseSample, storedSample } from "./sample";

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

describe("responseSample", () => {
  it("trims an old run's sample to SAMPLE_BYTES of UTF-8", () => {
    // Saved under the old rule: 2 MB counted in characters, about 6 MB of bytes.
    const old = Array.from({ length: 500 }, (_, id) => ({ id, text: "中".repeat(1_300) }));
    const rows = responseSample({ raw_results: old });
    expect(rows.length).toBeLessThan(old.length);
    expect(jsonBytes(rows)).toBeLessThanOrEqual(SAMPLE_BYTES);
  });

  it("leaves a small sample alone", () => {
    expect(responseSample({ sample: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });
});
