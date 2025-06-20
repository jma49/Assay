import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/cache/redis";
import { validateApiAuth } from "@/lib/auth/auth-utils";

/**
 * 清理 Redis 缓存的维护 API
 * 仅限开发环境或具有管理员权限的用户使用
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    // 在开发环境下允许，或者需要管理员权限
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, message: "此 API 仅在开发环境下可用" },
        { status: 403 }
      );
    }

    const { cacheType } = await request.json();

    const clearedCaches: string[] = [];

    if (cacheType === "scripts" || cacheType === "all") {
      await redis.del("scripts:list");
      clearedCaches.push("scripts:list");
    }

    if (cacheType === "all") {
      // 清理所有可能的缓存键
      const allKeys = await redis.keys("*");
      if (allKeys && allKeys.length > 0) {
        await redis.del(...allKeys);
        clearedCaches.push(`所有缓存键 (${allKeys.length} 个)`);
      }
    }

    console.log(`[API] 手动清理缓存: ${clearedCaches.join(", ")}`);

    return NextResponse.json({
      success: true,
      message: "缓存清理成功",
      clearedCaches,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] 清理缓存失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "清理缓存失败",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 获取当前缓存状态
 */
export async function GET() {
  try {
    // 验证用户认证 - 暂时跳过认证检查，因为这是开发工具
    // const authResult = await validateApiAuth("zh");
    // if (!authResult.isValid) {
    //   return authResult.response!;
    // }

    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, message: "此 API 仅在开发环境下可用" },
        { status: 403 }
      );
    }

    // 获取脚本缓存状态
    const scriptsCache = await redis.get("scripts:list");
    const scriptsCacheInfo = {
      exists: !!scriptsCache,
      type: typeof scriptsCache,
      size: scriptsCache ? String(scriptsCache).length : 0,
      preview: scriptsCache
        ? String(scriptsCache).substring(0, 100) + "..."
        : null,
    };

    // 获取所有缓存键
    const allKeys = await redis.keys("*");

    return NextResponse.json({
      success: true,
      cacheStatus: {
        scripts: scriptsCacheInfo,
        allKeys: allKeys || [],
        totalKeys: allKeys ? allKeys.length : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] 获取缓存状态失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取缓存状态失败",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
