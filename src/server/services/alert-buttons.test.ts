import { describe, expect, it } from "vitest";
import { buttonReply, parseToken } from "./alert-buttons";

describe("parseToken", () => {
  it("accepts only an event id and a 16-character key", () => {
    expect(parseToken("65f000000000000000000001.abcdefghijklmn_-")).toEqual({ eventId: "65f000000000000000000001", key: "abcdefghijklmn_-" });
    expect(parseToken("65f000000000000000000001.short")).toBeNull();
    expect(parseToken("not-an-id.abcdefghijklmn_-")).toBeNull();
    expect(parseToken('{"$ne":1}.abcdefghijklmnop')).toBeNull();
  });
});

describe("buttonReply", () => {
  it("names who acted", () => {
    expect(buttonReply("acknowledged", "@ada", "en")).toBe("✅ Acknowledged by @ada");
    expect(buttonReply("muted", "@ada", "zh")).toBe("🔕 @ada 已静音 24 小时");
  });
});
