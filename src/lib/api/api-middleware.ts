import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import { Redis } from "@upstash/redis";

// ===== 精确类型定义 =====

// 用户对象接口（来自Clerk）
export interface AuthenticatedUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  [key: string]: unknown;
}

// 限流元数据接口
export interface RateLimitMetadata {
  limit: number;
  remaining: number;
  reset: number;
}

// 扩展的中间件元数据
export interface MiddlewareMetadata extends Record<string, unknown> {
  cacheHit?: boolean;
  cacheConfig?: {
    key: string;
    ttl: number;
    strategy?: "stale-while-revalidate" | "cache-first" | "network-first";
  };
  rateLimit?: RateLimitMetadata;
}

// 错误对象类型守卫
export function isErrorWithMessage(
  error: unknown
): error is { message: string } {
  return typeof error === "object" && error !== null && "message" in error;
}

// 错误对象类型守卫（带堆栈）
export function isErrorWithStack(
  error: unknown
): error is { message: string; stack: string } {
  return isErrorWithMessage(error) && "stack" in error;
}

// 类型安全的错误信息提取
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

// 类型安全的错误堆栈提取
export function getErrorStack(error: unknown): string | undefined {
  if (isErrorWithStack(error)) {
    return error.stack;
  }
  return undefined;
}

// ===== 原有接口定义 =====

// 中间件执行结果类型
export interface MiddlewareResult {
  success: boolean;
  response?: NextResponse;
  data?: Record<string, unknown>;
  user?: AuthenticatedUser;
  userEmail?: string;
}

// 中间件配置类型
export interface MiddlewareConfig {
  // 认证配置
  auth?: {
    required: boolean;
    language?: string;
  };
  // 权限配置
  permissions?: Permission[];
  // 缓存配置
  cache?: {
    key: string;
    ttl: number;
    strategy?: "stale-while-revalidate" | "cache-first" | "network-first";
  };
  // 限流配置
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (req: NextRequest) => string;
  };
  // 日志配置
  logging?: {
    enabled: boolean;
    includeBody?: boolean;
    includeHeaders?: boolean;
  };
  // 验证配置
  validation?: {
    bodySchema?: Record<string, unknown>;
    querySchema?: Record<string, unknown>;
  };
}

// 中间件执行上下文
export interface MiddlewareContext {
  req: NextRequest;
  user?: AuthenticatedUser;
  userEmail?: string;
  startTime: number;
  requestId: string;
  metadata: MiddlewareMetadata;
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 认证中间件
 */
export async function authMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.auth?.required) {
    return { success: true };
  }

  try {
    const authResult = await validateApiAuth(
      (config.auth.language as "en" | "zh") || "zh"
    );
    if (!authResult.isValid) {
      return {
        success: false,
        response: authResult.response!,
      };
    }

    // 将用户信息添加到上下文
    context.user = authResult.user as unknown as AuthenticatedUser;
    context.userEmail = authResult.userEmail;

    return {
      success: true,
      user: authResult.user as unknown as AuthenticatedUser,
      userEmail: authResult.userEmail,
    };
  } catch (error) {
    console.error(`[${context.requestId}] 认证中间件错误:`, error);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "认证验证失败" },
        { status: 500 }
      ),
    };
  }
}

/**
 * 权限中间件
 */
export async function permissionMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.permissions || config.permissions.length === 0) {
    return { success: true };
  }

  if (!context.user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "用户未认证" },
        { status: 401 }
      ),
    };
  }

  try {
    // 检查是否有任一所需权限
    const permissionChecks = await Promise.all(
      config.permissions.map((permission) =>
        requirePermission(context.user!.id, permission)
      )
    );

    const hasPermission = permissionChecks.some((check) => check.authorized);

    if (!hasPermission) {
      const permissionNames = config.permissions.map((p) => p).join(", ");
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: `权限不足，需要以下权限之一: ${permissionNames}`,
          },
          { status: 403 }
        ),
      };
    }

    return { success: true };
  } catch (error) {
    console.error(`[${context.requestId}] 权限中间件错误:`, error);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "权限验证失败" },
        { status: 500 }
      ),
    };
  }
}

/**
 * 缓存中间件
 */
