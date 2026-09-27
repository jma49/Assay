import { intParam } from "@/lib/utils/query-params";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { LEGACY_VIEW_FIELDS, toLegacyRunView } from "@/server/runs/legacy-view";
import { COLLECTIONS } from "@/lib/database/collections";

/** The analysis page's record: "failed" rather than "failure" is what it counts. */
interface ExecutionRecord {
  _id: string;
  script_name: string;
  scriptId: string;
  execution_time: Date;
  createdAt: Date;
  status: "success" | "failure";
  statusType: "success" | "failed" | "attention_needed";
  message: string;
  findings: string;
  github_run_id?: string | number;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
    if (!authResult.isValid) return authResult.response;

    const { searchParams } = new URL(request.url);
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const scriptId = searchParams.get("scriptId");
    const limit = intParam(searchParams.get("limit"), 500, 1, 500);

    const query: Record<string, unknown> = {};
    if (startDate || endDate) {
      query.finishedAt = { ...(startDate && { $gte: startDate }), ...(endDate && { $lte: endDate }) };
    }
    if (scriptId && scriptId !== "all") query.checkId = scriptId;

    const db = await getMongoDbClient().getDb();
    const runs = await db
      .collection(COLLECTIONS.runs)
      .find(query, { projection: { ...LEGACY_VIEW_FIELDS, github_run_id: 1 } })
      .sort({ finishedAt: -1 })
      .limit(limit)
      .toArray();

    const records: ExecutionRecord[] = runs.map((run) => {
      const view = toLegacyRunView(run);
      return {
        ...view,
        scriptId: view.script_name,
        createdAt: view.execution_time,
        statusType: view.statusType === "failure" ? "failed" : view.statusType,
        github_run_id: run.github_run_id,
      };
    });
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error("API Error fetching execution history:", error);
    return NextResponse.json({ message: "Internal Server Error fetching execution history" }, { status: 500 });
  }
}
