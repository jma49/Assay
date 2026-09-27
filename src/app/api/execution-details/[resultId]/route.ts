import { toLegacyStatus } from "@/domain/run";
import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

export const GET = withAuth<{ resultId: string }>(Permission.HISTORY_READ, async (_request, { params }) => {
  const { resultId } = params;

  if (!resultId || !ObjectId.isValid(resultId)) {
    return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
  }

  try {
    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection(COLLECTIONS.runs);
    const scriptsCollection = db.collection(COLLECTIONS.checks);

    const run = await historyCollection.findOne({ _id: new ObjectId(resultId) });
    if (!run) {
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    const script = run.checkId
      ? await scriptsCollection.findOne(
          { scriptId: run.checkId },
          { projection: { name: 1, cnName: 1, description: 1, cnDescription: 1, scope: 1, cnScope: 1, author: 1 } },
        )
      : null;

    // The report page still reads the pre-pipeline shape; it is built from the run's current fields.
    const statusType = toLegacyStatus(run.outcome);
    return NextResponse.json({
      scriptId: run.checkId,
      executedAt: run.finishedAt,
      status: statusType === "failure" ? "failure" : "success",
      statusType,
      message: run.message,
      findings: Array.isArray(run.raw_results) ? run.raw_results : [],
      _id: run._id.toString(),
      ...(script && {
        name: script.name,
        cnName: script.cnName,
        description: script.description,
        cnDescription: script.cnDescription,
        scope: script.scope,
        cnScope: script.cnScope,
        author: script.author,
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
