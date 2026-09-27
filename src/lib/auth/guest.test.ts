import { describe, expect, it } from "vitest";
import { guestIdFromToken, isGuestId, newGuestToken } from "./guest";

const demo = { DEMO_MODE: "true" };

describe("guestIdFromToken", () => {
  it("accepts a well-formed token only in demo mode", () => {
    const token = newGuestToken();
    expect(guestIdFromToken(token, demo)).toBe(`guest_${token}`);
    expect(guestIdFromToken(token, {})).toBeNull();
  });

  it("rejects malformed tokens", () => {
    for (const token of [undefined, "", "abc", "g".repeat(32), `${"a".repeat(32)}x`]) {
      expect(guestIdFromToken(token, demo)).toBeNull();
    }
  });

  it("never collides with user ids", () => {
    expect(isGuestId(guestIdFromToken(newGuestToken(), demo)!)).toBe(true);
    expect(isGuestId("user_2abc")).toBe(false);
  });
});
