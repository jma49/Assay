import {
  diffRowKeys,
  FINGERPRINT_ROWS,
  isNotable,
  nextCheckState,
  normalizeRow,
  SAMPLE_ROWS,
  toLegacyStatus,
  type CheckState,
  type RowDiff,
  type RunOutcome,
} from "@/domain/run";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { splitStatements } from "@/lib/sql/statements";
import type { Semaphore } from "@/server/concurrency/semaphore";
import type { DataSource } from "@/server/datasource/types";
import { fingerprintRow } from "@/server/runs/fingerprint";

export type TriggerKind = "manual" | "schedule" | "batch" | "api";

export interface RunTrigger {
  kind: TriggerKind;
  /** Who started it, for manual and API runs. */
  by?: { id: string; name: string };
}

export interface CheckToRun {
  scriptId: string;
  sqlContent: string;
  state?: CheckState | null;
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
  saveRun(run: RunDocument): Promise<void>;
  /** Writes the state only while this run still holds the lease, and releases it. */
  commitState(scriptId: string, runId: string, state: CheckState): Promise<boolean>;
  releaseLease(scriptId: string, runId: string): Promise<void>;
  /** Idempotent: one event per run at most. */
  recordEvent(event: CheckEvent): Promise<void>;
}

export interface RunCheckDeps {
  store: RunCheckStore;
  source: DataSource;
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

// Extra lease time on top of the query timeouts, for connecting and saving.
const LEASE_MARGIN_MS = 60_000;

async function execute(check: CheckToRun, deps: RunCheckDeps) {
  const validation = validateReadOnlySql(check.sqlContent ?? "");
  if (!validation.isValid) {
    throw new Error(`The check is not read-only: ${validation.reasonEn ?? validation.reason}`);
  }
  const statements = splitStatements(check.sqlContent);
  if (statements.length === 0) throw new Error("The check has no query to run.");
  const results = await deps.executions.run(() =>
    deps.source.runReadOnly(statements, { timeoutMs: deps.timeoutMs }),
  );
  return results.flatMap((result) => result.rows).map(normalizeRow);
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

  let committed = false;
  try {
    let rows: Record<string, unknown>[] = [];
    let error: string | null = null;
    try {
      rows = await execute(check, deps);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const finishedAt = deps.now();
    const outcome: RunOutcome = error ? "error" : rows.length > 0 ? "issues" : "clean";
    const rowKeys = rows.slice(0, FINGERPRINT_ROWS).map(fingerprintRow);
    const previousKeys =
      outcome !== "error" && check.state?.lastRunId ? await deps.store.previousRowKeys(check.state.lastRunId) : null;
    const diff = previousKeys ? diffRowKeys(previousKeys, rowKeys) : null;
    const findings = error
      ? "Execution incomplete"
      : rows.length > 0
        ? `Found ${rows.length} records`
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
      rowCount: rows.length,
      columns: rows[0] ? Object.keys(rows[0]) : [],
      sample: rows.slice(0, SAMPLE_ROWS),
      rowKeys,
      diff,
      error,
      message,
      findings,
    });

    const previous = check.state ?? null;
    const state = nextCheckState(previous, { runId, outcome, rowCount: rows.length, finishedAt });
    committed = await deps.store.commitState(scriptId, runId, state);
    if (committed && isNotable(previous, outcome, diff)) {
      // The run and state are already saved; a lost event must not fail the run.
      // Phase 4 writes state and event in one transaction.
      await deps.store
        .recordEvent({
          type: previous && previous.outcome === outcome ? "check.new_rows" : "check.outcome_changed",
          checkId: scriptId,
          runId,
          from: previous?.outcome ?? null,
          to: outcome,
          rowCount: rows.length,
          diff,
          at: finishedAt,
        })
        .catch((cause) => console.error(`[runCheck] Could not record the event for run ${runId}:`, cause));
    }

    return { kind: "completed", runId, outcome, rowCount: rows.length, diff, message, findings, stateUpdated: committed };
  } finally {
    if (!committed) await deps.store.releaseLease(scriptId, runId);
  }
}

/** The fields older pages read from a run, derived from the outcome. */
export function legacyRunFields(run: RunDocument, githubRunId?: string) {
  const statusType = toLegacyStatus(run.outcome);
  return {
    script_name: run.checkId,
    execution_time: run.finishedAt,
    status: statusType === "failure" ? "failure" : "success",
    statusType,
    message: run.message,
    findings: run.findings,
    raw_results: run.sample,
    github_run_id: githubRunId,
  };
}
