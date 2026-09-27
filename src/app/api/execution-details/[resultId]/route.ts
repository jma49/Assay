import { toLegacyStatus } from "@/domain/run";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ObjectId } from "mongodb";

const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "result";
const SQL_SCRIPTS_COLLECTION_NAME = "sql_scripts"; // 假设 sql_scripts 集合的名称

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> } // <--- 注意这里的 Promise
) => {
  const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
  if (!authResult.isValid) {
    return authResult.response;
  }

  const awaitedParams = await params; // <--- await params
  const resultId = awaitedParams.resultId;
  // 或者直接解构: const { resultId } = await params;

  if (!resultId || !ObjectId.isValid(resultId)) {
    return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
  }

  try {
    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection(MONGO_COLLECTION_NAME);
    const scriptsCollection = db.collection(SQL_SCRIPTS_COLLECTION_NAME);

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
};
