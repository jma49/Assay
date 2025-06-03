import { NextRequest, NextResponse } from "next/server";
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
  raw_results?: Record<string, unknown>[]; // 标记为可选，默认不返回大字段
  github_run_id?: string | number;
}

const COLLECTION_NAME = "result";
const DEFAULT_LIMIT = 500; // 返回最近500条记录供前端分页
const MAX_LIMIT = 500; // 增加最大限制以支持更多数据

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 为了保持前端兼容性，我们仍接受分页参数，但主要用于限制数据量
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || DEFAULT_LIMIT.toString()),
      ),
    );
    const scriptName = searchParams.get("script_name");
    const status = searchParams.get("status");
    const includeResults = searchParams.get("include_results") === "true";

    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);

    // 构建查询条件
    const query: Record<string, unknown> = {};
    if (scriptName) {
      query.script_name = scriptName;
    }
    if (status && (status === "success" || status === "failure")) {
      query.status = status;
    }

    // 构建投影（默认不包含大字段 raw_results）
    const projection: Record<string, number> = {
      script_name: 1,
      execution_time: 1,
      status: 1,
      statusType: 1,
      message: 1,
      findings: 1,
      github_run_id: 1,
    };

    if (includeResults) {
      projection.raw_results = 1;
    }

    console.log(`API: Fetching recent ${limit} records with query:`, {
      query,
      limit,
      includeResults,
    });

    // 获取最近的记录，不分页（供前端客户端分页）
    const [historyDocs, totalCount] = await Promise.all([
      collection
        .find(query, { projection })
        .sort({ execution_time: -1 })
        .limit(limit) // 只限制总数量，不分页
        .toArray(),
      collection.countDocuments(query),
    ]);

    console.log(
      `API: Found ${historyDocs.length} records out of ${totalCount} total.`,
    );

    // 转换数据格式
    const responseData: CheckHistoryApiResponse[] = historyDocs.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      script_name: doc.script_name,
      execution_time: doc.execution_time,
      status: doc.status,
      statusType: doc.statusType as ExecutionStatusType | undefined,
      message: doc.message,
      findings: doc.findings,
      ...(includeResults && { raw_results: doc.raw_results }),
      github_run_id: doc.github_run_id,
    })) as CheckHistoryApiResponse[];

    // 简化返回格式，提供元数据但让前端处理分页
    return NextResponse.json(
      {
        data: responseData,
        meta: {
          returned_count: historyDocs.length,
          total_count: totalCount,
          limit_applied: limit,
          client_pagination: true, // 指示前端这是供客户端分页的数据
        },
        query_info: {
          script_name: scriptName,
          status,
          include_results: includeResults,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error fetching check history:", error);
    return NextResponse.json(
      { message: "Internal Server Error fetching check history" },
      { status: 500 },
    );
  }
}
