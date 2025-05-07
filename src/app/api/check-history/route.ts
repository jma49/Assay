import { NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb"; // 使用路径别名
import { Collection, Document, WithId } from "mongodb";
import { ExecutionStatusType } from "@/../scripts/types"; // 假设 @/ 解析到 src/，scripts 与 src 平级

// 定义返回给前端的数据结构（可以与 MongoDB 文档略有不同，例如处理 _id）
interface CheckHistoryApiResponse extends Omit<WithId<Document>, "_id"> {
  _id: string; // 将 ObjectId 转换为字符串
  script_name: string;
  execution_time: Date;
  status: "success" | "failure";
  statusType?: ExecutionStatusType; // 添加 statusType
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

const COLLECTION_NAME = "result";
const HISTORY_LIMIT = 50; // 限制返回最近的记录数量

export async function GET() {
  try {
    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);

    console.log(
      `API: Fetching latest ${HISTORY_LIMIT} records from ${COLLECTION_NAME}`
    );

    const historyDocs = await collection
      .find({}) // 空查询对象表示获取所有文档
      .sort({ execution_time: -1 }) // 按执行时间降序排列
      .limit(HISTORY_LIMIT) // 限制返回数量
      .toArray();

    console.log(`API: Found ${historyDocs.length} records.`);

    // 将 ObjectId 转换为字符串，并确保类型匹配 ApiResponse
    const responseData: CheckHistoryApiResponse[] = historyDocs.map((doc) => ({
      ...doc,
      _id: doc._id.toString(), // 转换 ObjectId 为字符串
      script_name: doc.script_name,
      execution_time: doc.execution_time,
      status: doc.status,
      statusType: doc.statusType as ExecutionStatusType | undefined, // 添加 statusType，并进行类型断言
      message: doc.message,
      findings: doc.findings,
      raw_results: doc.raw_results,
      github_run_id: doc.github_run_id,
    })) as CheckHistoryApiResponse[]; // 类型断言

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("API Error fetching check history:", error);
    return NextResponse.json(
      { message: "Internal Server Error fetching check history" },
      { status: 500 }
    );
  }
}
