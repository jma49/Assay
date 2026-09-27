import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { guardAiRequest } from "@/lib/security/ai-guard";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getCachedSchema } from "@/lib/database/db-schema";
import { profileRows } from "@/lib/ai/row-profile";
import { triageRun, type Triage } from "@/lib/ai/triage";
import { aiModel } from "@/lib/ai/model";
import { getAIErrorMessage } from "@/lib/utils/ai-utils";

const RESULTS_COLLECTION = process.env.MONGO_COLLECTION_NAME || "result";

/**
 * Triage of one flagged or failed run. The client sends only the run id:
 * the check, its query and the run are read from the database, so the
 * prompt cannot be filled with arbitrary text. Each run is triaged once per
 * language and the answer is stored on the run.
 */
export async function POST(request: NextRequest) {
  const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
  if (!authResult.isValid) {
    return authResult.response;
  }

  const body = await request.json().catch(() => ({}));
  const resultId = typeof body.resultId === "string" ? body.resultId : "";
  const language: "en" | "zh" = body.language === "zh" ? "zh" : "en";
  if (!ObjectId.isValid(resultId)) {
    return NextResponse.json({ error: "Invalid result id" }, { status: 400 });
  }

  try {
    const db = await getMongoDbClient().getDb();
    const results = db.collection(RESULTS_COLLECTION);
    const run = await results.findOne(
      { _id: new ObjectId(resultId) },
      { projection: { script_name: 1, scriptId: 1, status: 1, statusType: 1, message: 1, findings: 1, raw_results: 1, aiTriage: 1 } },
    );
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const cached = run.aiTriage?.[language] as Triage | undefined;
    if (cached) {
      return NextResponse.json({ triage: cached, cached: true });
    }

    const status = String(run.statusType || run.status || "");
    if (status === "success") {
      return NextResponse.json({ error: "This run passed; there is nothing to triage" }, { status: 400 });
    }

    const message = typeof run.message === "string" ? run.message : "";
    const refused = await guardAiRequest(authResult.user.id, { errorMessage: message });
    if (refused) {
      return refused;
    }

    const scriptId = String(run.script_name || run.scriptId || "");
    const script = await db
      .collection("sql_scripts")
      .findOne({ scriptId }, { projection: { name: 1, description: 1, sqlContent: 1 } });
    const rows = Array.isArray(run.findings) ? run.findings : Array.isArray(run.raw_results) ? run.raw_results : [];

    const triage = await triageRun(
      {
        check: { scriptId, name: script?.name, description: script?.description, sql: script?.sqlContent },
        run: { status, message, rowCount: rows.length, profile: profileRows(rows) },
        schema: await getCachedSchema(),
        language,
      },
      { userId: authResult.user.id },
    );

    await results.updateOne(
      { _id: run._id },
      { $set: { [`aiTriage.${language}`]: { ...triage, model: String(aiModel()), createdAt: new Date() } } },
    );
    return NextResponse.json({ triage, cached: false });
  } catch (error) {
    console.error("[AI Triage] error:", error);
    return NextResponse.json({ error: getAIErrorMessage(error) }, { status: 500 });
  }
}
