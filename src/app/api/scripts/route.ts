import { NextResponse } from "next/server";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Document, ObjectId } from "mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { authorForGuest } from "@/server/http/guest-view";
import { authorProblem } from "@/lib/workflows/check-fields";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { Permission, getUserRole } from "@/lib/auth/rbac";
import {
  ApprovalStatus,
  createApprovalRequest,
  isAutoApprovalEligible,
  analyzeScriptType,
} from "@/lib/workflows/approval-workflow";
import { createCheck } from "@/server/services/check-writes";
import { COLLECTIONS } from "@/lib/database/collections";

interface NewScriptData {
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  hashtags?: string[];
  sqlContent: string;
  isScheduled?: boolean;
  cronSchedule?: string;
}

function isValidScriptId(scriptId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scriptId);
}

const invalid = (message: string) => new ApiError(400, "invalid_input", message);

export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  const userEmail = principal.email;
  const body = await request.json().catch(() => {
    throw new ApiError(400, "invalid_json", "The request body must be JSON");
  });
  const { scriptId, name, cnName, description, cnDescription, scope, cnScope, author, hashtags, sqlContent, isScheduled, cronSchedule } =
    body as NewScriptData;

  if (!scriptId) throw invalid("scriptId is required");
  if (!isValidScriptId(scriptId)) throw invalid("Invalid scriptId format. Use lowercase letters, numbers, and hyphens.");
  if (!name || typeof name !== "string") throw invalid("name is required and must be a string");
  if (!sqlContent || typeof sqlContent !== "string") throw invalid("sqlContent is required and must be a string");
  const badAuthor = authorProblem(author);
  if (badAuthor) throw invalid(badAuthor);
  // An invalid cron would be saved and then silently never run.
  const badSchedule = scheduleProblem(isScheduled, cronSchedule ?? (isScheduled ? "" : undefined));
  if (badSchedule) throw invalid(badSchedule);

  const db = await getMongoDbClient().getDb();
  if (await db.collection(COLLECTIONS.checks).findOne({ scriptId })) {
    throw new ApiError(409, "id_taken", `A check with the id '${scriptId}' already exists`);
  }

  // Only read-only SQL may be saved.
  const securityCheck = validateReadOnlySql(sqlContent);
  if (!securityCheck.isValid) throw new ApiError(403, "unsafe_sql", securityCheck.reasonEn ?? "Only read-only SQL may be saved");

  const userRole = await getUserRole(principal.id);
  if (!userRole) throw new ApiError(500, "role_unknown", "Your role could not be read");

  const fields = {
    scriptId,
    name,
    cnName: cnName || "",
    description: description || "",
    cnDescription: cnDescription || "",
    scope: scope || "",
    cnScope: cnScope || "",
    author: author || userEmail.split("@")[0],
    hashtags: hashtags || [],
    sqlContent,
    isScheduled: isScheduled || false,
    cronSchedule: cronSchedule || "",
  };

  // Everyone but admins goes through approval.
  if (!isAutoApprovalEligible(analyzeScriptType(sqlContent), userRole, "create")) {
    const requestId = await createApprovalRequest(
      scriptId,
      principal.id,
      userEmail,
      userRole,
      sqlContent,
      `Create check: ${name}`,
      `${userEmail} asks to create the check "${name}"`,
      "medium",
      "create",
      fields,
    );
    if (!requestId) throw new ApiError(500, "internal", "Filing the approval request failed");
    return NextResponse.json({
      success: true,
      message: "Submitted for approval",
      approvalRequestId: requestId,
      requiresApproval: true,
    });
  }

  const now = new Date();
  const actor = { id: principal.id, email: userEmail };
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
    return NextResponse.json(
      { success: true, message: "Check created", scriptId, mongoId, approvalStatus: ApprovalStatus.APPROVED },
      { status: 201 },
    );
  } catch (error) {
    // Two creates with the same id at once: the unique index lets one through.
    if ((error as { code?: number }).code === 11000) throw new ApiError(409, "id_taken", "A check with this id already exists");
    throw error;
  }
});

// The middleware only guarantees a signed-in user; reading scripts (and
// their SQL) also needs script:read, as on the other script routes.
export const GET = withAuth(Permission.SCRIPT_READ, async (_request, { principal }) => {
  const db = await getMongoDbClient().getDb();
  const scriptsFromDb = await db.collection(COLLECTIONS.checks).find({}).sort({ createdAt: -1 }).toArray();

  interface ScriptDocumentFromDb extends Document {
    _id: ObjectId;
    scriptId: string;
    name: string;
    cnName?: string;
    description?: string;
    cnDescription?: string;
    scope?: string;
    cnScope?: string;
    author: string;
    hashtags?: string[];
    sqlContent: string;
    isScheduled?: boolean;
    cronSchedule?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }

  const scripts = scriptsFromDb.map((docUncasted) => {
    const doc = docUncasted as ScriptDocumentFromDb;
    const { _id, createdAt, updatedAt } = doc;
    // Listed field by field: the document also holds who created it (with
    // their email), the run lease and alerting state, which readers,
    // including demo guests, must not receive.
    return {
      _id: _id.toString(),
      scriptId: doc.scriptId,
      name: doc.name,
      cnName: doc.cnName || "",
      description: doc.description || "",
      cnDescription: doc.cnDescription || "",
      scope: doc.scope || "",
      cnScope: doc.cnScope || "",
      author: principal.isGuest ? authorForGuest(doc.author) : doc.author,
      hashtags: doc.hashtags || [],
      sqlContent: doc.sqlContent,
      isScheduled: doc.isScheduled || false,
      cronSchedule: doc.cronSchedule || "",
      version: typeof doc.version === "number" ? doc.version : undefined,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
      updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt),
    };
  });

  return NextResponse.json(scripts);
});
