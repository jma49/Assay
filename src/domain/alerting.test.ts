import { describe, expect, it } from "vitest";
import { isAcknowledged, isMuted, suppressionFor } from "./alerting";

const now = new Date("2026-09-27T10:00:00Z");
const since = new Date("2026-09-27T08:00:00Z");
const by = { id: "u1", name: "Ada" };

describe("isMuted", () => {
  it("holds until mutedUntil", () => {
    expect(isMuted({ mutedUntil: new Date("2026-09-27T11:00:00Z") }, now)).toBe(true);
    expect(isMuted({ mutedUntil: new Date("2026-09-27T09:00:00Z") }, now)).toBe(false);
    expect(isMuted({ mutedUntil: null }, now)).toBe(false);
    expect(isMuted(null, now)).toBe(false);
  });
});

describe("isAcknowledged", () => {
  const ack = { since, by, at: now };
  it("covers only the episode it was given for", () => {
    expect(isAcknowledged({ ack }, { since, outcome: "issues" })).toBe(true);
    expect(isAcknowledged({ ack }, { since: now, outcome: "error" })).toBe(false);
    expect(isAcknowledged({ ack }, { since, outcome: "clean" })).toBe(false);
    expect(isAcknowledged({}, { since, outcome: "issues" })).toBe(false);
  });
});

describe("suppressionFor", () => {
  const ack = { since, by, at: now };
  it("mutes everything, acknowledgements only more rows of the same problem", () => {
    const muted = { mutedUntil: new Date("2026-09-28T00:00:00Z") };
    expect(suppressionFor("recovered", muted, { since, outcome: "clean" }, now)).toBe("muted");
    expect(suppressionFor("new_rows", { ack }, { since, outcome: "issues" }, now)).toBe("acknowledged");
    expect(suppressionFor("broken", { ack }, { since: now, outcome: "error" }, now)).toBeNull();
    expect(suppressionFor("issues", { ack }, { since, outcome: "issues" }, now)).toBeNull();
    expect(suppressionFor("new_rows", null, { since, outcome: "issues" }, now)).toBeNull();
  });
});
