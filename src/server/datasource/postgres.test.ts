import { describe, expect, it } from "vitest";
import { readCapped } from "./postgres";

describe("readCapped", () => {
  it("keeps the first rows and counts all of them", async () => {
    let served = 0;
    const read = async (count: number) => {
      const batch = Array.from({ length: Math.min(count, 2_500 - served) }, (_, i) => ({ id: served + i }));
      served += batch.length;
      return batch;
    };
    const result = await readCapped(read, 1_200);
    expect(result.rowCount).toBe(2_500);
    expect(result.rows).toHaveLength(1_200);
    expect(result.rows.at(-1)).toEqual({ id: 1_199 });
  });
});
