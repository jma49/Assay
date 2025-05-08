import { NextResponse } from "next/server";
import mongoDbClient from "../../../../lib/mongodb"; // 调整路径以匹配项目结构
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { resultId: string } }
) {
  const { resultId } = params;

  if (!resultId || !ObjectId.isValid(resultId)) {
    return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
  }

  try {
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection("result"); // 使用实际的集合名称

    const result = await historyCollection.findOne({
      _id: new ObjectId(resultId),
    });

    if (!result) {
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    // 为了安全和简洁，只返回必要的信息，特别是 findings
    // 您可以根据需要调整返回的字段
    return NextResponse.json({
      scriptId: result.script_name, // 注意字段可能是script_name而不是scriptId
      executedAt: result.execution_time, // 注意字段可能是execution_time而不是executedAt
      status: result.status,
      message: result.message,
      findings: result.raw_results || result.findings, // 根据您的数据结构调整
      _id: result._id.toString(), // 将 ObjectId 转换为字符串
    });
  } catch (error) {
    console.error("获取执行详情时出错:", error);
    return NextResponse.json({ message: "服务器内部错误" }, { status: 500 });
  }
}