export async function cacheMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.cache) {
    return { success: true };
  }

  // 仅对GET请求进行缓存
  if (context.req.method !== "GET") {
    return { success: true };
  }

  try {
    const redis = Redis.fromEnv();
    const cacheKey = `api:${config.cache.key}:${context.req.url}`;

    // 尝试从缓存获取数据
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      context.metadata.cacheHit = true;

      // 根据策略决定是否直接返回缓存
      if (config.cache.strategy === "cache-first") {
        return {
          success: true,
          response: NextResponse.json(cachedData, {
            headers: {
              "X-Cache": "HIT",
              "Cache-Control": `max-age=${config.cache.ttl}`,
            },
          }),
        };
      }
    } else {
      context.metadata.cacheHit = false;
    }

    // 将缓存配置传递给后续处理
    context.metadata.cacheConfig = config.cache;

    return { success: true };
  } catch (error) {
    console.error(`[${context.requestId}] 缓存中间件错误:`, error);
    // 缓存错误不应该阻止请求，继续执行
    return { success: true };
  }
}

/**
 * 限流中间件
 */
export async function rateLimitMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.rateLimit) {
    return { success: true };
  }

  try {
    const redis = Redis.fromEnv();
    const key = config.rateLimit.keyGenerator
      ? config.rateLimit.keyGenerator(context.req)
      : `ratelimit:${
          context.userEmail ||
          context.req.headers.get("x-forwarded-for") ||
          "anonymous"
        }`;

    const window = Math.floor(Date.now() / config.rateLimit.windowMs);
    const rateLimitKey = `${key}:${window}`;

    // 获取当前窗口的请求计数
    const current = await redis.incr(rateLimitKey);

    // 设置过期时间
    if (current === 1) {
      await redis.expire(
        rateLimitKey,
        Math.ceil(config.rateLimit.windowMs / 1000)
      );
    }

    if (current > config.rateLimit.maxRequests) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            message: "请求过于频繁，请稍后再试",
            retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": config.rateLimit.maxRequests.toString(),
              "X-RateLimit-Remaining": Math.max(
                0,
                config.rateLimit.maxRequests - current
              ).toString(),
              "X-RateLimit-Reset": (
                Date.now() + config.rateLimit.windowMs
              ).toString(),
            },
          }
        ),
      };
    }

    // 添加限流头信息到上下文
    context.metadata.rateLimit = {
      limit: config.rateLimit.maxRequests,
      remaining: Math.max(0, config.rateLimit.maxRequests - current),
      reset: Date.now() + config.rateLimit.windowMs,
    };

    return { success: true };
  } catch (error) {
    console.error(`[${context.requestId}] 限流中间件错误:`, error);
    // 限流错误不应该阻止请求，继续执行
    return { success: true };
  }
}

/**
 * 日志中间件
 */
export async function loggingMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.logging?.enabled) {
    return { success: true };
  }

  try {
    const logData: Record<string, unknown> = {
      requestId: context.requestId,
      method: context.req.method,
      url: context.req.url,
      userAgent: context.req.headers.get("user-agent"),
      ip: context.req.headers.get("x-forwarded-for") || "unknown",
      timestamp: new Date().toISOString(),
      user: context.userEmail || "anonymous",
    };

    if (config.logging.includeHeaders) {
      logData.headers = Object.fromEntries(context.req.headers.entries());
    }

    if (config.logging.includeBody && context.req.method !== "GET") {
      try {
        const body = await context.req.clone().text();
        logData.body = body;
      } catch {
        logData.bodyError = "Failed to read body";
      }
    }

    console.log(`[API Request] ${JSON.stringify(logData)}`);

    return { success: true };
  } catch (error) {
    console.error(`[${context.requestId}] 日志中间件错误:`, error);
    // 日志错误不应该阻止请求，继续执行
    return { success: true };
  }
}

/**
 * 请求验证中间件
 */
export async function validationMiddleware(
  context: MiddlewareContext,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  if (!config.validation) {
    return { success: true };
  }

  try {
    // 验证查询参数
    if (config.validation.querySchema) {
      // const url = new URL(context.req.url);
      // const queryParams = Object.fromEntries(url.searchParams.entries());
      // 这里可以集成像 Zod 这样的验证库
      // const result = config.validation.querySchema.safeParse(queryParams);
      // if (!result.success) {
      //   return validation error response
      // }
    }

    // 验证请求体
    if (config.validation.bodySchema && context.req.method !== "GET") {
      try {
        // const body = await context.req.clone().json();
        // 这里可以集成像 Zod 这样的验证库
        // const result = config.validation.bodySchema.safeParse(body);
        // if (!result.success) {
        //   return validation error response
        // }
      } catch {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, message: "请求体格式错误" },
            { status: 400 }
          ),
        };
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`[${context.requestId}] 验证中间件错误:`, error);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "请求验证失败" },
        { status: 500 }
      ),
    };
  }
}

/**
 * 中间件管道执行器
 */
