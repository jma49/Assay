import { describe, expect, it } from "vitest";
import type { CheckListItem } from "../types";
import { batchTargets, collectHashtags, filterChecks } from "./script-search";

const scripts: CheckListItem[] = [
  { scriptId: "dup-orders", name: "Duplicate orders", hashtags: ["orders", "daily"], isScheduled: true },
  { scriptId: "neg-stock", name: "Negative stock", cnName: "库存为负", hashtags: ["inventory"] },
  { scriptId: "late-refunds", name: "Late refunds", description: "Refunds pending for orders" },
];

describe("filterChecks", () => {
  it("returns everything for an empty search", () => {
    expect(filterChecks(scripts, "  ")).toBe(scripts);
  });

  it("matches words against ids, names and descriptions, ignoring case", () => {
    expect(filterChecks(scripts, "ORDERS").map((s) => s.scriptId)).toEqual(["dup-orders", "late-refunds"]);
    expect(filterChecks(scripts, "库存").map((s) => s.scriptId)).toEqual(["neg-stock"]);
  });

  it("requires every #tag, matched by substring, together with the words", () => {
    expect(filterChecks(scripts, "#ord #dai").map((s) => s.scriptId)).toEqual(["dup-orders"]);
    expect(filterChecks(scripts, "refunds #orders")).toEqual([]);
  });
});

describe("helpers", () => {
  it("collects tags once, sorted", () => {
    expect(collectHashtags(scripts)).toEqual(["daily", "inventory", "orders"]);
  });

  it("keeps only scheduled checks in scheduled mode", () => {
    expect(batchTargets(scripts, "scheduled").map((s) => s.scriptId)).toEqual(["dup-orders"]);
    expect(batchTargets(scripts, "all")).toHaveLength(3);
  });
});
