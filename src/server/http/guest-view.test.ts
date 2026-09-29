import { describe, expect, it } from "vitest";
import type { CheckDetail } from "@/contracts/checks";
import { authorForGuest, detailForGuest } from "./guest-view";

describe("authorForGuest", () => {
  it("replaces member handles and keeps the demo seed", () => {
    expect(authorForGuest("ada@example.com")).toBe("Teammate");
    expect(authorForGuest("demo-seed")).toBe("demo-seed");
    expect(authorForGuest(undefined)).toBeUndefined();
    expect(authorForGuest("")).toBe("");
  });
});

describe("detailForGuest", () => {
  it("hides members' names but keeps what happened", () => {
    const check = {
      author: "majincheng@example.com",
      alerting: {
        owner: { id: "user_1", name: "ada" },
        mutedUntil: "2026-09-28T00:00:00.000Z",
        mutedBy: "ada",
        acknowledged: { by: "bob", at: "2026-09-27T00:00:00.000Z" },
      },
    } as CheckDetail;
    const shown = detailForGuest(check);
    expect(JSON.stringify(shown)).not.toMatch(/ada|bob|majincheng|user_1/);
    expect(shown.alerting.mutedUntil).toBe(check.alerting.mutedUntil);
    expect(shown.alerting.acknowledged?.at).toBe(check.alerting.acknowledged?.at);
    expect(detailForGuest({ ...check, author: "demo-seed" }).author).toBe("demo-seed");
  });
});
