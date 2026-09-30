"use client";

import Link from "next/link";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";

const COPY = {
  en: {
    title: "Your role can't create checks",
    hint: "Viewers can read checks and runs. Ask an admin for the developer role to write checks.",
    back: "Back to checks",
  },
  zh: {
    title: "你的角色不能新建检查",
    hint: "查看者可以浏览检查和执行记录。如需编写检查，请联系管理员授予开发者角色。",
    back: "返回检查列表",
  },
};

/** Shown instead of the editor to someone whose save would be refused anyway. */
export function NoCreateAccess() {
  const { language } = useLanguage();
  const t = COPY[language];
  return (
    <div className={`${APP_CONTAINER} py-16 text-center`}>
      <p className="text-body-md font-medium">{t.title}</p>
      <p className="mx-auto mt-1 max-w-md text-body-sm text-muted-foreground">{t.hint}</p>
      <Link href="/checks" className="mt-3 inline-block text-body-sm font-medium text-primary hover:underline">
        {t.back}
      </Link>
    </div>
  );
}
