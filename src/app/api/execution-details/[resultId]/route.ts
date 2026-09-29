import { NextResponse } from "next/server";
import { ApiError, withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { responseSample, SAMPLE_FIELDS } from "@/server/runs/sample";
import { authorForGuest } from "@/server/http/guest-view";

/** What the report shows; never `rowKeys` (up to 5,000 fingerprints) or other stored fields. */
const RUN_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, message: 1, findings: 1, ...SAMPLE_FIELDS } as const;

export const GET = withAuth<{ resultId: string }>(Permission.HISTORY_READ, async (_request, { principal, params }) => {
  const { resultId } = params;
  if (!resultId || !ObjectId.isValid(resultId)) throw new ApiError(400, "invalid_input", "Invalid run id");

  const db = await getMongoDbClient().getDb();
  const run = await db.collection(COLLECTIONS.runs).findOne({ _id: new ObjectId(resultId) }, { projection: RUN_FIELDS });
  if (!run) throw new ApiError(404, "not_found", "No run with this id");

  const script = run.checkId
    ? await db
        .collection(COLLECTIONS.checks)
        .findOne(
          { scriptId: run.checkId },
          { projection: { name: 1, cnName: 1, description: 1, cnDescription: 1, scope: 1, cnScope: 1, author: 1 } },
        )
    : null;

  return NextResponse.json({
    _id: run._id.toString(),
    checkId: run.checkId,
    finishedAt: run.finishedAt,
    outcome: run.outcome,
    rowCount: typeof run.rowCount === "number" ? run.rowCount : null,
    error: run.error ?? null,
    message: run.message ?? "",
    findings: run.findings ?? "",
    sample: responseSample(run),
    ...(script && {
      name: script.name,
      cnName: script.cnName,
      description: script.description,
      cnDescription: script.cnDescription,
      scope: script.scope,
      cnScope: script.cnScope,
      author: principal.isGuest ? authorForGuest(script.author) : script.author,
    }),
  });
});
