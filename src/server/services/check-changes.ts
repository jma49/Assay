import type { Db, Document } from "mongodb";
import type { CheckEditInput, NewCheckInput } from "@/contracts/check-input";
import { getUserRole, type UserRole } from "@/lib/auth/rbac";
import { COLLECTIONS } from "@/lib/database/collections";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { ApprovalStatus } from "@/lib/types/approval";
import { authorProblem, ownsCheck, readVersion } from "@/lib/workflows/check-fields";
import { ApiError } from "@/server/http/route";
import { fileChangeRequest, needsReview } from "./approvals";
import { createCheck, deleteCheck, updateCheck, type CheckActor } from "./check-writes";

/**
 * A person creating, editing or deleting a check: validated, then applied
 * at once or filed for review (approvals.ts), depending on who asks and whose
 * check it is.
 */

/** A change that was applied, or filed for review. */
export type ChangeOutcome = { kind: "applied"; mongoId?: string } | { kind: "filed"; requestId: string };

const invalid = (message: string) => new ApiError(400, "invalid_input", message);
const notFound = (scriptId: string) => new ApiError(404, "not_found", `No check with the id '${scriptId}'`);
const conflict = () =>
  new ApiError(409, "conflict", "Someone else changed this check while you were editing it. Reload to see their changes.");

function assertReadOnly(sql: string): void {
  const check = validateReadOnlySql(sql);
  if (!check.isValid) throw new ApiError(403, "unsafe_sql", check.reasonEn ?? "Only read-only SQL may be saved");
}

/** The caller's role; without one we cannot tell whether review is needed, so the change is refused. */
async function roleOf(actor: CheckActor): Promise<UserRole> {
  const role = await getUserRole(actor.id);
  if (!role) throw new ApiError(500, "role_unknown", "Your role could not be read");
  return role;
}

const checks = (db: Db) => db.collection(COLLECTIONS.checks);

export async function submitNewCheck(db: Db, input: NewCheckInput, actor: CheckActor): Promise<ChangeOutcome> {
  const badAuthor = authorProblem(input.author);
  if (badAuthor) throw invalid(badAuthor);
  // An invalid cron would be saved and then silently never run.
  const badSchedule = scheduleProblem(input.isScheduled, input.cronSchedule ?? (input.isScheduled ? "" : undefined));
  if (badSchedule) throw invalid(badSchedule);
  if (await checks(db).findOne({ scriptId: input.scriptId }, { projection: { _id: 1 } })) {
    throw new ApiError(409, "id_taken", `A check with the id '${input.scriptId}' already exists`);
  }
  assertReadOnly(input.sqlContent);
  const role = await roleOf(actor);

  const fields = {
    scriptId: input.scriptId,
    name: input.name,
    cnName: input.cnName || "",
    description: input.description || "",
    cnDescription: input.cnDescription || "",
    scope: input.scope || "",
    cnScope: input.cnScope || "",
    author: input.author || actor.email.split("@")[0],
    hashtags: input.hashtags || [],
    sqlContent: input.sqlContent,
    isScheduled: input.isScheduled || false,
    cronSchedule: input.cronSchedule || "",
  };

  if (needsReview(role)) {
    const requestId = await fileChangeRequest(db, {
      scriptId: input.scriptId,
      requester: actor,
      role,
      sqlContent: input.sqlContent,
      title: `Create check: ${input.name}`,
      description: `${actor.email} asks to create the check "${input.name}"`,
      priority: "medium",
      operationType: "create",
      originalData: fields,
    });
    return { kind: "filed", requestId };
  }

  const now = new Date();
  try {
    const mongoId = await createCheck(
      db,
      {
        ...fields,
        createdAt: now,
        updatedAt: now,
        approvalStatus: ApprovalStatus.APPROVED,
        approvalRequestId: null,
        // Who made it, from the session: ownership and audit never trust the author label.
        createdBy: actor,
        updatedBy: actor,
        version: 1,
      },
      actor,
      "Created",
      "major",
    );
    return { kind: "applied", mongoId };
  } catch (error) {
    // Two creates with the same id at once: the unique index lets one through.
    if ((error as { code?: number }).code === 11000) throw new ApiError(409, "id_taken", "A check with this id already exists");
    throw error;
  }
}

