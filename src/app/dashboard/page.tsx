import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserProfile, isValidEmailDomain } from "@/lib/auth/auth-utils";
import Dashboard from "@/components/layout/Dashboard";
import UserHeader from "@/components/layout/UserHeader";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { Toaster } from "@/components/ui/sonner";

// 强制动态渲染，避免静态预渲染
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
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

  if (!userId) {
    redirect("/sign-in?redirect_url=/dashboard");
  }

  // 获取用户信息并验证邮箱域名
  const user = await getUserProfile(userId);

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
    console.log(`✅ Authorized access: ${userEmail} -> Dashboard`);
  }

  return (
    <div className="min-h-screen bg-background">
      <UserHeader />
      <main className={`${APP_CONTAINER} py-8`}>
        <Dashboard />
      </main>
      <Toaster />

      <span className="fixed bottom-4 left-4 z-30 font-mono text-[11px] text-muted-foreground">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
      </span>
    </div>
  );
}
