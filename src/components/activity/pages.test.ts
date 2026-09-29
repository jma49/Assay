import { describe, expect, it } from "vitest";
import type { ActivityItem } from "@/contracts/activity";
import { addPage } from "./pages";

const item = (id: string) => ({ id }) as unknown as ActivityItem;

describe("addPage", () => {
  it("replaces everything with the first page", () => {
    const pages = [
      { cursor: null, items: [item("a")] },
      { cursor: "c1", items: [item("b")] },
    ];
    expect(addPage(pages, null, [item("z")])).toEqual([{ cursor: null, items: [item("z")] }]);
  });

  it("appends an older page once", () => {
    const first = addPage([], null, [item("a")]);
    const two = addPage(first, "c1", [item("b")]);
    expect(two).toEqual([
      { cursor: null, items: [item("a")] },
      { cursor: "c1", items: [item("b")] },
    ]);
    expect(addPage(two, "c1", [item("b")])).toBe(two);
  });
});
