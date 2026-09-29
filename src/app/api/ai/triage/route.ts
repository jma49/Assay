import type { RunOutcome } from "@/domain/run";
import { SAMPLE_FIELDS, storedSample } from "@/server/runs/sample";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { aiError, guardAiRequest } from "@/server/http/ai-guard";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getCachedSchema } from "@/lib/database/db-schema";
import { profileRows } from "@/lib/ai/row-profile";
import { triageRun, type Triage } from "@/lib/ai/triage";
import { aiModel } from "@/lib/ai/model";
import { COLLECTIONS } from "@/lib/database/collections";
import { findRun, saveTriage } from "@/server/repos/runs";

const Body = z.object({
  resultId: z.string().refine((id) => ObjectId.isValid(id), "Invalid run id"),
  language: z.enum(["en", "zh"]).catch("en"),
});

/**
 * Triage of one flagged or failed run. The client sends only the run id:
 * the check, its query and the run are read from the database, so the
 * prompt cannot be filled with arbitrary text. Each run is triaged once per
 * language and the answer is stored on the run.
 */
export const POST = withAuth(Permission.HISTORY_READ, async (request, { principal }) => {
  const { resultId, language } = await parseJson(request, Body);

  const db = await getMongoDbClient().getDb();
  const run = await findRun(db, resultId, { checkId: 1, outcome: 1, message: 1, ...SAMPLE_FIELDS, aiTriage: 1 });
  if (!run) throw new ApiError(404, "not_found", "No run with this id");

  const cached = run.aiTriage?.[language] as Triage | undefined;
  if (cached) return NextResponse.json({ triage: cached, cached: true });

  // Guests may read saved triage but never start a model call.
  if (principal.isGuest) throw new ApiError(403, "sign_up_required", "Sign up to run AI triage");

  const outcome: RunOutcome = run.outcome ?? "clean";
  if (outcome === "clean") throw new ApiError(400, "nothing_to_triage", "This run passed; there is nothing to triage");

  const message = typeof run.message === "string" ? run.message : "";
  await guardAiRequest(principal.id, { errorMessage: message });

  const scriptId = String(run.checkId ?? "");
  const script = await db
    .collection(COLLECTIONS.checks)
    .findOne({ scriptId }, { projection: { name: 1, description: 1, sqlContent: 1 } });
  const rows = storedSample(run);

  let triage: Triage;
  try {
    triage = await triageRun(
      {
        check: { scriptId, name: script?.name, description: script?.description, sql: script?.sqlContent },
        run: { outcome, message, rowCount: rows.length, profile: profileRows(rows) },
        schema: await getCachedSchema(),
        language,
      },
      { userId: principal.id },
    );
  } catch (error) {
    console.error("[AI triage] The model call failed:", error);
    throw aiError(error);
  }

  await saveTriage(db, run._id, language, { ...triage, model: String(aiModel()), createdAt: new Date() });
  return NextResponse.json({ triage, cached: false });
});
