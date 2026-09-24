import { describe, expect, it } from "vitest";
import { buildEditHistoryEntry } from "./edit-history";

const script = {
  scriptId: "demo-check",
  name: "Demo check",
  author: "alex",
  sqlContent: "SELECT 1",
  isScheduled: false,
};

describe("buildEditHistoryEntry", () => {
  it("snapshots the new script on create", () => {
    const entry = buildEditHistoryEntry({ scriptId: "demo-check", operation: "create", newData: script });

    expect(entry?.changes).toEqual([]);
    expect(entry?.scriptSnapshot).toMatchObject({ scriptId: "demo-check", name: "Demo check", author: "alex" });
  });

  it("lists only changed tracked fields on update", () => {
    const entry = buildEditHistoryEntry({
      scriptId: "demo-check",
      operation: "update",
      oldData: script,
      newData: { ...script, sqlContent: "SELECT 2", updatedAt: new Date() },
    });

    expect(entry?.changes).toEqual([{ field: "sqlContent", oldValue: "SELECT 1", newValue: "SELECT 2" }]);
    expect(entry?.scriptSnapshot.name).toBe("Demo check");
  });

  it("skips an update that changed no tracked field", () => {
    expect(
      buildEditHistoryEntry({
        scriptId: "demo-check",
        operation: "update",
        oldData: script,
        newData: { ...script, updatedAt: new Date() },
      }),
    ).toBeNull();
  });

  it("snapshots the removed script on delete", () => {
    const entry = buildEditHistoryEntry({ scriptId: "demo-check", operation: "delete", oldData: script });

    expect(entry?.scriptSnapshot).toMatchObject({ scriptId: "demo-check", name: "Demo check" });
  });
});
