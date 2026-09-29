import { describe, expect, it } from "vitest";
import { CreateDataSource, UpdateDataSource } from "@/contracts/data-sources";
import { CheckEditInput, NewCheckInput } from "@/contracts/check-input";
import { isReservedSourceId, sourceIdOf, toSourceId } from "./data-source";

describe("data source ids", () => {
  it("suggests an id from a name", () => {
    expect(toSourceId("Billing (EU) — replica")).toBe("billing-eu-replica");
    expect(toSourceId("  Café DB ")).toBe("cafe-db");
    expect(toSourceId("主库")).toBe("");
    expect(toSourceId("x".repeat(60))).toHaveLength(40);
  });

  it("treats a check without a source as the built-in one", () => {
    expect(sourceIdOf({})).toBe("default");
    expect(sourceIdOf(null)).toBe("default");
    expect(sourceIdOf({ dataSourceId: "" })).toBe("default");
    expect(sourceIdOf({ dataSourceId: "billing" })).toBe("billing");
  });

  it("reserves the built-in id and the test route's", () => {
    expect(isReservedSourceId("default")).toBe(true);
    expect(isReservedSourceId("test")).toBe(true);
    expect(isReservedSourceId("billing")).toBe(false);
  });
});

describe("data source contracts", () => {
  const valid = { sourceId: "billing", name: "Billing", connectionString: "postgres://u:p@h/db" };

  it("defaults the engine to postgres and refuses others", () => {
    expect(CreateDataSource.parse(valid).engine).toBe("postgres");
    expect(CreateDataSource.safeParse({ ...valid, engine: "mysql" }).success).toBe(false);
  });

  it.each(["Billing", "bill_ing", "-billing", "billing-", "a".repeat(41)])("refuses the id %s", (sourceId) => {
    expect(CreateDataSource.safeParse({ ...valid, sourceId }).success).toBe(false);
  });

  it("keeps the stored connection when an edit sends none or an empty one, and needs a version", () => {
    expect(UpdateDataSource.parse({ name: "B", connectionString: "  ", version: 2 }).connectionString).toBe("");
    expect(UpdateDataSource.parse({ version: 2 }).connectionString).toBeUndefined();
    expect(UpdateDataSource.safeParse({ name: "B" }).success).toBe(false);
  });

  it("lets checks name a source on create and edit", () => {
    const check = { scriptId: "c", name: "C", sqlContent: "SELECT 1" };
    expect(NewCheckInput.parse({ ...check, dataSourceId: "billing" }).dataSourceId).toBe("billing");
    expect(NewCheckInput.parse(check).dataSourceId).toBeUndefined();
    expect(CheckEditInput.parse({ dataSourceId: "billing", version: 1 }).dataSourceId).toBe("billing");
    expect(CheckEditInput.safeParse({ dataSourceId: "Not An Id", version: 1 }).success).toBe(false);
  });
});
