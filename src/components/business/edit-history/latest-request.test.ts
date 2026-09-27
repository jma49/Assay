import { describe, expect, it } from "vitest";
import { createLatestRequest } from "./latest-request";

describe("createLatestRequest", () => {
  it("treats only the most recently started request as current", () => {
    const requests = createLatestRequest();
    const first = requests.start();
    expect(requests.isLatest(first)).toBe(true);
    const second = requests.start();
    expect(requests.isLatest(first)).toBe(false);
    expect(requests.isLatest(second)).toBe(true);
  });

  it("keeps a separate counter per instance", () => {
    const a = createLatestRequest();
    const b = createLatestRequest();
    a.start();
    expect(b.isLatest(b.start())).toBe(true);
  });
});
