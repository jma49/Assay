import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const start = Date.now();

  // 创建响应
  const response = NextResponse.next();

  // 添加性能监控头部
  const duration = Date.now() - start;
  response.headers.set("X-Response-Time", `${duration}ms`);
  response.headers.set("X-Timestamp", new Date().toISOString());

  // 记录慢查询（超过500ms）
  if (duration > 500) {
    console.warn(
      `[SLOW API] ${request.method} ${request.url} took ${duration}ms`
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
