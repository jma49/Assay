import type { Db } from "mongodb";
import { z } from "zod";
import type { CheckSummary } from "@/contracts/checks";
import { MAX_MUTE_HOURS } from "@/domain/alerting";
import { ALERT_KINDS, type AlertKind } from "@/domain/notify";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { Permission } from "@/lib/auth/rbac";
import { cellText } from "@/lib/utils/cells";
import { listActivity } from "@/server/services/activity";
import { applyAlertingAction } from "@/server/services/alert-controls";
import { getCheckDetail, listChecks } from "@/server/services/checks-read";
import { responseSample, sampleSlice } from "@/server/runs/sample";
import type { RunCheckResult } from "@/server/services/run-check";
import type { McpCaller } from "./caller";
import { findRun } from "@/server/repos/runs";

export interface ToolDeps {
  db(): Promise<Db>;
  runCheck(checkId: string, by: { id: string; name: string }): Promise<RunCheckResult>;
  /** Sends alerts for a run that just finished. */
  afterRun(): void;
  appUrl: string;
}

interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface AssayTool<Schema extends z.ZodObject = z.ZodObject> {
  name: string;
  title: string;
  description: string;
  /** The caller's role must have this to see and call the tool. */
  permission: Permission;
  inputSchema: Schema;
  annotations: ToolAnnotations;
  handler(input: z.infer<Schema>): Promise<unknown>;
}

const STATUS = { error: "broken", issues: "issues", clean: "clean" } as const;
const MAX_ROWS = 50;

const CheckId = z.string().min(1).max(200).describe("The check's id, as list_checks returns it (e.g. demo-duplicate-orders)");

function tool<Schema extends z.ZodObject>(definition: AssayTool<Schema>): AssayTool {
  return definition as unknown as AssayTool;
}

/** Tables are easier for a model to read with their long values cut down. */
function shapeRows(rows: Record<string, unknown>[], limit: number) {
  return rows.slice(0, limit).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, cellText(value)])));
}

function summary(check: CheckSummary, appUrl: string) {
  const state = check.state;
  return {
    id: check.scriptId,
    name: check.name,
    status: state ? STATUS[state.outcome] : "never_run",
    rows: state && state.outcome !== "error" ? state.rowCount : null,
    since: state?.since ?? null,
    last_run_at: state?.lastRunAt ?? null,
    schedule: check.schedule ?? "manual",
    tags: check.tags,
    owner: check.alerting.owner?.name ?? null,
    acknowledged_by: check.alerting.acknowledged?.by ?? null,
    muted_until: check.alerting.mutedUntil,
    url: `${appUrl}/checks/${encodeURIComponent(check.scriptId)}`,
  };
}

/**
 * Everything an agent can do with Assay. Reads go through the same services
 * as the pages; runs and alert actions go through runCheck and the alert
 * controls, so leases, fencing, notifications and the audit log all apply.
 */
