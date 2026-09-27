import { describe, expect, it } from "vitest";
import { fingerprintRow } from "./fingerprint";
import { markRows } from "./row-marks";

describe("markRows", () => {
  const a = { id: 1 };
  const b = { id: 2 };
  const c = { id: 3 };

  it("marks new and still-open rows and lists the fixed ones", () => {
    const result = markRows({ rows: [b, c] }, { rows: [a, b] });
    expect(result.rows).toEqual([
      { mark: "still", values: b },
      { mark: "new", values: c },
    ]);
    expect(result.fixed).toEqual([a]);
  });

  it("uses stored fingerprints, which cover rows beyond the stored sample", () => {
    // The previous run's sample lost row b, but its fingerprints still know it.
    const result = markRows({ rows: [b], keys: [fingerprintRow(b)] }, { rows: [a], keys: [fingerprintRow(a), fingerprintRow(b)] });
    expect(result.rows).toEqual([{ mark: "still", values: b }]);
    expect(result.fixed).toEqual([a]);
  });

  it("marks nothing without a previous run", () => {
    expect(markRows({ rows: [a] }, null)).toEqual({ rows: [{ mark: null, values: a }], fixed: [] });
  });
});
