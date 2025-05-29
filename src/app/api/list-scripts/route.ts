import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";

interface ScriptInfo {
  scriptId: string;
  name: string;
  description?: string;
  scope?: string;
  author?: string;
  createdAt?: Date;
  cnName?: string;
  cnDescription?: string;
  cnScope?: string;
  isScheduled?: boolean;
}

// 简单的内存缓存（生产环境建议使用 Redis）
interface CacheItem {
  data: ScriptInfo[];
  timestamp: number;
}

let scriptsCache: CacheItem | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取查询参数
    const sortBy = searchParams.get("sort_by") || "name"; // name, createdAt
    const sortOrder = searchParams.get("sort_order") || "asc"; // asc, desc
    const includeScheduledOnly = searchParams.get("scheduled_only") === "true";
    const forceRefresh = searchParams.get("force_refresh") === "true";

    // 检查缓存
    const now = Date.now();
    if (
      !forceRefresh &&
      scriptsCache &&
      now - scriptsCache.timestamp < CACHE_TTL
    ) {
      console.log("API: Returning cached scripts data");
      let filteredData = scriptsCache.data;

      // 应用客户端过滤
      if (includeScheduledOnly) {
        filteredData = filteredData.filter(
          (script) => script.isScheduled === true
        );
      }

      // 应用客户端排序
      filteredData.sort((a, b) => {
        let aVal, bVal;

        if (sortBy === "createdAt") {
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        } else {
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
        }

        if (sortOrder === "desc") {
          return aVal < bVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      return NextResponse.json({
        data: filteredData,
        cached: true,
        query_info: {
          sort_by: sortBy,
          sort_order: sortOrder,
          scheduled_only: includeScheduledOnly,
        },
      });
    }

    console.log("API: Fetching fresh scripts data from MongoDB");

    const collection = await getSqlScriptsCollection();

    // 构建查询条件
    const query: Record<string, any> = {};
    if (includeScheduledOnly) {
      query.isScheduled = true;
    }

    // 构建排序条件
    const sortCondition: Record<string, 1 | -1> = {};
    if (sortBy === "createdAt") {
      sortCondition.createdAt = sortOrder === "desc" ? -1 : 1;
    } else {
      sortCondition.name = sortOrder === "desc" ? -1 : 1;
    }

    // 修复投影：只使用包含投影，不混合排除投影
    const projection = {
      scriptId: 1,
      name: 1,
      description: 1,
      scope: 1,
      author: 1,
      createdAt: 1,
      cnName: 1,
      cnDescription: 1,
      cnScope: 1,
      isScheduled: 1,
      _id: 0, // _id是特殊字段，可以在包含投影中排除
      // 注意：不包含sqlContent字段，这样就不会返回大字段
    };

    const startTime = Date.now();

    const scriptsFromDb = await collection
      .find(query, { projection })
      .sort(sortCondition)
      .toArray();

    const queryTime = Date.now() - startTime;
    console.log(
      `API: MongoDB query completed in ${queryTime}ms, found ${scriptsFromDb.length} scripts`
    );

    const scriptsForFrontend: ScriptInfo[] = scriptsFromDb.map((doc) => ({
      scriptId: doc.scriptId as string,
      name: doc.name as string,
      description: doc.description as string | undefined,
      scope: doc.scope as string | undefined,
      author: doc.author as string | undefined,
      createdAt: doc.createdAt as Date | undefined,
      cnName: doc.cnName as string | undefined,
      cnDescription: doc.cnDescription as string | undefined,
      cnScope: doc.cnScope as string | undefined,
      isScheduled: doc.isScheduled as boolean | undefined,
    }));

    // 更新缓存（只在获取所有脚本时缓存）
    if (!includeScheduledOnly) {
      scriptsCache = {
        data: scriptsForFrontend,
        timestamp: now,
      };
      console.log("API: Scripts data cached");
    }

    return NextResponse.json({
      data: scriptsForFrontend,
      cached: false,
      query_time_ms: queryTime,
      query_info: {
        sort_by: sortBy,
        sort_order: sortOrder,
        scheduled_only: includeScheduledOnly,
      },
    });
  } catch (error) {
    console.error("Error fetching script list from MongoDB:", error);

    return NextResponse.json(
      {
        message: "无法从数据库获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
