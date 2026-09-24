"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell } from "@/components/layout/AuthShell";

const copy = {
  en: {
    title: "No access",
    description: "This workspace only accepts accounts from approved email domains.",
    signOut: "Sign out",
    home: "Back to home",
  },
  zh: {
    title: "无法访问",
    description: "这个工作区只接受指定邮箱域名的账号。",
    signOut: "退出登录",
    home: "返回首页",
  },
};

export default function UnauthorizedPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <AuthShell title={t.title} description={t.description}>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">{t.home}</Link>
        </Button>
        <SignOutButton redirectUrl="/sign-in">
          <Button>{t.signOut}</Button>
        </SignOutButton>
      </div>
    </AuthShell>
  );
}
