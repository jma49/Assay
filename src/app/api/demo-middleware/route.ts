import { NextRequest } from "next/server";
import { withMiddleware, MiddlewareContext } from "@/lib/api-middleware";
import { Permission } from "@/lib/rbac";

// 演示业务逻辑处理函数
async function getScriptsHandler(req: NextRequest, context: MiddlewareContext) {
  // 从查询参数获取分页信息
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  // 模拟数据库查询
  await new Promise((resolve) => setTimeout(resolve, 100)); // 模拟延迟

  const mockData = Array.from({ length: limit }, (_, i) => ({
    id: `script_${page}_${i + 1}`,
    name: `脚本 ${page}-${i + 1}`,
    author: context.userEmail,
    createdAt: new Date().toISOString(),
    status: Math.random() > 0.5 ? "active" : "inactive",
  }));

  return {
    success: true,
    data: mockData,
    pagination: {
      page,
      limit,
      total: 1000, // 模拟总数
      totalPages: Math.ceil(1000 / limit),
    },
    metadata: {
      requestId: context.requestId,
      processingTime: Date.now() - context.startTime,
      cacheHit: context.metadata.cacheHit,
    },
  };
}

// 使用中间件包装的GET处理器
export const GET = withMiddleware(getScriptsHandler, {
  // 认证配置
  auth: {
    required: true,
    language: "zh",
  },
  // 权限配置 - 需要脚本查看权限
  permissions: [Permission.SCRIPT_READ],
  // 缓存配置
  cache: {
    key: "demo-scripts",
    ttl: 300, // 5分钟
    strategy: "stale-while-revalidate",
  },
  // 限流配置
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1分钟
    keyGenerator: (req) => {
      // 基于用户进行限流
      return `demo-api:${req.headers.get("authorization") || "anonymous"}`;
    },
  },
  // 日志配置
  logging: {
    enabled: true,
    includeHeaders: false,
    includeBody: false,
  },
});

// POST处理器示例 - 创建脚本
async function createScriptHandler(
  req: NextRequest,
  context: MiddlewareContext
) {
  const body = await req.json();

  // 模拟创建逻辑
  await new Promise((resolve) => setTimeout(resolve, 200));

  const newScript = {
    id: `script_${Date.now()}`,
    ...body,
    author: context.userEmail,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  return {
    success: true,
    message: "脚本创建成功",
    data: newScript,
    metadata: {
      requestId: context.requestId,
      processingTime: Date.now() - context.startTime,
    },
  };
}

export const POST = withMiddleware(createScriptHandler, {
  auth: {
    required: true,
    language: "zh",
  },
  permissions: [Permission.SCRIPT_CREATE],
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1分钟
  },
  logging: {
    enabled: true,
    includeBody: true,
  },
  // 可以添加请求验证
  validation: {
    // bodySchema: createScriptSchema, // 可以集成 Zod 等验证库
  },
});
