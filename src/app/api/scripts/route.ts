import { NextResponse } from "next/server";
import { NewCheckInput } from "@/contracts/check-input";
import { Permission } from "@/lib/auth/rbac";
import { ApprovalStatus } from "@/lib/types/approval";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { authorForGuest } from "@/server/http/guest-view";
import { parseJson, withAuth } from "@/server/http/route";
import { submitNewCheck } from "@/server/services/check-changes";
import { actorOf } from "@/server/services/check-writes";
import { listCheckDefinitions } from "@/server/services/checks-read";

/** Creates a check, or files it for approval (everyone but admins). */
export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  const input = await parseJson(request, NewCheckInput);
  const outcome = await submitNewCheck(await getMongoDbClient().getDb(), input, actorOf(principal));
  if (outcome.kind === "filed") {
    return NextResponse.json({ success: true, message: "Submitted for approval", approvalRequestId: outcome.requestId, requiresApproval: true });
  }
  return NextResponse.json(
    { success: true, message: "Check created", scriptId: input.scriptId, mongoId: outcome.mongoId, approvalStatus: ApprovalStatus.APPROVED },
    { status: 201 },
  );
});

// The proxy only guarantees a signed-in user; reading checks (and
// their SQL) also needs script:read, as on the other script routes.
export const GET = withAuth(Permission.SCRIPT_READ, async (_request, { principal }) => {
  const checks = await listCheckDefinitions(await getMongoDbClient().getDb());
  return NextResponse.json(principal.isGuest ? checks.map((check) => ({ ...check, author: authorForGuest(check.author) })) : checks);
});