/** The fields an edit sets, leaving out the ones it did not send. */
function changedFields(input: CheckEditInput): Document {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== "version" && value !== undefined));
}

/**
 * Applies an edit onto the version it started from. Changing someone else's
 * check needs review unless you are an admin; a stale version is refused
 * before anything is written or filed.
 */
export async function submitCheckEdit(db: Db, scriptId: string, input: CheckEditInput, actor: CheckActor): Promise<ChangeOutcome> {
  // Saves without the version they started from would silently overwrite a concurrent edit.
  const expectedVersion = readVersion(input.version);
  if (expectedVersion === undefined) {
    throw new ApiError(428, "version_required", "Send the check's version you edited (its current `version`, 0 if it has none).");
  }
  const badSchedule = scheduleProblem(input.isScheduled, input.cronSchedule);
  if (badSchedule) throw invalid(badSchedule);
  if (input.sqlContent) assertReadOnly(input.sqlContent);

  const existing = await checks(db).findOne({ scriptId });
  if (!existing) throw notFound(scriptId);
  if ((existing.version ?? 0) !== expectedVersion) throw conflict();

  const badAuthor = authorProblem(input.author);
  if (badAuthor) throw invalid(badAuthor);

  const fields = changedFields(input);
  if (Object.keys(fields).length === 0) throw invalid("No valid fields provided for update");

  // A change to someone else's check is always recorded as a request; an admin's is approved at once and applied here.
  if (!ownsCheck(existing, actor)) {
    const role = await roleOf(actor);
    const requestId = await fileChangeRequest(db, {
      scriptId,
      requester: actor,
      role,
      sqlContent: input.sqlContent ?? "",
      title: `Edit check: ${existing.name}`,
      description: `${actor.email} asks to edit the check "${existing.name}" (author: ${existing.author})`,
      priority: "medium",
      operationType: "update",
      // The whole check as it would be, and the version the change was made against:
      // applying it later onto a newer one is refused.
      originalData: { ...pickFromExisting(existing), ...fields, baseVersion: expectedVersion },
    });
    if (needsReview(role)) return { kind: "filed", requestId };
  }

  const updated = await updateCheck(db, scriptId, fields, expectedVersion, actor, "Updated");
  if (updated.kind === "conflict") throw conflict();
  if (updated.kind === "missing") throw notFound(scriptId);
  return { kind: "applied" };
}

/** The editable fields of the stored check, the base an edit request is merged onto. */
function pickFromExisting(existing: Document): Document {
  const { name, cnName, description, cnDescription, scope, cnScope, author, hashtags, sqlContent, isScheduled, cronSchedule } = existing;
  return { name, cnName, description, cnDescription, scope, cnScope, author, hashtags, sqlContent, isScheduled, cronSchedule };
}

/** Deleting any check is recorded as a request; it needs review unless you are an admin. */
export async function submitCheckDelete(db: Db, scriptId: string, actor: CheckActor): Promise<ChangeOutcome> {
  const existing = await checks(db).findOne({ scriptId });
  if (!existing) throw notFound(scriptId);
  const role = await roleOf(actor);

  const requestId = await fileChangeRequest(db, {
    scriptId,
    requester: actor,
    role,
    sqlContent: existing.sqlContent || "SELECT 1",
    title: `Delete check: ${existing.name}`,
    description: `${actor.email} asks to delete the check "${existing.name}"`,
    priority: "high",
    operationType: "delete",
    originalData: existing,
  });
  if (needsReview(role)) return { kind: "filed", requestId };

  if (!(await deleteCheck(db, scriptId, actor))) throw notFound(scriptId);
  return { kind: "applied" };
}
