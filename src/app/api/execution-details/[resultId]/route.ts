import { NextRequest, NextResponse } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ObjectId } from "mongodb";

const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "result";
const SQL_SCRIPTS_COLLECTION_NAME = "sql_scripts"; // 假设 sql_scripts 集合的名称

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> } // <--- 注意这里的 Promise
) => {
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
    const scriptsCollection = db.collection(SQL_SCRIPTS_COLLECTION_NAME); // 获取 sql_scripts 集合

    console.log(`正在从集合 ${MONGO_COLLECTION_NAME} 中查询记录: ${resultId}`);

    const executionDoc = await historyCollection.findOne({
      // 重命名为 executionDoc 以示区分
      _id: new ObjectId(resultId),
    });

    if (!executionDoc) {
      console.warn(`未找到ID为 ${resultId} 的执行结果`);
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    const scriptIdFromExecution =
      executionDoc.script_name || executionDoc.scriptId; // 从执行结果中获取 scriptId
    const executedAt = executionDoc.execution_time || executionDoc.executedAt;
    const findingsData = executionDoc.raw_results || executionDoc.findings;

    console.log(
      `找到脚本 ${scriptIdFromExecution} 的执行结果，包含 ${
        Array.isArray(findingsData) ? findingsData.length : 0
      } 条记录`
    );

    let scriptMetadata = {};
    if (scriptIdFromExecution) {
      console.log(
        `正在从集合 ${SQL_SCRIPTS_COLLECTION_NAME} 中查询脚本元数据: ${scriptIdFromExecution}`
      );
      const scriptDoc = await scriptsCollection.findOne({
        scriptId: scriptIdFromExecution,
      }); // 使用 scriptId 查询
      if (scriptDoc) {
        console.log(`找到了脚本 ${scriptIdFromExecution} 的元数据。`);
        scriptMetadata = {
          name: scriptDoc.name,
          cnName: scriptDoc.cnName,
          description: scriptDoc.description,
          cnDescription: scriptDoc.cnDescription,
          scope: scriptDoc.scope,
          cnScope: scriptDoc.cnScope,
          author: scriptDoc.author,
        };
      } else {
        console.warn(
          `未在 ${SQL_SCRIPTS_COLLECTION_NAME} 中找到脚本 ${scriptIdFromExecution} 的元数据。`
        );
      }
    }

    return NextResponse.json({
      scriptId: scriptIdFromExecution, // 使用从执行结果中得到的 scriptId
      executedAt,
      status: executionDoc.status,
      statusType: executionDoc.statusType || executionDoc.status,
      message: executionDoc.message,
      findings: findingsData,
      _id: executionDoc._id.toString(),
      ...scriptMetadata, // 合并脚本元数据
    });
  } catch (error) {
    console.error("获取执行详情时出错:", error);
    return NextResponse.json(
      {
        message: "服务器内部错误",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
