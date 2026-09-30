import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type-scale size next to a text colour", () => {
    expect(cn("text-body-sm", "text-muted-foreground")).toBe("text-body-sm text-muted-foreground");
  });

  it("lets a later type-scale size replace an earlier one", () => {
    expect(cn("text-body-sm font-medium", "text-caption")).toBe("font-medium text-caption");
    expect(cn("text-sm", "text-label-caps")).toBe("text-label-caps");
  });

  it("still merges colours", () => {
    expect(cn("text-foreground", "text-muted-foreground")).toBe("text-muted-foreground");
  });
});
