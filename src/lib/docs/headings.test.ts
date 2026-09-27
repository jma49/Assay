import { describe, expect, it } from "vitest";
import { extractHeadings, headingId, plainText } from "./headings";

describe("headingId", () => {
  it("makes URL-safe ids and keeps Chinese", () => {
    expect(headingId("Step 1 — Sign in")).toBe("step-1-sign-in");
    expect(headingId("第 1 步：登录")).toBe("第-1-步-登录");
    expect(headingId("`SELECT` only")).toBe("select-only");
  });
});

describe("extractHeadings", () => {
  it("collects h2 and h3 but ignores headings inside code fences", () => {
    const md = "# Title\n\n## One\n\n```bash\n## not a heading\n```\n\n### Two\n";
    expect(extractHeadings(md)).toEqual([
      { id: "one", text: "One", depth: 2 },
      { id: "two", text: "Two", depth: 3 },
    ]);
  });
});

describe("plainText", () => {
  it("drops code, links and markup", () => {
    expect(plainText("Run **this** [link](/x)\n\n```sql\nselect 1\n```\n")).toBe("Run this link");
  });
});
