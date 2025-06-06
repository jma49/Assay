Next.js 国际化方案迁移指南 (next-intl v4.0)
目标
将项目当前基于 React Context 的双语实现，迁移到使用 next-intl v4.0 的现代化、基于路由的国际化方案。

背景
当前方案虽然简单，但在 SEO、用户体验和可维护性方面存在明显短板。next-intl 是 Next.js App Router 社区推荐的标准解决方案，能完美解决这些问题。

1. 现状分析与痛点
我们目前的实现依赖于 src/components/LanguageProvider.tsx，它通过 React Context 提供一个全局的语言状态。

路由: URL 与语言无关，不利于 SEO 和链接分享。 (e.g., /dashboard 无论是中文还是英文)
渲染: 语言切换纯粹在客户端发生，可能导致内容闪烁 (FOUC)。
维护: 翻译文本硬编码在 src/components/dashboard/types.ts 等多个文件的 TS 对象中，难以管理和扩展。
2. 推荐方案：next-intl 4.0
next-intl 提供了一套完整的国际化框架，与 Next.js 的 App Router 深度集成。

迁移后优势:
✅ 标准路由: 基于 URL 的语言识别 (e.g., /en/dashboard, /zh/dashboard)。
✅ SEO 友好: 每个语言版本都有独立的 URL，可被搜索引擎索引。
✅ 服务端渲染: 初始页面加载即为正确语言，无内容闪烁。
✅ 易于维护: 翻译内容与代码分离，存储在独立的 json 文件中。

3. 快速迁移步骤
第 1 步：安装 next-intl v4.0
在项目根目录执行：

Bash

npm install next-intl@4.0.0-beta.1
第 2 步：(新增) 创建 i18n.config.ts
这是 v4.0 的核心变化。在 src 目录下创建一个 i18n.config.ts 文件，用于集中管理路由配置。

TypeScript

// src/i18n.config.ts
import {Pathnames} from 'next-intl/navigation';

export const locales = ['en', 'zh'] as const;
export const defaultLocale = 'zh' as const;

// 如果您需要为不同语言设置不同的URL路径，可以在这里配置
// 目前我们保持一致，所以这个配置是可选的
export const pathnames = {
  '/': '/',
} satisfies Pathnames<typeof locales>;

export const localePrefix = 'always'; // URL中始终显示语言前缀, e.g. /en/dashboard

export type AppPathnames = keyof typeof pathnames;
第 3 步：(已简化) 更新路由中间件 middleware.ts
您的中间件现在变得非常简洁，只需从 i18n.config.ts 导入配置即可。

TypeScript

// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import {locales, localePrefix, pathnames, defaultLocale} from './i18n.config';

export default createMiddleware({
  defaultLocale,
  locales,
  pathnames,
  localePrefix,
});

export const config = {
  // 匹配除了API、_next/static、_next/image和favicon.ico之外的所有路径
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
第 4 步：整理翻译文件
此步骤不变。

在 src 目录下新建 messages 文件夹。
在其中创建 en.json 和 zh.json。
将您在 dashboardTranslations 等对象中的文本迁移到这里，并使用命名空间进行组织。
src/messages/zh.json (示例)

JSON

{
  "Dashboard": {
    "dashboardTitle": "SQL 检查仪表盘",
    "dashboardDesc": "实时监控自动化 SQL 检查任务执行情况，追踪数据质量和一致性。",
    "manualTrigger": "手动触发检查",
    "historyTitle": "历史检查记录"
  },
  "UserHeader": {
    "manageScripts": "管理脚本",
    "signOut": "登出",
    "changeLanguage": "切换语言"
  }
}
src/messages/en.json (示例)

JSON

{
  "Dashboard": {
    "dashboardTitle": "SQL Check Dashboard",
    "dashboardDesc": "Monitor automated SQL check tasks, track data quality and consistency in real-time.",
    "manualTrigger": "Manual Trigger Check",
    "historyTitle": "Check History"
  },
  "UserHeader": {
    "manageScripts": "Manage Scripts",
    "signOut": "Sign Out",
    "changeLanguage": "Change language"
  }
}
第 5 步：创建 i18n.ts 用于加载消息
此步骤不变。在 src 目录下创建 i18n.ts 文件。

TypeScript

// src/i18n.ts
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
第 6 步：更新目录结构与根布局
此步骤不变。

重命名 app 目录: 将 src/app 下的所有页面和布局文件移动到 src/app/[locale]/ 目录下。例如，src/app/page.tsx 变为 src/app/[locale]/page.tsx。
更新根布局 src/app/[locale]/layout.tsx: 使用 NextIntlClientProvider 替换掉旧的 LanguageProvider 和 ClientLayoutWrapper。
TypeScript

// src/app/[locale]/layout.tsx

import { NextIntlClientProvider, useMessages } from 'next-intl';
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import "../globals.css"; // 注意路径可能需要调整

const inter = Inter({ subsets: ["latin"] });

// ... metadata ...

export default function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = useMessages();
 
  return (
    <ClerkProvider>
      <html lang={locale} suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
            </NextIntlClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
第 7 步：在组件中获取翻译
此步骤不变，useTranslations 钩子的用法在 v4.0 中保持稳定。

用于客户端组件 ("use client")

TypeScript

// 示例: src/components/Dashboard.tsx
"use client";
import { useTranslations } from 'next-intl';

export default function Dashboard() {
  const t = useTranslations('Dashboard'); // 'Dashboard' 是 JSON 文件中的命名空间

  return (
    <div>
      <h1>{t('dashboardTitle')}</h1>
      <p>{t('dashboardDesc')}</p>
    </div>
  );
}
用于服务端组件

TypeScript

// 示例: src/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('Dashboard');

  return <h1>{t('dashboardTitle')}</h1>;
}
第 8 步：更新语言切换器
此步骤不变，切换器依然通过更新路由来工作。

TypeScript

// src/components/LanguageSwitcher.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // 使用你的UI库

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const onSelectChange = (nextLocale: string) => {
    // 移除当前的语言前缀来获取基础路径
    const basePath = pathname.startsWith(`/${locale}`) ? pathname.substring(`/${locale}`.length) : pathname;
    router.replace(`/${nextLocale}${basePath || '/'}`);
  };

  return (
    <Select value={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
然后在您的 UserHeader.tsx 或其他导航组件中集成这个 LanguageSwitcher。

4. 清理旧代码
完成以上步骤并确认功能正常后，可以安全地删除以下文件和代码：

🗑️ 删除文件:
src/components/LanguageProvider.tsx
src/components/ClientLayoutWrapper.tsx
🗑️ 移除代码:
从所有组件中移除 const { t } = useLanguage()。
从 src/components/dashboard/types.ts 中移除 dashboardTranslations 对象。