import { describe, expect, it } from "vitest";
import { parseRunArgs } from "./run-args";

describe("parseRunArgs", () => {
  it("runs a batch of all or scheduled checks", () => {
    expect(parseRunArgs([])).toEqual({ kind: "batch", mode: "all", dryRun: false });
    expect(parseRunArgs(["scheduled", "--dry-run"])).toEqual({ kind: "batch", mode: "scheduled", dryRun: true });
    expect(parseRunArgs(["enabled"])).toEqual({ kind: "batch", mode: "scheduled", dryRun: false });
  });

  it("runs one check by id", () => {
    expect(parseRunArgs(["--check=orders-without-invoice"])).toEqual({ kind: "one", checkId: "orders-without-invoice" });
    expect(parseRunArgs(["scheduled", "--check=legacy_check.v2"])).toEqual({ kind: "one", checkId: "legacy_check.v2" });
  });

  it("refuses ids that are empty, look like options or carry spaces", () => {
    expect(parseRunArgs(["--check="])).toBeNull();
    expect(parseRunArgs(["--check=--dry-run"])).toBeNull();
    expect(parseRunArgs(["--check=a b"])).toBeNull();
    expect(parseRunArgs(["--check=$(id)"])).toBeNull();
    expect(parseRunArgs(["--help"])).toBeNull();
  });
});
