import React from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isValidEmailDomain } from "@/lib/auth/auth-utils";
import Dashboard from "@/components/layout/Dashboard";
import UserHeader from "@/components/layout/UserHeader";
import { Toaster } from "@/components/ui/sonner";

// 强制动态渲染，避免静态预渲染
export const dynamic = "force-dynamic";

export default async function Home() {
  // 在构建时或没有Clerk配置时，显示配置提示
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-foreground">
              Configuring...
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              System is undergoing initial configuration, please visit later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 服务端认证检查
  const { userId } = await auth();

  // 如果用户未登录，重定向到登录页
  if (!userId) {
    redirect("/sign-in");
  }

  // 获取用户信息并验证邮箱域名
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress;

  if (!userEmail) {
    redirect("/sign-in");
  }

  // 验证邮箱域名
  if (!isValidEmailDomain(userEmail)) {
    redirect("/unauthorized");
  }

  // 记录访问日志（仅用于调试）
  if (process.env.NODE_ENV === "development") {
    console.log(`✅ Authorized access: ${userEmail} -> Home Page`);
  }

  return (
    <div className="min-h-screen bg-background">
      <UserHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Dashboard />
      </div>
      <Toaster />
      
      {/* 版本号显示 - 固定在左下角 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.2.1"}
          </span>
        </div>
      </div>
    </div>
  );
}
