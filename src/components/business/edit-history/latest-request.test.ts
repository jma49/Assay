import { describe, expect, it } from "vitest";
import { createLatestRequest } from "./latest-request";

describe("createLatestRequest", () => {
  it("treats only the most recently started request as current", () => {
    const requests = createLatestRequest({ page: 1 });
    const first = requests.start({ page: 1 });
    expect(requests.isLatest(first)).toBe(true);
    const second = requests.start({ page: 2 });
    expect(requests.isLatest(first)).toBe(false);
    expect(requests.isLatest(second)).toBe(true);
  });

  it("keeps a separate counter per instance", () => {
    const a = createLatestRequest(null);
    const b = createLatestRequest(null);
    a.start(null);
    expect(b.isLatest(b.start(null))).toBe(true);
  });

  it("remembers the params of the latest request so a retry repeats it", () => {
    const requests = createLatestRequest({ operation: "all", page: 1 });
    expect(requests.latestParams()).toEqual({ operation: "all", page: 1 });
    requests.start({ operation: "delete", page: 1 });
    requests.start({ operation: "delete", page: 3 });
    expect(requests.latestParams()).toEqual({ operation: "delete", page: 3 });
  });
});
