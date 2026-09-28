import { describe, expect, it, vi } from "vitest";
import type { CheckSummary } from "@/contracts/checks";
import { ROLE_PERMISSIONS, UserRole } from "@/lib/auth/rbac";
import type { McpCaller } from "./caller";
import { toolsFor, type ToolDeps } from "./tools";

vi.mock("@/server/services/checks-read", () => ({
  listChecks: async (): Promise<Partial<CheckSummary>[]> => [
    { scriptId: "orders", name: "Duplicate orders", tags: ["finance"], schedule: null, state: { outcome: "issues", rowCount: 3, previousRowCount: 1, since: "s", lastRunAt: "l", lastRunId: "r" }, alerting: { owner: null, mutedUntil: null, mutedBy: null, acknowledged: null } },
    { scriptId: "ship", name: "Shipping", tags: [], schedule: "0 9 * * *", state: null, alerting: { owner: { id: "u", name: "ada" }, mutedUntil: null, mutedBy: null, acknowledged: null } },
  ],
  getCheckDetail: async () => null,
}));

const caller = (role: UserRole): McpCaller => ({ userId: "u1", name: "Ada", email: "ada@example.com", permissions: ROLE_PERMISSIONS[role], credential: "api-key:k" });

function deps(runCheck: ToolDeps["runCheck"] = vi.fn()) {
  const afterRun = vi.fn<() => void>();
  return { db: async () => ({}) as never, runCheck, afterRun, appUrl: "https://assay.example" } satisfies ToolDeps;
}

const find = (role: UserRole, name: string, d = deps()) => toolsFor(caller(role), d).find((t) => t.name === name)!;

describe("toolsFor", () => {
  it("lists only what the role allows", () => {
    expect(toolsFor(caller(UserRole.VIEWER), deps()).map((t) => t.name)).toEqual(["list_checks", "get_check", "get_run", "list_activity"]);
    expect(toolsFor(caller(UserRole.DEVELOPER), deps()).map((t) => t.name)).toContain("run_check");
  });

  it("marks reads as read-only", () => {
    for (const tool of toolsFor(caller(UserRole.ADMIN), deps())) {
      expect(tool.annotations.readOnlyHint, tool.name).toBe(tool.name.startsWith("list_") || tool.name.startsWith("get_"));
    }
  });
});

describe("list_checks", () => {
  it("filters by status, tag and text and links each check", async () => {
    const tool = find(UserRole.VIEWER, "list_checks");
    expect(await tool.handler({ status: "never_run" })).toMatchObject({ count: 1, checks: [{ id: "ship", owner: "ada", schedule: "0 9 * * *" }] });
    expect(await tool.handler({ tag: "finance" })).toMatchObject({ count: 1, checks: [{ id: "orders", status: "issues", rows: 3, url: "https://assay.example/checks/orders" }] });
    expect(await tool.handler({ search: "SHIP" })).toMatchObject({ count: 1 });
  });
});

describe("run_check", () => {
  it("runs as the key's owner and sends alerts afterwards", async () => {
    const runCheck = vi.fn(async () => ({ kind: "completed" as const, runId: "r9", outcome: "error" as const, rowCount: 0, diff: null, message: "syntax error", findings: "", stateUpdated: true }));
    const d = deps(runCheck);
    const result = await find(UserRole.DEVELOPER, "run_check", d).handler({ check_id: "orders" });
    expect(runCheck).toHaveBeenCalledWith("orders", { id: "u1", name: "Ada" });
    expect(d.afterRun).toHaveBeenCalled();
    expect(result).toMatchObject({ status: "broken", rows: null, error: "syntax error", run_id: "r9" });
  });

  it("reports a run already in progress and missing checks", async () => {
    const busy = deps(vi.fn(async () => ({ kind: "busy" as const, runId: "r1" })));
    expect(await find(UserRole.DEVELOPER, "run_check", busy).handler({ check_id: "orders" })).toEqual({ status: "already_running", run_id: "r1" });
    expect(busy.afterRun).not.toHaveBeenCalled();
    const missing = deps(vi.fn(async () => ({ kind: "missing" as const })));
    await expect(find(UserRole.DEVELOPER, "run_check", missing).handler({ check_id: "x" })).rejects.toThrow("No check with id x");
  });
});
