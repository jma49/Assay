import { describe, expect, it } from "vitest";
import type { DataSourceDto } from "@/contracts/data-sources";
import { pickSource } from "@/components/checks/data-source/useDataSourceOptions";
import { sourceFromSearch } from "@/components/checks/new/new-check";
import { canSave, changeForm, emptyForm, formOf, saveBody, sourceName, testRequest, testTone } from "./data-sources";

const billing: DataSourceDto = {
  sourceId: "billing",
  name: "Billing",
  engine: "postgres",
  display: "reader@billing.example.com:5432/billing",
  builtIn: false,
  version: 4,
  lastTest: null,
  checkCount: 2,
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
};

describe("the data source form", () => {
  it("suggests the id from the name until one is typed", () => {
    let form = changeForm(emptyForm(), "name", "Billing Replica");
    expect(form.sourceId).toBe("billing-replica");
    form = changeForm(form, "sourceId", "bills");
    form = changeForm(form, "name", "Billing EU");
    expect(form.sourceId).toBe("bills");
  });

  it("never suggests an id while editing", () => {
    expect(changeForm(formOf(billing), "name", "Renamed").sourceId).toBe("billing");
  });

  it("adds with everything, and edits with the version and only a typed connection", () => {
    const adding = { name: " Billing ", sourceId: "billing", connectionString: " postgres://u:p@h/db ", idEdited: false };
    expect(saveBody(adding, null)).toEqual({ name: "Billing", sourceId: "billing", connectionString: "postgres://u:p@h/db" });
    expect(saveBody(formOf(billing), billing)).toEqual({ name: "Billing", version: 4 });
    expect(saveBody({ ...formOf(billing), connectionString: "postgres://x@y/z" }, billing)).toMatchObject({ connectionString: "postgres://x@y/z" });
  });

  it("needs a connection string to add, not to edit", () => {
    expect(canSave(changeForm(emptyForm(), "name", "Billing"), null)).toBe(false);
    expect(canSave({ name: "B", sourceId: "b", connectionString: "postgres://u@h/d", idEdited: true }, null)).toBe(true);
    expect(canSave(formOf(billing), billing)).toBe(true);
    expect(canSave({ ...formOf(billing), name: " " }, billing)).toBe(false);
  });

  it("tests what was typed, else the saved source", () => {
    expect(testRequest({ ...emptyForm(), connectionString: "postgres://u@h/d" }, null)).toEqual({
      url: "/api/data-sources/test",
      body: { connectionString: "postgres://u@h/d" },
    });
    expect(testRequest(formOf(billing), billing)).toEqual({ url: "/api/data-sources/billing/test" });
    expect(testRequest(emptyForm(), null)).toBeNull();
  });
});

describe("how sources read", () => {
  it("names the built-in source in the reader's language", () => {
    expect(sourceName({ sourceId: "default", name: "Primary", builtIn: true }, "zh")).toBe("主库");
    expect(sourceName({ sourceId: "default", name: "Primary" }, "en")).toBe("Primary");
    expect(sourceName(billing, "zh")).toBe("Billing");
  });

  it("marks a test failed, connected with write access, or connected read-only", () => {
    expect(testTone({ ok: false })).toBe("failure");
    expect(testTone({ ok: true, readOnly: false })).toBe("attention");
    expect(testTone({ ok: true, readOnly: true })).toBe("success");
  });
});

describe("choosing a check's source", () => {
  const options = [
    { sourceId: "default", label: "Primary" },
    { sourceId: "billing", label: "Billing" },
  ];

  it("keeps a known source, falls back to the first, and waits while loading", () => {
    expect(pickSource("billing", options)).toBe("billing");
    expect(pickSource("gone", options)).toBe("default");
    expect(pickSource("default", [{ sourceId: "billing", label: "Billing" }])).toBe("billing");
    expect(pickSource("default", [])).toBe("default");
  });

  it("reads a valid ?source= from a coverage link", () => {
    expect(sourceFromSearch("?table=demo.orders&source=billing")).toBe("billing");
    expect(sourceFromSearch("?source=Bad%20Id")).toBeNull();
    expect(sourceFromSearch("")).toBeNull();
  });
});
