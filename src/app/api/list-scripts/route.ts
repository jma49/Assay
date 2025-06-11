import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import redis from "@/lib/redis";
import { Collection, Document } from "mongodb";
import { validateApiAuth } from "@/lib/auth-utils";
import { Permission, requirePermission } from "@/lib/rbac";

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

// Redis 缓存键和TTL常量
const SCRIPTS_CACHE_KEY = "scripts:list";
const CACHE_TTL = 5 * 60; // 5分钟缓存（秒）

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

/**
 * 从 Redis 获取缓存的脚本列表
 */
async function getCachedScripts(): Promise<ScriptInfo[] | null> {
  try {
    const cachedData = await redis.get(SCRIPTS_CACHE_KEY);

    if (!cachedData) {
      return null;
    }

    console.log("[API] 从 Redis 缓存获取脚本列表");

    // 处理 Upstash Redis 自动反序列化的情况
    if (typeof cachedData === "object" && Array.isArray(cachedData)) {
      // 如果已经是数组对象，直接返回（Upstash 自动反序列化）
      return cachedData as ScriptInfo[];
    }

    // 检查数据类型和内容
    let dataToParseString = "";

    if (typeof cachedData === "string") {
      dataToParseString = cachedData;
    } else if (typeof cachedData === "object") {
      // 如果Redis返回的是对象，尝试序列化它
      dataToParseString = JSON.stringify(cachedData);
    } else {
      // 其他类型转换为字符串
      dataToParseString = String(cachedData);
    }

    // 验证字符串是否像JSON
    if (
      !dataToParseString.startsWith("[") &&
      !dataToParseString.startsWith("{")
    ) {
      console.warn(
        "[API] Redis 缓存数据格式无效，清除缓存:",
        dataToParseString.substring(0, 100)
      );
      await redis.del(SCRIPTS_CACHE_KEY);
      return null;
    }

    try {
      const parsedData = JSON.parse(dataToParseString);

      // 验证解析的数据是否为数组
      if (!Array.isArray(parsedData)) {
        console.warn("[API] Redis 缓存数据不是数组格式，清除缓存");
        await redis.del(SCRIPTS_CACHE_KEY);
        return null;
      }

      return parsedData as ScriptInfo[];
    } catch (parseError) {
      console.error("[API] JSON 解析失败，清除无效缓存:", parseError);
      await redis.del(SCRIPTS_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.error("[API] Redis 缓存读取失败:", error);
    // 尝试清除可能损坏的缓存
    try {
      await redis.del(SCRIPTS_CACHE_KEY);
      console.log("[API] 已清除可能损坏的缓存");
    } catch (deleteError) {
      console.error("[API] 清除缓存失败:", deleteError);
    }
    return null;
  }
}

/**
 * 将脚本列表存储到 Redis 缓存
 */
async function setCachedScripts(scripts: ScriptInfo[]): Promise<void> {
  try {
    // 验证输入数据
    if (!Array.isArray(scripts)) {
      console.error("[API] 尝试缓存非数组数据，跳过缓存");
      return;
    }

    // 序列化数据
    const dataToCache = JSON.stringify(scripts);

    // 验证序列化结果
    if (!dataToCache || dataToCache === "undefined" || dataToCache === "null") {
      console.error("[API] 数据序列化失败，跳过缓存");
      return;
    }

    // 存储到Redis
    await redis.setex(SCRIPTS_CACHE_KEY, CACHE_TTL, dataToCache);
    console.log(
      `[API] 脚本列表已缓存到 Redis，数量: ${scripts.length}，TTL: ${CACHE_TTL}秒`
    );
  } catch (error) {
    console.error("[API] Redis 缓存写入失败:", error);
    // 不抛出错误，允许系统继续运行
  }
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
    const sortBy = searchParams.get("sort_by") || "name"; // name, createdAt
    const sortOrder = searchParams.get("sort_order") || "asc"; // asc, desc
    const includeScheduledOnly = searchParams.get("scheduled_only") === "true";
    const forceRefresh = searchParams.get("force_refresh") === "true";

    // 检查 Redis 缓存
    if (!forceRefresh) {
      const cachedScripts = await getCachedScripts();
      if (cachedScripts) {
        let filteredData = cachedScripts;

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
          cache_source: "redis",
          query_info: {
            sort_by: sortBy,
            sort_order: sortOrder,
            scheduled_only: includeScheduledOnly,
          },
        });
      }
    }

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
      hashtags: 1,
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
      `[API] MongoDB 查询完成，耗时 ${queryTime}ms，找到 ${scriptsFromDb.length} 个脚本`
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
      hashtags: doc.hashtags as string[] | undefined,
    }));

    // 将数据缓存到 Redis（只在获取所有脚本时缓存）
    if (!includeScheduledOnly) {
      await setCachedScripts(scriptsForFrontend);
    }

    return NextResponse.json({
      data: scriptsForFrontend,
      cached: false,
      cache_source: "mongodb",
      query_time_ms: queryTime,
      query_info: {
        sort_by: sortBy,
        sort_order: sortOrder,
        scheduled_only: includeScheduledOnly,
      },
    });
  } catch (error) {
    console.error("[API] 获取脚本列表失败:", error);

    return NextResponse.json(
      {
        message: "无法从数据库获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
