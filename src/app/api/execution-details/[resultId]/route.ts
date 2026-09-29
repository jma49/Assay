import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
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

  if (!resultId || !ObjectId.isValid(resultId)) {
    return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
  }

  try {
    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection(COLLECTIONS.runs);
    const scriptsCollection = db.collection(COLLECTIONS.checks);

    const run = await historyCollection.findOne({ _id: new ObjectId(resultId) }, { projection: RUN_FIELDS });
    if (!run) {
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    const script = run.checkId
      ? await scriptsCollection.findOne(
          { scriptId: run.checkId },
          { projection: { name: 1, cnName: 1, description: 1, cnDescription: 1, scope: 1, cnScope: 1, author: 1 } },
        )
      : null;

    return NextResponse.json({
      _id: run._id.toString(),
      checkId: run.checkId,
      finishedAt: run.finishedAt,
      outcome: run.outcome,
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
  } catch (error) {
    console.error("[API] Reading a run failed:", error);
    return NextResponse.json(
      {
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
});
