import { describe, expect, it } from "vitest";
import { singleStatement } from "./single-statement";

describe("singleStatement", () => {
  it("sends the text over the extended protocol, where PostgreSQL refuses a second statement", () => {
    const text = "SELECT 1; END; DELETE FROM t";
    expect(singleStatement(text)).toEqual({ text, queryMode: "extended" });
  });
});