export async function executeMiddlewarePipeline(
  req: NextRequest,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  const context: MiddlewareContext = {
    req,
    startTime: Date.now(),
    requestId: generateRequestId(),
    metadata: {},
  };

  // 中间件执行顺序
  const middlewares = [
    loggingMiddleware, // 1. 日志记录（请求开始）
    rateLimitMiddleware, // 2. 限流检查
    authMiddleware, // 3. 认证验证
    permissionMiddleware, // 4. 权限检查
    validationMiddleware, // 5. 请求验证
    cacheMiddleware, // 6. 缓存处理
  ];

  // 依次执行中间件
  for (const middleware of middlewares) {
    const result = await middleware(context, config);
    if (!result.success) {
      // 记录错误日志
      console.error(`[${context.requestId}] 中间件执行失败:`, {
        middleware: middleware.name,
        duration: Date.now() - context.startTime,
      });
      return result;
    }

    // 合并中间件返回的数据到上下文
    if (result.user) context.user = result.user;
    if (result.userEmail) context.userEmail = result.userEmail;
  }

  // 所有中间件执行成功
  return {
    success: true,
    data: {
      context,
      user: context.user,
      userEmail: context.userEmail,
    },
  };
}

/**
 * 响应处理中间件（在业务逻辑执行后调用）
 */
export async function handleResponse(
  context: MiddlewareContext,
  response: unknown,
  config: MiddlewareConfig
): Promise<NextResponse> {
  const duration = Date.now() - context.startTime;

  try {
    // 缓存响应数据
    if (
      config.cache &&
      context.req.method === "GET" &&
      !context.metadata.cacheHit
    ) {
      try {
        const redis = Redis.fromEnv();
        const cacheKey = `api:${config.cache.key}:${context.req.url}`;
        await redis.setex(cacheKey, config.cache.ttl, JSON.stringify(response));
      } catch (error) {
        console.error(`[${context.requestId}] 缓存写入失败:`, error);
      }
    }

    // 构建响应头
    const headers: Record<string, string> = {
      "X-Request-ID": context.requestId,
      "X-Response-Time": `${duration}ms`,
    };

    // 添加限流头信息
    if (context.metadata.rateLimit) {
      const rateLimit = context.metadata.rateLimit;
      headers["X-RateLimit-Limit"] = rateLimit.limit.toString();
      headers["X-RateLimit-Remaining"] = rateLimit.remaining.toString();
      headers["X-RateLimit-Reset"] = rateLimit.reset.toString();
    }

    // 添加缓存头信息
    if (context.metadata.cacheHit) {
      headers["X-Cache"] = "HIT";
    } else if (config.cache) {
      headers["X-Cache"] = "MISS";
      headers["Cache-Control"] = `max-age=${config.cache.ttl}`;
    }

    // 记录响应日志
    if (config.logging?.enabled) {
      console.log(
        `[API Response] ${JSON.stringify({
          requestId: context.requestId,
          status: 200,
          duration,
          cacheHit: context.metadata.cacheHit || false,
          user: context.userEmail || "anonymous",
        })}`
      );
    }

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error(`[${context.requestId}] 响应处理错误:`, error);
    return NextResponse.json(
      { success: false, message: "响应处理失败" },
      { status: 500 }
    );
  }
}

/**
 * 错误处理中间件
 */
export function handleError(
  context: MiddlewareContext,
  error: unknown,
  _config: MiddlewareConfig
): NextResponse {
  const duration = Date.now() - context.startTime;

  // 记录错误日志
  console.error(`[${context.requestId}] API错误:`, {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    duration,
    user: context.userEmail || "anonymous",
    url: context.req.url,
    method: context.req.method,
  });

  // 构建错误响应
  const errorResponse = {
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "服务器内部错误"
        : getErrorMessage(error),
    requestId: context.requestId,
  };

  const headers = {
    "X-Request-ID": context.requestId,
    "X-Response-Time": `${duration}ms`,
  };

  return NextResponse.json(errorResponse, {
    status: 500,
    headers,
  });
}

/**
 * API路由包装器 - 简化中间件的使用
 */
export function withMiddleware(
  handler: (req: NextRequest, context: MiddlewareContext) => Promise<unknown>,
  config: MiddlewareConfig
) {
  return async function (req: NextRequest) {
    let context: MiddlewareContext;

    try {
      // 执行中间件管道
      const middlewareResult = await executeMiddlewarePipeline(req, config);

      if (!middlewareResult.success) {
        return middlewareResult.response!;
      }

      context = middlewareResult.data!.context as MiddlewareContext;

      // 执行业务逻辑
      const result = await handler(req, context);

      // 处理响应
      return await handleResponse(context, result, config);
    } catch (error) {
      // 错误处理
      return handleError(context!, error, config);
    }
  };
}
