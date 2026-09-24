"use client";

import { SignIn } from "@clerk/nextjs";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell, clerkAppearance } from "@/components/layout/AuthShell";

const copy = {
  en: {
    title: "Sign in",
    description: "Sign in to open the dashboard.",
    footer: "New here? Any email works; new accounts join the demo workspace as viewers.",
  },
  zh: {
    title: "登录",
    description: "登录后进入控制台。",
    footer: "第一次使用？任意邮箱都可以注册，新账号会以查看者身份进入演示工作区。",
  },
};

export default function SignInPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <AuthShell title={t.title} description={t.description} footer={t.footer}>
      <SignIn
        appearance={clerkAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
