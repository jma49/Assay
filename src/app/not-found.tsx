"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AuthShell } from "@/components/layout/AuthShell";

const copy = {
  en: { title: "Page not found", description: "The page you are looking for does not exist or has moved.", home: "Home", dashboard: "Dashboard" },
  zh: { title: "页面不存在", description: "你要找的页面不存在或已被移动。", home: "首页", dashboard: "控制台" },
};

export default function NotFound() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <AuthShell title={t.title} description={t.description}>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">{t.home}</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">{t.dashboard}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
