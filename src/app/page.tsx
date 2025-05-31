import React from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isValidEmailDomain } from '@/lib/auth-utils';
import Dashboard from '@/components/Dashboard';
import UserHeader from '@/components/UserHeader';

// 强制动态渲染，避免静态预渲染
export const dynamic = 'force-dynamic';

export default async function Home() {
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
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="max-w-6xl mx-auto py-6">
        <Dashboard />
      </div>
    </div>
  );
}