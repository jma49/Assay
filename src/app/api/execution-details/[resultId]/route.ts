import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb"; // 建议使用路径别名
import { ObjectId } from "mongodb";

const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "result";

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
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection(MONGO_COLLECTION_NAME);

    console.log(`正在从集合 ${MONGO_COLLECTION_NAME} 中查询记录: ${resultId}`);

    const result = await historyCollection.findOne({
      _id: new ObjectId(resultId),
    });

    if (!result) {
      console.warn(`未找到ID为 ${resultId} 的执行结果`);
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    const scriptId = result.script_name || result.scriptId;
    const executedAt = result.execution_time || result.executedAt;
    const findingsData = result.raw_results || result.findings; // 重命名以避免与函数参数findings冲突

    console.log(
      `找到脚本 ${scriptId} 的执行结果，包含 ${
        Array.isArray(findingsData) ? findingsData.length : 0
      } 条记录`
    );

    return NextResponse.json({
      scriptId,
      executedAt,
      status: result.status,
      statusType: result.statusType || result.status,
      message: result.message,
      findings: findingsData,
      _id: result._id.toString(),
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
}