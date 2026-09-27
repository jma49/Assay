import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./activity";

describe("activity cursor", () => {
  it("round-trips time and id", () => {
    const id = new ObjectId().toHexString();
    const at = new Date("2026-09-26T09:00:00Z");
    const decoded = decodeCursor(encodeCursor(at, id));
    expect(decoded?.at).toEqual(at);
    expect(decoded?.id.toHexString()).toBe(id);
  });

  it("ignores cursors it did not make", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("garbage")).toBeNull();
    expect(decodeCursor(Buffer.from("not-a-date|abc").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(`${new Date().toISOString()}|{"$gt":""}`).toString("base64url"))).toBeNull();
  });
});
