import React from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isValidEmailDomain } from '@/lib/auth-utils';
import Dashboard from '@/components/Dashboard';
import UserHeader from '@/components/UserHeader';
import { Toaster } from "@/components/ui/sonner";

// 强制动态渲染，避免静态预渲染
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 在构建时或没有Clerk配置时，显示配置提示
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-foreground">
              配置中...
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              系统正在进行初始化配置，请稍后访问。
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
    redirect('/sign-in');
  }

  // 获取用户信息并验证邮箱域名
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress;
  
  if (!userEmail) {
    redirect('/sign-in');
  }

  // 验证邮箱域名
  if (!isValidEmailDomain(userEmail)) {
    redirect('/unauthorized');
  }

  // 记录访问日志（仅用于调试）
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Authorized access: ${userEmail} -> Home Page`);
  }

  return (
    <div className="min-h-screen bg-background">
      <UserHeader />
      <div className="max-w-6xl mx-auto py-6">
        <Dashboard />
      </div>
      <Toaster />
    </div>
  );
}