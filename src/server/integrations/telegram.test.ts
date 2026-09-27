import { describe, expect, it } from "vitest";
import { parseCallbackData, startCode } from "./telegram";

describe("startCode", () => {
  it("reads the code from /start, with or without the bot's name", () => {
    expect(startCode("/start abcdefghijklmnop1234")).toBe("abcdefghijklmnop1234");
    expect(startCode("/start@AssayBot abcdefghijklmnop_-34")).toBe("abcdefghijklmnop_-34");
  });

  it("ignores anything else", () => {
    expect(startCode(undefined)).toBeNull();
    expect(startCode("/start")).toBeNull();
    expect(startCode("/start short")).toBeNull();
    expect(startCode("hello /start abcdefghijklmnop1234")).toBeNull();
    expect(startCode("/start abcdefghijklmnop1234 extra")).toBeNull();
    expect(startCode("/start abc$efghijklmnop1234")).toBeNull();
  });
});

describe("parseCallbackData", () => {
  it("reads our buttons only", () => {
    expect(parseCallbackData("assay_ack:65f000000000000000000001.abcdefghijklmn_-")).toEqual({
      action: "assay_ack",
      token: "65f000000000000000000001.abcdefghijklmn_-",
    });
    expect(parseCallbackData("assay_mute:t")).toEqual({ action: "assay_mute", token: "t" });
    expect(parseCallbackData("done")).toBeNull();
    expect(parseCallbackData("drop_table:x")).toBeNull();
    expect(parseCallbackData(undefined)).toBeNull();
  });
});