function assayTools(caller: McpCaller, deps: ToolDeps): AssayTool[] {
  const by = { id: caller.userId, name: caller.name };

  return [
    tool({
      name: "list_checks",
      title: "List checks",
      description:
        "Lists the data checks in this workspace with their current status: broken (the query fails), issues (it returns rows that need attention), clean (no rows) or never_run. Filter by status, tag or text.",
      permission: Permission.SCRIPT_READ,
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        status: z.enum(["broken", "issues", "clean", "never_run"]).optional().describe("Only checks in this status"),
        tag: z.string().max(50).optional().describe("Only checks with this tag"),
        search: z.string().max(100).optional().describe("Text to find in the name, id or description"),
      }),
      async handler({ status, tag, search }) {
        const needle = search?.toLowerCase();
        const checks = (await listChecks(await deps.db()))
          .map((check) => ({ check, row: summary(check, deps.appUrl) }))
          .filter(({ row }) => !status || row.status === status)
          .filter(({ check }) => !tag || check.tags.includes(tag))
          .filter(({ check }) => !needle || [check.name, check.cnName, check.scriptId, check.description].some((f) => f?.toLowerCase().includes(needle)))
          .map(({ row }) => row);
        return { count: checks.length, checks };
      },
    }),

    tool({
      name: "get_check",
      title: "Get a check",
      description:
        "Returns one check: its SQL, schedule, current status, the last runs, and the rows its latest run returned, each marked new (not in the previous run) or still (also in it), plus how many rows were fixed.",
      permission: Permission.SCRIPT_READ,
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        check_id: CheckId,
        max_rows: z.number().int().min(0).max(MAX_ROWS).default(20).describe("How many result rows to include"),
      }),
      async handler({ check_id, max_rows }) {
        const check = await getCheckDetail(await deps.db(), check_id);
        if (!check) throw new Error(`No check with id ${check_id}`);
        const latest = check.latest;
        return {
          ...summary(check, deps.appUrl),
          description: check.description ?? null,
          sql: check.sql,
          recent_runs: check.runs.slice(0, 10).map((run) => ({
            run_id: run.runId,
            at: run.at,
            status: STATUS[run.outcome],
            rows: run.outcome === "error" ? null : run.rowCount,
            trigger: run.trigger,
            new: run.diff?.added ?? null,
            fixed: run.diff?.fixed ?? null,
          })),
          latest_run: latest && {
            run_id: latest.runId,
            at: latest.at,
            status: STATUS[latest.outcome],
            error: latest.outcome === "error" ? latest.message : null,
            columns: latest.columns,
            row_count: latest.rowCount,
            compared_with_previous: latest.compared,
            fixed_since_previous: latest.fixed.length,
            rows: latest.rows.slice(0, max_rows).map((row) => ({ mark: row.mark, ...shapeRows([row.values], 1)[0] })),
          },
        };
      },
    }),

    tool({
      name: "get_run",
      title: "Get a run's rows",
      description: "Returns the rows one run returned (up to 50 of the stored sample), for a run id from get_check or list_activity.",
      permission: Permission.HISTORY_READ,
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        run_id: z.string().regex(/^[0-9a-f]{24}$/, "A run id is 24 hex characters"),
        max_rows: z.number().int().min(1).max(MAX_ROWS).default(MAX_ROWS),
      }),
      async handler({ run_id, max_rows }) {
        const run = await findRun(await deps.db(), run_id, {
          checkId: 1,
          finishedAt: 1,
          outcome: 1,
          rowCount: 1,
          columns: 1,
          error: 1,
          ...sampleSlice(max_rows),
        });
        if (!run) throw new Error(`No run with id ${run_id}`);
        const rows = responseSample(run);
        return {
          run_id,
          check_id: run.checkId,
          at: new Date(run.finishedAt).toISOString(),
          row_count: typeof run.rowCount === "number" ? run.rowCount : rows.length,
          error: run.error ?? null,
          columns: run.columns ?? (rows[0] ? Object.keys(rows[0]) : []),
          rows: shapeRows(rows, max_rows),
        };
      },
    }),

    tool({
      name: "list_activity",
      title: "Recent activity",
      description:
        "What changed across checks, newest first: a check broke, started returning rows, got new rows, or recovered, with whether alerts were sent or held back (muted / acknowledged).",
      permission: Permission.HISTORY_READ,
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        kind: z.enum(ALERT_KINDS as [AlertKind, ...AlertKind[]]).optional().describe("Only this kind of change"),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      async handler({ kind, limit }) {
        const page = await listActivity(await deps.db(), DEFAULT_WORKSPACE_ID, { kinds: kind ? [kind] : [], limit });
        return {
          events: page.items.map((item) => ({
            at: item.at,
            check_id: item.checkId,
            check: item.checkName,
            kind: item.kind,
            from: item.from ? STATUS[item.from] : null,
            to: STATUS[item.to],
            rows: item.rowCount,
            new_rows: item.diff?.added ?? null,
            error: item.error,
            run_id: item.runId,
            alerts: item.suppressed ? `held back (${item.suppressed})` : item.deliveries.map((d) => `${d.destination}: ${d.status}`),
          })),
        };
      },
    }),

    tool({
      name: "run_check",
      title: "Run a check now",
      description:
        "Runs one check against the database now (read-only SQL) and returns its outcome. If the check is already running, says so instead of starting a second run. Alerts go out as for any run.",
      permission: Permission.SCRIPT_EXECUTE,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      inputSchema: z.object({ check_id: CheckId }),
      async handler({ check_id }) {
        const result = await deps.runCheck(check_id, by);
        if (result.kind === "missing") throw new Error(`No check with id ${check_id}`);
        if (result.kind === "busy") return { status: "already_running", run_id: result.runId };
        deps.afterRun();
        return {
          status: STATUS[result.outcome],
          rows: result.outcome === "error" ? null : result.rowCount,
          new: result.diff?.added ?? null,
          fixed: result.diff?.fixed ?? null,
          error: result.outcome === "error" ? result.message : null,
          run_id: result.runId,
          url: `${deps.appUrl}/checks/${encodeURIComponent(check_id)}`,
        };
      },
    }),

    tool({
      name: "acknowledge_check",
      title: "Acknowledge a problem",
      description:
        "Marks the check's current problem as being handled, so no more alerts go out for new rows of it. A new failure or the recovery still alert. Fails if the check is clean.",
      permission: Permission.SCRIPT_EXECUTE,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: z.object({ check_id: CheckId }),
      async handler({ check_id }) {
        return { check_id, alerting: await applyAlertingAction(await deps.db(), check_id, { action: "acknowledge" }, by, "mcp") };
      },
    }),

    tool({
      name: "mute_check",
      title: "Mute a check's alerts",
      description: "Stops all alerts for the check for the given number of hours (at most 30 days). Use hours: 0 to unmute.",
      permission: Permission.SCRIPT_EXECUTE,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      inputSchema: z.object({
        check_id: CheckId,
        hours: z.number().min(0).max(MAX_MUTE_HOURS).describe("Hours to mute; 0 unmutes"),
      }),
      async handler({ check_id, hours }) {
        const input = hours === 0 ? ({ action: "unmute" } as const) : ({ action: "mute", hours } as const);
        return { check_id, alerting: await applyAlertingAction(await deps.db(), check_id, input, by, "mcp") };
      },
    }),
  ];
}

/** Only the tools the caller's role allows; the rest are not even listed. */
export function toolsFor(caller: McpCaller, deps: ToolDeps): AssayTool[] {
  return assayTools(caller, deps).filter((t) => caller.permissions.includes(t.permission));
}
