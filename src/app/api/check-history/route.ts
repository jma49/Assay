import { NextRequest, NextResponse } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
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
    hashtags?: string[];
    sort_by?: string;
    sort_order?: string;
    include_results: boolean;
  };
}

const COLLECTION_NAME = "result";
const SCRIPTS_COLLECTION_NAME = "sql_scripts";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 2000; // 增加最大限制到2000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 检查是否使用优化版本
    const useOptimized = searchParams.get("optimized") === "true";

    if (useOptimized) {
      return getOptimizedCheckHistory(request);
    }

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
    const hashtagsParam = searchParams.get("hashtags");
    const hashtags = hashtagsParam
      ? hashtagsParam
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    // 排序参数
    const sortBy = searchParams.get("sort_by") || "execution_time";
    const sortOrder = searchParams.get("sort_order") || "desc"; // desc 或 asc

    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);
    const scriptsCollection: Collection<Document> = db.collection(
      SCRIPTS_COLLECTION_NAME
    );

    // 如果有hashtag过滤，先从scripts集合获取匹配的script IDs
    let scriptIdsForHashtagFilter: string[] = [];
    if (hashtags.length > 0) {
      console.log(
        `[API] Hashtag过滤: 查找包含标签 [${hashtags.join(", ")}] 的脚本`
      );

      const scriptsWithHashtags = await scriptsCollection
        .find(
          { hashtags: { $in: hashtags } },
          { projection: { scriptId: 1, name: 1, hashtags: 1 } }
        )
        .toArray();

      scriptIdsForHashtagFilter = scriptsWithHashtags
        .filter((script) => {
          // 检查脚本是否包含所有选中的hashtag（精确匹配）
          const scriptHashtags = (script.hashtags as string[]) || [];
          return hashtags.every((tag) => scriptHashtags.includes(tag));
        })
        .map((script) => script.scriptId as string);

      console.log(
        `[API] 找到 ${scriptIdsForHashtagFilter.length} 个匹配标签的脚本:`,
        scriptIdsForHashtagFilter
      );

      // 如果没有匹配的脚本，直接返回空结果
      if (scriptIdsForHashtagFilter.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          query_info: {
            script_name: scriptName || undefined,
            status: status || undefined,
            hashtags,
            include_results: includeResults,
          },
        });
      }
    }

    // 构建查询条件
    const query: Record<string, unknown> = {};

    // 处理script_name查询条件
    let scriptNameQuery: unknown = undefined;
    if (scriptName) {
      scriptNameQuery = { $regex: scriptName, $options: "i" }; // 支持模糊搜索
    }

    // 添加hashtag过滤条件
    if (scriptIdsForHashtagFilter.length > 0) {
      if (scriptNameQuery) {
        // 如果已有script_name搜索条件，需要同时满足搜索和hashtag过滤
        query.script_name = {
          $and: [scriptNameQuery, { $in: scriptIdsForHashtagFilter }],
        };
      } else {
        // 只有hashtag过滤
        query.script_name = { $in: scriptIdsForHashtagFilter };
      }
    } else if (scriptNameQuery) {
      // 只有script_name搜索
      query.script_name = scriptNameQuery;
    }

    // 处理状态过滤
    if (status) {
      if (status === "success") {
        // 成功状态：status为success且statusType不是attention_needed
        query.status = "success";
        query.statusType = { $ne: "attention_needed" };
      } else if (status === "failure") {
        // 失败状态
        query.status = "failure";
      } else if (status === "attention_needed") {
        // 需要注意状态：statusType为attention_needed
        query.statusType = "attention_needed";
      }
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
      `[API] 分页查询历史记录 - 页码: ${page}, 每页: ${limit}, 跳过: ${skip}${
        hashtags.length > 0 ? `, Hashtag过滤: [${hashtags.join(", ")}]` : ""
      }${status ? `, 状态过滤: ${status}` : ""}${
        sortBy ? `, 排序: ${sortBy} ${sortOrder}` : ""
      }`
    );

    // 构建排序条件
    const sortCondition: Record<string, 1 | -1> = {};
    if (sortBy === "execution_time") {
      sortCondition.execution_time = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "script_name") {
      sortCondition.script_name = sortOrder === "asc" ? 1 : -1;
    } else {
      // 默认按执行时间倒序
      sortCondition.execution_time = -1;
    }

    // 并行执行查询和计数
    const [historyDocs, totalCount] = await Promise.all([
      collection
        .find(query, { projection })
        .sort(sortCondition)
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
      `[API] 分页查询完成 - 返回 ${
        historyDocs.length
      } 条记录，总计 ${totalCount} 条，共 ${totalPages} 页${
        hashtags.length > 0 ? `，Hashtag过滤生效` : ""
      }`
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
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
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

/**
 * 优化版本的Check History查询
 * 使用聚合管道和缓存机制提高性能
 */
async function getOptimizedCheckHistory(request: NextRequest) {
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
    const hashtagsParam = searchParams.get("hashtags");
    const hashtags = hashtagsParam
      ? hashtagsParam
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    // 排序参数
    const sortBy = searchParams.get("sort_by") || "execution_time";
    const sortOrder = searchParams.get("sort_order") || "desc";

    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);

    // 构建聚合管道
    const pipeline: Document[] = [];

    // 第一阶段：匹配基本条件
    const matchStage: Document = {};

    // 脚本名称过滤
    if (scriptName) {
      matchStage.script_name = { $regex: scriptName, $options: "i" };
    }

    // 状态过滤 - 优化逻辑
    if (status) {
      if (status === "success") {
        matchStage.$and = [
          { status: "success" },
          {
            $or: [
              { statusType: { $exists: false } },
              { statusType: { $ne: "attention_needed" } },
            ],
          },
        ];
      } else if (status === "failure") {
        matchStage.status = "failure";
      } else if (status === "attention_needed") {
        matchStage.statusType = "attention_needed";
      }
    }

    // Hashtag过滤 - 如果有hashtag，使用lookup优化
    if (hashtags.length > 0) {
      // 使用lookup联接scripts集合
      pipeline.push({
        $lookup: {
          from: "sql_scripts",
          localField: "script_name",
          foreignField: "scriptId",
          as: "script_info",
          pipeline: [
            {
              $match: {
                hashtags: { $all: hashtags }, // 精确匹配所有hashtag
              },
            },
            {
              $project: { _id: 1 }, // 只需要确认存在即可
            },
          ],
        },
      });

      // 只保留有匹配script_info的记录
      pipeline.push({
        $match: {
          script_info: { $ne: [] },
        },
      });

      // 移除script_info字段
      pipeline.push({
        $unset: "script_info",
      });
    }

    // 添加基本匹配条件
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 第二阶段：排序
    const sortStage: Document = {};
    if (sortBy === "execution_time") {
      sortStage.execution_time = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "script_name") {
      sortStage.script_name = sortOrder === "asc" ? 1 : -1;
    } else {
      sortStage.execution_time = -1;
    }
    pipeline.push({ $sort: sortStage });

    // 第三阶段：使用facet同时获取数据和总数
    pipeline.push({
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              script_name: 1,
              execution_time: 1,
              status: 1,
              statusType: 1,
              message: 1,
              findings: 1,
              github_run_id: 1,
              ...(includeResults && { raw_results: 1 }),
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    console.log(
      `[API-Optimized] 聚合查询历史记录 - 页码: ${page}, 每页: ${limit}${
        hashtags.length > 0 ? `, Hashtag过滤: [${hashtags.join(", ")}]` : ""
      }${status ? `, 状态过滤: ${status}` : ""}`
    );

    const startTime = Date.now();
    const result = await collection.aggregate(pipeline).toArray();
    const queryTime = Date.now() - startTime;

    const historyDocs = result[0]?.data || [];
    const totalCount = result[0]?.totalCount?.[0]?.count || 0;

    console.log(
      `[API-Optimized] 聚合查询完成 - 返回 ${historyDocs.length} 条记录，总计 ${totalCount} 条，耗时 ${queryTime}ms`
    );

    // 计算分页信息
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 转换数据格式
    const responseData: CheckHistoryApiResponse[] = historyDocs.map(
      (doc: Document) => ({
        ...doc,
        _id: doc._id.toString(),
      })
    ) as CheckHistoryApiResponse[];

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
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        include_results: includeResults,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[API-Optimized] 获取执行历史失败:", error);
    return NextResponse.json(
      { message: "获取执行历史时发生内部服务器错误" },
      { status: 500 }
    );
  }
}
