import { NextResponse } from "next/server";
import { CheckEditInput } from "@/contracts/check-input";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { parseJson, withAuth } from "@/server/http/route";
import { submitCheckDelete, submitCheckEdit, type ChangeOutcome } from "@/server/services/check-changes";
import { actorOf } from "@/server/services/check-writes";

/** A change filed for review answers 200 with `requiresApproval`; the client says what happens next. */
function answer(outcome: ChangeOutcome, done: string) {
  if (outcome.kind === "filed") {
    return NextResponse.json({ success: true, message: "Submitted for approval", approvalRequestId: outcome.requestId, requiresApproval: true });
  }
  return NextResponse.json({ success: true, message: done });
}

export const PUT = withAuth<{ scriptId: string }>(Permission.SCRIPT_UPDATE, async (request, { principal, params }) => {
  const input = await parseJson(request, CheckEditInput);
  const db = await getMongoDbClient().getDb();
  return answer(await submitCheckEdit(db, params.scriptId, input, actorOf(principal)), "Check updated");
});

export const DELETE = withAuth<{ scriptId: string }>(Permission.SCRIPT_DELETE, async (_request, { principal, params }) => {
  const db = await getMongoDbClient().getDb();
  return answer(await submitCheckDelete(db, params.scriptId, actorOf(principal)), "Check deleted");
});
