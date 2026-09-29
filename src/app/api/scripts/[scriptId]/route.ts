import { NextResponse } from "next/server";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { Permission, getUserRole } from "@/lib/auth/rbac";
import { authorProblem, ownsCheck, readVersion } from "@/lib/workflows/check-fields";
import { createApprovalRequest, isAutoApprovalEligible, analyzeScriptType } from "@/lib/workflows/approval-workflow";
import { deleteCheck, updateCheck } from "@/server/services/check-writes";
import { COLLECTIONS } from "@/lib/database/collections";

interface UpdateScriptData {
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  hashtags?: string[];
  sqlContent?: string;
  isScheduled?: boolean;
  cronSchedule?: string;
}

const conflict = () =>
  new ApiError(409, "conflict", "Someone else changed this check while you were editing it. Reload to see their changes.");
const notFound = (scriptId: string) => new ApiError(404, "not_found", `No check with the id '${scriptId}'`);

export const PUT = withAuth<{ scriptId: string }>(Permission.SCRIPT_UPDATE, async (request, { principal, params }) => {
  const userEmail = principal.email;
  const { scriptId } = params;
  const body = await request.json().catch(() => {
    throw new ApiError(400, "invalid_json", "The request body must be JSON");
  });
  const { name, cnName, description, cnDescription, scope, cnScope, author, hashtags, sqlContent, isScheduled, cronSchedule } =
    body as UpdateScriptData;

  // Saves without the version they started from would silently overwrite a concurrent edit.
  const expectedVersion = readVersion((body as { version?: unknown }).version);
  if (expectedVersion === undefined) {
    throw new ApiError(428, "version_required", "Send the check's version you edited (its current `version`, 0 if it has none).");
  }

  const badSchedule = scheduleProblem(isScheduled, cronSchedule);
  if (badSchedule) throw new ApiError(400, "invalid_input", badSchedule);

  // Only read-only SQL may be saved.
  if (sqlContent && typeof sqlContent === "string") {
    const securityCheck = validateReadOnlySql(sqlContent);
    if (!securityCheck.isValid) throw new ApiError(403, "unsafe_sql", securityCheck.reasonEn ?? "Only read-only SQL may be saved");
  }

  const db = await getMongoDbClient().getDb();
  const existingScript = await db.collection(COLLECTIONS.checks).findOne({ scriptId });
  if (!existingScript) throw notFound(scriptId);
  if ((existingScript.version ?? 0) !== expectedVersion) throw conflict();

  const badAuthor = authorProblem(author);
  if (badAuthor) throw new ApiError(400, "invalid_input", badAuthor);

  // Changing someone else's check needs approval unless you are an admin.
  const isModifyingOthersScript = !ownsCheck(existingScript, { id: principal.id, email: userEmail });
  if (isModifyingOthersScript) {
    const userRole = await getUserRole(principal.id);
    // Without a role we cannot tell whether approval is needed: refuse instead of applying directly.
    if (!userRole) throw new ApiError(500, "role_unknown", "Your role could not be read");
    const keep = <T,>(value: T | undefined, current: T) => (value !== undefined ? value : current);
    const requestId = await createApprovalRequest(
      scriptId,
      principal.id,
      userEmail,
      userRole,
      sqlContent || "",
      `Edit check: ${existingScript.name}`,
      `${userEmail} asks to edit the check "${existingScript.name}" (author: ${existingScript.author})`,
      "medium",
      "update",
      {
        name: name || existingScript.name,
        cnName: keep(cnName, existingScript.cnName),
        description: keep(description, existingScript.description),
        cnDescription: keep(cnDescription, existingScript.cnDescription),
        scope: keep(scope, existingScript.scope),
        cnScope: keep(cnScope, existingScript.cnScope),
        author: keep(author, existingScript.author),
        hashtags: keep(hashtags, existingScript.hashtags),
        sqlContent: keep(sqlContent, existingScript.sqlContent),
        isScheduled: keep(isScheduled, existingScript.isScheduled),
        cronSchedule: keep(cronSchedule, existingScript.cronSchedule),
        // The version this change was made against; applying it later onto a newer one is refused.
        baseVersion: expectedVersion,
      },
    );
    if (!requestId) throw new ApiError(500, "internal", "Filing the approval request failed");
    if (!isAutoApprovalEligible(analyzeScriptType(sqlContent || "SELECT 1"), userRole, "update")) {
      return NextResponse.json({
        success: true,
        message: "Submitted for approval",
        approvalRequestId: requestId,
        requiresApproval: true,
      });
    }
  }

  const updateData: Partial<UpdateScriptData> = {};
  if (name !== undefined) updateData.name = name;
  if (cnName !== undefined) updateData.cnName = cnName;
  if (description !== undefined) updateData.description = description;
  if (cnDescription !== undefined) updateData.cnDescription = cnDescription;
  if (scope !== undefined) updateData.scope = scope;
  if (cnScope !== undefined) updateData.cnScope = cnScope;
  if (author !== undefined) updateData.author = author;
  if (hashtags !== undefined && Array.isArray(hashtags)) updateData.hashtags = hashtags;
  if (sqlContent !== undefined) updateData.sqlContent = sqlContent;
  if (isScheduled !== undefined && typeof isScheduled === "boolean") updateData.isScheduled = isScheduled;
  if (cronSchedule !== undefined && typeof cronSchedule === "string") updateData.cronSchedule = cronSchedule;
  if (Object.keys(updateData).length === 0) throw new ApiError(400, "invalid_input", "No valid fields provided for update");

  const updated = await updateCheck(db, scriptId, updateData, expectedVersion, { id: principal.id, email: userEmail }, "Updated");
  if (updated.kind === "conflict") throw conflict();
  if (updated.kind === "missing") throw notFound(scriptId);
  return NextResponse.json({ success: true, message: "Check updated" });
});

export const DELETE = withAuth<{ scriptId: string }>(Permission.SCRIPT_DELETE, async (_request, { principal, params }) => {
  const userEmail = principal.email;
  const { scriptId } = params;

  const db = await getMongoDbClient().getDb();
  const existingScript = await db.collection(COLLECTIONS.checks).findOne({ scriptId });
  if (!existingScript) throw notFound(scriptId);

  // Deleting any check needs approval unless you are an admin.
  const userRole = await getUserRole(principal.id);
  // Without a role we cannot tell whether approval is needed: refuse instead of deleting directly.
  if (!userRole) throw new ApiError(500, "role_unknown", "Your role could not be read");

  const sql = existingScript.sqlContent || "SELECT 1";
  const requestId = await createApprovalRequest(
    scriptId,
    principal.id,
    userEmail,
    userRole,
    sql,
    `Delete check: ${existingScript.name}`,
    `${userEmail} asks to delete the check "${existingScript.name}"`,
    "high",
    "delete",
    existingScript as unknown as Record<string, unknown>,
  );
  if (!requestId) throw new ApiError(500, "internal", "Filing the approval request failed");
  if (!isAutoApprovalEligible(analyzeScriptType(sql), userRole, "delete")) {
    return NextResponse.json({
      success: true,
      message: "Submitted for approval",
      approvalRequestId: requestId,
      requiresApproval: true,
    });
  }

  if (!(await deleteCheck(db, scriptId, { id: principal.id, email: userEmail }))) throw notFound(scriptId);
  return NextResponse.json({ success: true, message: "Check deleted" });
});
