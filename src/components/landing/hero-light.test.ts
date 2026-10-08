import { describe, expect, it } from "vitest";
import { canRunHeroShader, readHeroPalette } from "./hero-light";

describe("canRunHeroShader", () => {
  const capable = { reducedMotion: false, saveData: false, hasWebGpu: true, wideViewport: true };

  it("runs when the browser has WebGPU and the visitor allows motion", () => {
    expect(canRunHeroShader(capable)).toBe(true);
  });

  it.each([
    ["without WebGPU", { hasWebGpu: false }],
    ["under reduced motion", { reducedMotion: true }],
    ["when the visitor saves data", { saveData: true }],
    ["on a phone-width viewport", { wideViewport: false }],
  ])("keeps the CSS light %s", (_, override) => {
    expect(canRunHeroShader({ ...capable, ...override })).toBe(false);
  });
});

describe("readHeroPalette", () => {
  it("reads the accents from the theme tokens", () => {
    const tokens: Record<string, string> = { "--night-accent": " #8c9bff", "--night-accent-pale": "#c3caff " };
    expect(readHeroPalette((token) => tokens[token] ?? "")).toEqual({ accent: "#8c9bff", accentPale: "#c3caff" });
  });

  it("gives up when a token is missing", () => {
    expect(readHeroPalette((token) => (token === "--night-accent" ? "#8c9bff" : ""))).toBeNull();
  });
});
