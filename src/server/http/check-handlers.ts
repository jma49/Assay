import { NextResponse } from "next/server";
import { CheckEditInput, NewCheckInput } from "@/contracts/check-input";
import { ApprovalStatus } from "@/lib/types/approval";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { authorForGuest } from "@/server/http/guest-view";
import { parseJson, type Principal, type RouteHandler } from "@/server/http/route";
import { submitCheckDelete, submitCheckEdit, submitNewCheck, type ChangeOutcome } from "@/server/services/check-changes";
import { actorOf } from "@/server/services/check-writes";
import { listCheckDefinitions } from "@/server/services/checks-read";

// Handlers shared by /api/checks and its deprecated alias /api/scripts.

type CheckParams = { scriptId: string };

/** A change filed for review answers 200 with `requiresApproval`; the client says what happens next. */
function answer(outcome: ChangeOutcome, done: string) {
  if (outcome.kind === "filed") {
    return NextResponse.json({ success: true, message: "Submitted for approval", approvalRequestId: outcome.requestId, requiresApproval: true });
  }
  return NextResponse.json({ success: true, message: done });
}

/** Creates a check, or files it for approval (everyone but admins). */
export const createCheck: RouteHandler<Record<string, string>> = async (request, { principal }) => {
  const input = await parseJson(request, NewCheckInput);
  const outcome = await submitNewCheck(await getMongoDbClient().getDb(), input, actorOf(principal));
  if (outcome.kind === "filed") {
    return NextResponse.json({ success: true, message: "Submitted for approval", approvalRequestId: outcome.requestId, requiresApproval: true });
  }
  return NextResponse.json(
    { success: true, message: "Check created", scriptId: input.scriptId, mongoId: outcome.mongoId, approvalStatus: ApprovalStatus.APPROVED },
    { status: 201 },
  );
};

/** Every check's definition, SQL included; guests see no member handles. */
export async function checkDefinitionsFor(principal: Principal) {
  const checks = await listCheckDefinitions(await getMongoDbClient().getDb());
  return principal.isGuest ? checks.map((check) => ({ ...check, author: authorForGuest(check.author) })) : checks;
}

export const updateCheck: RouteHandler<CheckParams> = async (request, { principal, params }) => {
  const input = await parseJson(request, CheckEditInput);
  const db = await getMongoDbClient().getDb();
  return answer(await submitCheckEdit(db, params.scriptId, input, actorOf(principal)), "Check updated");
};

export const deleteCheck: RouteHandler<CheckParams> = async (_request, { principal, params }) => {
  const db = await getMongoDbClient().getDb();
  return answer(await submitCheckDelete(db, params.scriptId, actorOf(principal)), "Check deleted");
};
