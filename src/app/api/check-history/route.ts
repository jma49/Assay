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
const DEFAULT_LIMIT = 20; // 减少默认返回数量
const MAX_LIMIT = 100; // 最大限制

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取查询参数
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || DEFAULT_LIMIT.toString())
      )
    );
    const scriptName = searchParams.get("script_name");
    const status = searchParams.get("status");
    const includeResults = searchParams.get("include_results") === "true";

    const skip = (page - 1) * limit;

    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);

    // 构建查询条件
    const query: Record<string, any> = {};
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

    console.log(`API: Fetching records with query:`, {
      query,
      page,
      limit,
      skip,
      includeResults,
    });

    // 使用 Promise.all 并行执行查询和计数
    const [historyDocs, totalCount] = await Promise.all([
      collection
        .find(query, { projection })
        .sort({ execution_time: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    console.log(
      `API: Found ${historyDocs.length} records out of ${totalCount} total.`
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

    // 返回分页信息
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json(
      {
        data: responseData,
        pagination: {
          current_page: page,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: hasNext,
          has_prev: hasPrev,
        },
        query_info: {
          script_name: scriptName,
          status,
          include_results: includeResults,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Error fetching check history:", error);
    return NextResponse.json(
      { message: "Internal Server Error fetching check history" },
      { status: 500 }
    );
  }
}
