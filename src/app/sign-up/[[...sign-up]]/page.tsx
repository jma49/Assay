"use client";

import { SignUp } from "@clerk/nextjs";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell, clerkAppearance } from "@/components/layout/AuthShell";

const copy = {
  en: {
    title: "Create an account",
    description: "You will start as a viewer in the demo workspace.",
    footer: "An admin can give you a role to write or approve checks.",
  },
  zh: {
    title: "创建账号",
    description: "注册后会以查看者身份进入演示工作区。",
    footer: "管理员可以为你分配编写或审批检查的角色。",
  },
};

export default function SignUpPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <AuthShell title={t.title} description={t.description} footer={t.footer}>
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
