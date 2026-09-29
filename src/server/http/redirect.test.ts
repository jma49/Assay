import { describe, expect, it } from "vitest";
import { redirectToPath } from "./redirect";

describe("redirectToPath", () => {
  it("answers 307 with a relative Location", () => {
    const response = redirectToPath("/checks");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/checks");
  });

  it("refuses anything that could leave the site", () => {
    expect(() => redirectToPath("https://evil.example")).toThrow();
    expect(() => redirectToPath("//evil.example")).toThrow();
  });
});
