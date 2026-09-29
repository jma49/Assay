import { describe, expect, it } from "vitest";
import { COPY, hostOf, parseTags, subscriptionBody } from "./subscription";

describe("subscription form", () => {
  it("splits tags on ASCII and full-width commas, without blanks or duplicates", () => {
    expect(parseTags(" finance, orders，finance ,, ")).toEqual(["finance", "orders"]);
  });

  it("builds the API body, with reminders off at 0 hours", () => {
    const digest = { enabled: true, hour: 9, timeZone: "UTC" };
    expect(subscriptionBody({ name: "Ops", alerts: ["broken"], tags: "a, b", language: "zh", digest, remindAfter: 0 })).toEqual({
      name: "Ops",
      language: "zh",
      alerts: ["broken"],
      tags: ["a", "b"],
      digest,
      remind: null,
    });
    expect(subscriptionBody({ name: "Ops", alerts: [], tags: "", language: "en", digest, remindAfter: 4 }).remind).toEqual({ afterHours: 4 });
  });

  it("names the host of a URL, or echoes text that is not one", () => {
    expect(hostOf("https://hooks.example.com/x")).toBe("hooks.example.com");
    expect(hostOf("not a url")).toBe("not a url");
  });

  it("has the same copy keys in English and Chinese", () => {
    expect(Object.keys(COPY.zh).sort()).toEqual(Object.keys(COPY.en).sort());
  });
});
