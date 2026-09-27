import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GUEST_COOKIE, guestIdFromToken } from "@/lib/auth/guest";

// 定义公开路由（不需要认证）
// "/" is the public landing page; only the exact root path is public.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
  // Public, static documentation: exactly /docs and pages under it, so a
  // future route like /docs-admin does not become public by accident.
  "/docs",
  "/docs/(.*)",
  // Starts and ends a demo guest session; both check DEMO_MODE themselves.
  "/demo",
  "/demo/exit",
  // Icons generated at build time have no file extension for the matcher to skip.
  "/apple-icon(.*)",
  "/icon(.*)",
  // Machine callers that authenticate with their own shared secrets.
  "/api/notifications/dispatch",
  "/api/integrations/telegram/webhook",
]);

// Pages a demo guest can open; every API route still checks the guest itself.
const isGuestRoute = createRouteMatcher([
  "/dashboard",
  "/checks",
  "/checks/(.*)",
  "/manage-scripts",
  "/view-execution-result/(.*)",
  "/data-analysis",
  "/coverage",
  "/api/(.*)",
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

  if (!userId && guestIdFromToken(req.cookies.get(GUEST_COOKIE)?.value)) {
    if (isGuestRoute(req)) return NextResponse.next();
    // Anything that needs an account: offer to create one, then come back here.
    const signUpUrl = new URL("/sign-up", req.url);
    signUpUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signUpUrl);
  }

  if (!userId) {
    // 未认证用户重定向到登录页
    // Only the path is carried over, so the redirect cannot leave this origin.
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set(
      "redirect_url",
      req.nextUrl.pathname + req.nextUrl.search,
    );
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
    "/__clerk/:path*",
  ],
};
