import { describe, expect, it } from "vitest";
import { authorProblem, ownsCheck, pickEditable } from "./check-fields";

describe("pickEditable", () => {
  it("drops everything the server owns", () => {
    expect(pickEditable({ name: "A", sqlContent: "SELECT 1", demoSeed: true, state: {}, lease: {}, alerting: {}, _id: "x", createdBy: {} })).toEqual({
      name: "A",
      sqlContent: "SELECT 1",
    });
    expect(pickEditable(null)).toEqual({});
  });
});

describe("authorProblem", () => {
  it("refuses the seed's label and odd values", () => {
    expect(authorProblem("Ada")).toBeNull();
    expect(authorProblem(undefined)).toBeNull();
    expect(authorProblem(" Demo-Seed")).toMatch(/reserved/);
    expect(authorProblem({})).toMatch(/text/);
    expect(authorProblem("x".repeat(81))).toMatch(/80/);
  });
});

describe("ownsCheck", () => {
  const ada = { id: "u1", email: "ada@a.com" };
  it("uses createdBy when the check has it, so labels and local parts do not count", () => {
    expect(ownsCheck({ createdBy: { id: "u1" }, author: "someone" }, ada)).toBe(true);
    expect(ownsCheck({ createdBy: { id: "u2" }, author: "ada" }, ada)).toBe(false);
  });
  it("falls back to the author label for checks made before createdBy", () => {
    expect(ownsCheck({ author: "ada" }, ada)).toBe(true);
    expect(ownsCheck({ author: "bob" }, ada)).toBe(false);
    expect(ownsCheck({}, ada)).toBe(false);
  });
});
