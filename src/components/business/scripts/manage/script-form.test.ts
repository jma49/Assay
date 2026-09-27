import { describe, expect, it } from "vitest";
import type { SqlScript } from "@/components/business/dashboard/types";
import {
  applyFieldChange,
  classifyDelete,
  classifySave,
  createPayload,
  emptyForm,
  formFromScript,
  newScriptId,
  saveProblem,
  stillNeededHint,
  suggestScriptId,
  toFormMetadata,
  updatePayload,
} from "./script-form";

const script: SqlScript = {
  _id: "abc",
  scriptId: "orders-without-customer",
  name: "Orders without customer",
  cnName: "缺少客户的订单",
  author: "ann",
  sqlContent: "SELECT 1",
  hashtags: ["orders"],
  version: 4,
};

const validForm = { ...emptyForm("orders-check"), name: "Orders", author: "ann" };

describe("form setup", () => {
  it("names a new check from the clock", () => {
    expect(newScriptId(1727400123456)).toBe("new-script-123456");
  });

  it("loads an existing check with schedule defaults and keeps its version", () => {
    const form = formFromScript(script);
    expect(form).toMatchObject({ isScheduled: false, cronSchedule: "", version: 4, scriptId: script.scriptId });
  });

  it("fills every metadata field for the form", () => {
    expect(toFormMetadata({ name: "A" })).toEqual({
      scriptId: "",
      name: "A",
      cnName: "",
      description: "",
      cnDescription: "",
      author: "",
      scope: "",
      cnScope: "",
      hashtags: [],
      isScheduled: false,
      cronSchedule: "",
    });
  });
});

describe("applyFieldChange", () => {
  it("derives the script ID from the name while adding", () => {
    expect(suggestScriptId("Orders  Without_Customer!")).toBe("orders-withoutcustomer");
    const next = applyFieldChange({ form: emptyForm("x"), idManuallyEdited: false }, "add", "name", "Late Orders");
    expect(next.form).toMatchObject({ name: "Late Orders", scriptId: "late-orders" });
    expect(next.idManuallyEdited).toBe(false);
  });

  it("stops following the name once the ID was typed", () => {
    const typed = applyFieldChange({ form: emptyForm("x"), idManuallyEdited: false }, "add", "scriptId", "mine");
    expect(typed.idManuallyEdited).toBe(true);
    const renamed = applyFieldChange(typed, "add", "name", "Other");
    expect(renamed.form.scriptId).toBe("mine");
  });

  it("never touches the ID of an existing check", () => {
    const next = applyFieldChange({ form: formFromScript(script), idManuallyEdited: false }, "edit", "name", "New name");
    expect(next.form.scriptId).toBe(script.scriptId);
  });
});

describe("saveProblem", () => {
  it("accepts a complete read-only check", () => {
    expect(saveProblem(validForm, "SELECT 1", "en")).toBeNull();
  });

  it("lists missing required fields", () => {
    const problem = saveProblem(emptyForm(""), "  ", "en");
    expect(problem?.title).toBe("Fill in the required fields");
    expect(problem?.duration).toBe(6000);
  });

  it("rejects a scheduled check without a cron expression", () => {
    const problem = saveProblem({ ...validForm, isScheduled: true, cronSchedule: "" }, "SELECT 1", "en");
    expect(problem?.title).toBeTruthy();
    expect(problem?.description).toBeUndefined();
  });

  it("rejects SQL that writes", () => {
    const problem = saveProblem(validForm, "DELETE FROM orders", "en");
    expect(problem?.title).toBe("The query failed the read-only check");
    expect(problem?.duration).toBe(10000);
  });

  it("hints what is still empty, without the author", () => {
    expect(stillNeededHint(emptyForm(""), "", "en")).toBe("Still needed: name, script ID, query");
    expect(stillNeededHint(validForm, "SELECT 1", "en")).toBeNull();
    expect(stillNeededHint({ ...validForm, name: "" }, "SELECT 1", "zh")).toBe("还需填写：名称");
  });
});

describe("payloads", () => {
  it("creates with the whole form and the SQL", () => {
    expect(createPayload(validForm, "SELECT 1")).toEqual({ ...validForm, sqlContent: "SELECT 1" });
  });

  it("updates with the version the edit started from and without unchanged SQL", () => {
    const payload = updatePayload(formFromScript(script), "SELECT 1", "SELECT 1");
    expect(payload).toEqual({
      name: script.name,
      cnName: script.cnName,
      author: "ann",
      hashtags: ["orders"],
      isScheduled: false,
      cronSchedule: "",
      version: 4,
    });
    expect(payload).not.toHaveProperty("scriptId");
    expect(payload).not.toHaveProperty("_id");
  });

  it("sends changed SQL and version 0 for a check that never had one", () => {
    const payload = updatePayload({ ...formFromScript(script), version: undefined }, "SELECT 2", "SELECT 1");
    expect(payload.sqlContent).toBe("SELECT 2");
    expect(payload.version).toBe(0);
  });
});

describe("classifySave", () => {
  it("treats 409 as a conflict even when the body asks for approval", () => {
    expect(classifySave({ ok: false, status: 409 }, { requiresApproval: true }, "edit")).toEqual({ kind: "conflict" });
  });

  it("reports approval from both failed and successful responses", () => {
    expect(classifySave({ ok: false, status: 202 }, { requiresApproval: true, message: "m" }, "edit")).toEqual({ kind: "approval", message: "m" });
    expect(classifySave({ ok: true, status: 200 }, { requiresApproval: true, message: "m" }, "add")).toEqual({ kind: "approval", message: "m" });
  });

  it("prefers the server message and falls back to the status", () => {
    expect(classifySave({ ok: false, status: 400 }, { message: "bad" }, "add")).toEqual({ kind: "failed", message: "bad" });
    expect(classifySave({ ok: false, status: 500 }, null, "edit")).toEqual({ kind: "failed", message: "Failed to edit script: 500" });
  });

  it("marks a plain success as saved", () => {
    expect(classifySave({ ok: true, status: 200 }, { success: true }, "edit")).toEqual({ kind: "saved" });
  });
});

describe("classifyDelete", () => {
  it("maps failures, approvals and deletes", () => {
    expect(classifyDelete({ ok: false, status: 403 }, {})).toEqual({ kind: "failed", message: "Failed to delete script: 403" });
    expect(classifyDelete({ ok: true, status: 200 }, { requiresApproval: true, message: "m" })).toEqual({ kind: "approval", message: "m" });
    expect(classifyDelete({ ok: true, status: 200 }, {})).toEqual({ kind: "deleted" });
  });
});
