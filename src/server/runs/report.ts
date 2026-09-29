import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { authorForGuest } from "@/server/http/guest-view";
import { findRun } from "@/server/repos/runs";
import { responseSample, SAMPLE_FIELDS } from "./sample";

/** What the report shows; never `rowKeys` (up to 5,000 fingerprints) or other stored fields. */
const REPORT_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, rowCount: 1, error: 1, message: 1, findings: 1, ...SAMPLE_FIELDS } as const;

const CHECK_FIELDS = { name: 1, cnName: 1, description: 1, cnDescription: 1, scope: 1, cnScope: 1, author: 1 } as const;

/**
 * One run's report (/runs/[runId]): the run with a trimmed sample and the
 * check it belongs to, or null when there is no such run. Guests see a
 * member's handle instead of their email.
 */
export async function runReport(db: Db, runId: string, viewer: { isGuest: boolean }) {
  const run = await findRun(db, runId, REPORT_FIELDS);
  if (!run) return null;
  const check = run.checkId ? await db.collection(COLLECTIONS.checks).findOne({ scriptId: run.checkId }, { projection: CHECK_FIELDS }) : null;

  return {
    _id: run._id.toString(),
    checkId: run.checkId,
    finishedAt: run.finishedAt,
    outcome: run.outcome,
    rowCount: typeof run.rowCount === "number" ? run.rowCount : null,
    error: run.error ?? null,
    message: run.message ?? "",
    findings: run.findings ?? "",
    sample: responseSample(run),
    ...(check && {
      name: check.name,
      cnName: check.cnName,
      description: check.description,
      cnDescription: check.cnDescription,
      scope: check.scope,
      cnScope: check.cnScope,
      author: viewer.isGuest ? authorForGuest(check.author) : check.author,
    }),
  };
}
