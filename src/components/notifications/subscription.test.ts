import { describe, expect, it } from "vitest";
import type { DestinationDto } from "@/contracts/notifications";
import { COPY, defaultDigest, hostOf, parseTags, subscriptionBody, subscriptionOf } from "./subscription";

describe("subscriptionOf", () => {
  const destination = { name: "Ops", alerts: ["broken"], tags: ["a", "b"], language: "zh" } as unknown as DestinationDto;

  it("fills the form from a destination, with defaults for digest and reminders", () => {
    expect(subscriptionOf(destination)).toEqual({ name: "Ops", alerts: ["broken"], tags: "a, b", language: "zh", digest: defaultDigest(), remindAfter: 0 });
  });

  it("keeps a saved digest and reminder", () => {
    const digest = { enabled: true, hour: 8, timeZone: "UTC" };
    expect(subscriptionOf({ ...destination, digest, remind: { afterHours: 4 } } as DestinationDto)).toMatchObject({ digest, remindAfter: 4 });
  });
});

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
