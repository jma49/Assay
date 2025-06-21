import { NextRequest, NextResponse } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document } from "mongodb";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import { withSmartCache, generateCacheKey } from "@/lib/cache/cache-strategies";

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
  hashtags?: string[];
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

/**
 * 获取脚本列表数据的核心逻辑
 */
async function fetchScriptsData(
  sortBy: string,
  sortOrder: string,
  includeScheduledOnly: boolean
): Promise<ScriptInfo[]> {
  console.log("[API] 从 MongoDB 获取最新脚本数据");

  const collection = await getSqlScriptsCollection();

  // 构建查询条件
  const query: Record<string, unknown> = {};
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

  // 查询数据库
  const scripts = await collection
    .find(query, {
      projection: {
        scriptId: 1,
        name: 1,
        cnName: 1,
        description: 1,
        cnDescription: 1,
        scope: 1,
        cnScope: 1,
        author: 1,
        createdAt: 1,
        isScheduled: 1,
        hashtags: 1,
      },
    })
    .sort(sortCondition)
    .toArray();

  // 转换数据格式
  return scripts.map((script) => ({
    scriptId: script.scriptId,
    name: script.name || "",
    cnName: script.cnName,
    description: script.description,
    cnDescription: script.cnDescription,
    scope: script.scope,
    cnScope: script.cnScope,
    author: script.author || "",
    createdAt: script.createdAt,
    isScheduled: Boolean(script.isScheduled),
    hashtags: Array.isArray(script.hashtags) ? script.hashtags : [],
  }));
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    // 检查权限：需要 SCRIPT_READ 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_READ
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法查看脚本列表" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 获取查询参数
    const sortBy = searchParams.get("sort_by") || "name";
    const sortOrder = searchParams.get("sort_order") || "asc";
    const includeScheduledOnly = searchParams.get("scheduled_only") === "true";

    // 生成缓存键
    const cacheKey = generateCacheKey("scripts:list", {
      sortBy,
      sortOrder,
      scheduledOnly: includeScheduledOnly,
    });

    // 使用智能缓存管理器
    const scriptsData = await withSmartCache(
      cacheKey,
      "SCRIPT_LIST",
      async () => {
        return await fetchScriptsData(sortBy, sortOrder, includeScheduledOnly);
      }
    );

    return NextResponse.json({
      data: scriptsData,
      cached: true, // withSmartCache 会处理缓存逻辑
      cacheKey,
      query_info: {
        sort_by: sortBy,
        sort_order: sortOrder,
        scheduled_only: includeScheduledOnly,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] 获取脚本列表失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "无法获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
