import {
  diffRowKeys,
  FINGERPRINT_ROWS,
  isNotable,
  nextCheckState,
  normalizeRow,
  sampleRows,
  type CheckState,
  type RowDiff,
  type RunOutcome,
} from "@/domain/run";
import { sourceIdOf } from "@/domain/data-source";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { splitStatements } from "@/lib/sql/statements";
import type { Semaphore } from "@/server/concurrency/semaphore";
import type { DataSource } from "@/server/datasource/types";
import { fingerprintRow } from "@/server/runs/fingerprint";
import { logError } from "@/server/logging/log";

type TriggerKind = "manual" | "schedule" | "batch" | "api";

export interface RunTrigger {
  kind: TriggerKind;
  /** Who started it, for manual and API runs. */
  by?: { id: string; name: string };
}

export interface CheckToRun {
  scriptId: string;
  sqlContent: string;
  /** The source it runs against; none means the built-in `default`. */
  dataSourceId?: string | null;
  state?: CheckState | null;
  /** When the check was created; runs before it belong to an earlier check with the same id. */
  createdAt?: Date | null;
  /** Events committed with an earlier run's state but not yet written to `events` (see commitState). */
  pendingEvents?: CheckEvent[];
}

export interface RunDocument {
  runId: string;
  checkId: string;
  trigger: RunTrigger;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  outcome: RunOutcome;
  rowCount: number;
  columns: string[];
  sample: Record<string, unknown>[];
  rowKeys: string[];
  diff: RowDiff | null;
  error: string | null;
  message: string;
  findings: string;
}

export interface CheckEvent {
  type: "check.outcome_changed" | "check.new_rows";
  checkId: string;
  runId: string;
  from: RunOutcome | null;
  to: RunOutcome;
  rowCount: number;
  diff: RowDiff | null;
  /** The query error when the check broke, shortened for alerts. */
  error: string | null;
  at: Date;
}

export type LeaseResult =
  | { kind: "acquired"; check: CheckToRun }
  | { kind: "busy"; runId: string }
  | { kind: "missing" };

/** Where runCheck keeps its state; MongoDB in production, memory in tests. */
export interface RunCheckStore {
  /** Takes the check's lease unless a live one exists. */
  acquireLease(scriptId: string, runId: string, until: Date, now: Date): Promise<LeaseResult>;
  previousRowKeys(runId: string): Promise<string[] | null>;
  /**
   * State rebuilt from past runs, for a check that ran before state was
   * stored. Only runs from `notBefore` on count: a check deleted and created
   * again under the same id must not inherit the old one's streak.
   */
  historicalState(scriptId: string, notBefore: Date | null): Promise<CheckState | null>;
  saveRun(run: RunDocument): Promise<void>;
  /**
   * Writes the state only while this run still holds the lease, and releases
   * it. `event`, when given, is kept on the check in the same atomic update
   * (`pendingEvents`) until recordEvent has written it, so a process that
   * dies in between cannot leave a new state without its alert.
   */
  commitState(scriptId: string, runId: string, state: CheckState, event: CheckEvent | null): Promise<boolean>;
  releaseLease(scriptId: string, runId: string): Promise<void>;
  /** Moves this run's lease to `until`; false when another run holds the check now. */
  renewLease(scriptId: string, runId: string, until: Date): Promise<boolean>;
  /** Idempotent (one event per run at most); then removes it from the check's `pendingEvents`. */
  recordEvent(event: CheckEvent): Promise<void>;
}

export interface RunCheckDeps {
  store: RunCheckStore;
  /** The data source with this id; throws for an unknown one, which fails the run. */
  sources: (sourceId: string) => Promise<DataSource>;
  executions: Semaphore;
  newRunId: () => string;
  now: () => Date;
  timeoutMs: number;
}

export type RunCheckResult =
  | {
      kind: "completed";
      runId: string;
      outcome: RunOutcome;
      rowCount: number;
      diff: RowDiff | null;
      message: string;
      findings: string;
      /** False when a newer run took over this check's lease; the run is kept, the state is not. */
      stateUpdated: boolean;
    }
  | { kind: "busy"; runId: string }
  | { kind: "missing" };

const MAX_EVENT_ERROR = 1_000;

// Extra lease time on top of the query timeouts, for connecting and saving.
const LEASE_MARGIN_MS = 60_000;

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, delayMs = 200): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

/** Writes an event; on failure it stays on the check for the next run or dispatch to write. */
async function recordEventSafely(deps: RunCheckDeps, event: CheckEvent): Promise<void> {
  await withRetries(() => deps.store.recordEvent(event)).catch((cause) =>
    logError(`[runCheck] Could not record the event for run ${event.runId}; it stays pending on the check`, { error: cause }),
  );
}

