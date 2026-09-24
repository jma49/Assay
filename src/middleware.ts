import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 定义公开路由（不需要认证）
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
]);

export default clerkMiddleware(async (auth, req) => {
  // Fail closed: a missing key must not disable authentication.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return new NextResponse("Authentication is not configured", {
      status: 503,
    });
  }

  // 如果是公开路由，直接通过
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 检查用户是否已认证
  const { userId } = await auth();

  if (!userId) {
    // 未认证用户重定向到登录页
    const signInUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // 已认证用户直接通过，邮箱域名验证在页面级别进行
  return NextResponse.next();
});

export const config = {
  matcher: [
    // 跳过Next.js内部文件和静态文件，但包含CSS文件以便处理404
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
    // 总是运行在API路由上
    "/(api|trpc)(.*)",
  ],
};
