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

// 分页响应接口
interface PaginatedResponse {
  data: CheckHistoryApiResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query_info: {
    script_name?: string;
    status?: string;
    include_results: boolean;
  };
}

const COLLECTION_NAME = "result";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500; // 最大限制

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取分页参数
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || DEFAULT_PAGE.toString())
    );
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || DEFAULT_LIMIT.toString())
      )
    );

    // 获取其他查询参数
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

    // 计算跳过的记录数
    const skip = (page - 1) * limit;

    console.log(
      `[API] 分页查询历史记录 - 页码: ${page}, 每页: ${limit}, 跳过: ${skip}`
    );

    // 并行执行查询和计数
    const [historyDocs, totalCount] = await Promise.all([
      collection
        .find(query, { projection })
        .sort({ execution_time: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    // 计算分页信息
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(
      `[API] 分页查询完成 - 返回 ${historyDocs.length} 条记录，总计 ${totalCount} 条，共 ${totalPages} 页`
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

    // 返回分页响应
    const response: PaginatedResponse = {
      data: responseData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      query_info: {
        script_name: scriptName || undefined,
        status: status || undefined,
        include_results: includeResults,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[API] 获取执行历史失败:", error);
    return NextResponse.json(
      { message: "获取执行历史时发生内部服务器错误" },
      { status: 500 }
    );
  }
}