/** The run waited so long for a free slot that its lease lapsed and another run took the check. */
class LeaseLostError extends Error {}

/** The rows a check found: up to FINGERPRINT_ROWS kept, and how many there were. */
async function execute(check: CheckToRun, runId: string, deps: RunCheckDeps): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const validation = validateReadOnlySql(check.sqlContent ?? "");
  if (!validation.isValid) {
    throw new Error(`The check is not read-only: ${validation.reasonEn ?? validation.reason}`);
  }
  const statements = splitStatements(check.sqlContent);
  if (statements.length === 0) throw new Error("The check has no query to run.");
  const source = await deps.sources(sourceIdOf(check));
  const results = await deps.executions.run(async () => {
    // Waiting for a slot counts against the lease; restart its clock now that the query starts.
    const until = new Date(deps.now().getTime() + deps.timeoutMs + LEASE_MARGIN_MS);
    if (!(await deps.store.renewLease(check.scriptId, runId, until))) throw new LeaseLostError();
    return source.runReadOnly(statements, { timeoutMs: deps.timeoutMs, maxRows: FINGERPRINT_ROWS });
  });
  return {
    rows: results.flatMap((result) => result.rows).slice(0, FINGERPRINT_ROWS).map(normalizeRow),
    rowCount: results.reduce((total, result) => total + result.rowCount, 0),
  };
}

/**
 * Runs one check: the only path a run takes, whoever starts it.
 *
 * A lease on the check keeps two runs of it from overlapping; the lease's
 * run id fences the state update, so a run that outlived its lease cannot
 * overwrite a newer result. Every run is recorded; an event is written when
 * the outcome changes or new rows appear.
 */
export async function runCheck(scriptId: string, trigger: RunTrigger, deps: RunCheckDeps): Promise<RunCheckResult> {
  const runId = deps.newRunId();
  const startedAt = deps.now();
  const until = new Date(startedAt.getTime() + deps.timeoutMs + LEASE_MARGIN_MS);

  const lease = await deps.store.acquireLease(scriptId, runId, until, startedAt);
  if (lease.kind !== "acquired") return lease;
  const { check } = lease;
  // Alerts an earlier run committed but did not get to write (its process died).
  for (const pending of check.pendingEvents ?? []) await recordEventSafely(deps, pending);
  // Without stored state the check may still have a history; start from it so
  // "since" and the previous row count stay true.
  if (!check.state) check.state = await deps.store.historicalState(scriptId, check.createdAt ?? null);

  let committed = false;
  try {
    let rows: Record<string, unknown>[] = [];
    let rowCount = 0;
    let error: string | null = null;
    try {
      ({ rows, rowCount } = await execute(check, runId, deps));
    } catch (cause) {
      if (cause instanceof LeaseLostError) return { kind: "busy", runId: "" };
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const finishedAt = deps.now();
    const outcome: RunOutcome = error ? "error" : rowCount > 0 ? "issues" : "clean";
    const rowKeys = rows.slice(0, FINGERPRINT_ROWS).map(fingerprintRow);
    const previousKeys =
      outcome !== "error" && check.state?.lastRunId ? await deps.store.previousRowKeys(check.state.lastRunId) : null;
    const diff = previousKeys ? diffRowKeys(previousKeys, rowKeys) : null;
    const findings = error
      ? "Execution incomplete"
      : rowCount > 0
        ? `Found ${rowCount} records`
        : "Completed successfully (no data returned)";
    const message = error ?? `Script executed successfully. ${findings}`;

    await deps.store.saveRun({
      runId,
      checkId: scriptId,
      trigger,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      outcome,
      rowCount,
      columns: rows[0] ? Object.keys(rows[0]) : [],
      sample: sampleRows(rows),
      rowKeys,
      diff,
      error,
      message,
      findings,
    });

    const previous = check.state ?? null;
    const state = nextCheckState(previous, { runId, outcome, rowCount, finishedAt });
    const event: CheckEvent | null = isNotable(previous, outcome, diff)
      ? {
          type: previous && previous.outcome === outcome ? "check.new_rows" : "check.outcome_changed",
          checkId: scriptId,
          runId,
          from: previous?.outcome ?? null,
          to: outcome,
          rowCount,
          diff,
          error: error ? error.slice(0, MAX_EVENT_ERROR) : null,
          at: finishedAt,
        }
      : null;
    // The event rides on the state update, so it can no longer be lost: if
    // writing it below fails or the process dies first, the next run of this
    // check or the next dispatch writes it from the check's pendingEvents.
    committed = await deps.store.commitState(scriptId, runId, state, event);
    if (committed && event) await recordEventSafely(deps, event);

    return { kind: "completed", runId, outcome, rowCount, diff, message, findings, stateUpdated: committed };
  } finally {
    if (!committed) await deps.store.releaseLease(scriptId, runId);
  }
}
