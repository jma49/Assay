export type DocsLanguage = "en" | "zh";

export interface DocsPage {
  slug: string;
  title: Record<DocsLanguage, string>;
}

export interface DocsGroup {
  title: Record<DocsLanguage, string>;
  pages: DocsPage[];
}

/** Sidebar order is reading order: previous / next follow it. */
export const DOCS_NAV: DocsGroup[] = [
  {
    title: { en: "Getting started", zh: "入门" },
    pages: [
      { slug: "quick-start", title: { en: "Quick start", zh: "快速开始" } },
      { slug: "concepts", title: { en: "Core concepts", zh: "核心概念" } },
      { slug: "accounts-and-roles", title: { en: "Accounts and roles", zh: "账号与角色" } },
    ],
  },
  {
    title: { en: "Guides", zh: "使用指南" },
    pages: [
      { slug: "writing-checks", title: { en: "Writing checks", zh: "编写检查" } },
      { slug: "running-checks", title: { en: "Running checks", zh: "执行检查" } },
      { slug: "data-sources", title: { en: "Data sources", zh: "数据源" } },
      { slug: "scheduling", title: { en: "Scheduling", zh: "定时执行" } },
      { slug: "run-history", title: { en: "Run history and results", zh: "执行历史与结果" } },
      { slug: "analysis", title: { en: "Analysis", zh: "数据分析" } },
      { slug: "approvals", title: { en: "Approvals", zh: "审批流程" } },
      { slug: "notifications", title: { en: "Notifications", zh: "通知" } },
      { slug: "ai-assistant", title: { en: "AI assistant", zh: "AI 助手" } },
      { slug: "api-keys", title: { en: "API keys and MCP", zh: "API 密钥与 MCP" } },
      { slug: "managing-users", title: { en: "Managing users", zh: "用户与权限" } },
    ],
  },
  {
    title: { en: "Self-hosting", zh: "自托管" },
    pages: [
      { slug: "deployment", title: { en: "Deployment", zh: "部署" } },
      { slug: "environment-variables", title: { en: "Environment variables", zh: "环境变量" } },
      { slug: "demo-data", title: { en: "Demo data", zh: "演示数据" } },
    ],
  },
  {
    title: { en: "Reference", zh: "参考" },
    pages: [
      { slug: "sql-safety", title: { en: "SQL safety rules", zh: "SQL 安全规则" } },
      { slug: "navigation", title: { en: "Finding your way around", zh: "界面导航" } },
      { slug: "faq", title: { en: "FAQ", zh: "常见问题" } },
    ],
  },
];

export const DOCS_PAGES: DocsPage[] = DOCS_NAV.flatMap((group) => group.pages);
export const FIRST_DOCS_SLUG = DOCS_PAGES[0].slug;

export function findDocsPage(slug: string) {
  const index = DOCS_PAGES.findIndex((page) => page.slug === slug);
  if (index === -1) return null;
  return { page: DOCS_PAGES[index], previous: DOCS_PAGES[index - 1] ?? null, next: DOCS_PAGES[index + 1] ?? null };
}
