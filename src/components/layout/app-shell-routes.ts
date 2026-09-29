export type Label = { en: string; zh: string };

// Longest prefix first, so nested pages resolve to their own title.
const TITLES: [string, Label][] = [
  ["/checks/manage/history", { en: "Edit history", zh: "编辑历史" }],
  ["/checks/manage", { en: "Manage checks", zh: "管理检查" }],
  ["/checks/new", { en: "New check", zh: "新建检查" }],
  ["/checks", { en: "Checks", zh: "检查" }],
  ["/approvals", { en: "Approvals", zh: "审批" }],
  ["/activity", { en: "Activity", zh: "动态" }],
  ["/settings/notifications", { en: "Notifications", zh: "通知" }],
  ["/settings/api-keys", { en: "API keys", zh: "API 密钥" }],
  ["/runs/", { en: "Run", zh: "执行结果" }],
  ["/runs", { en: "Runs", zh: "执行记录" }],
  ["/coverage", { en: "Coverage", zh: "覆盖情况" }],
  ["/data-analysis", { en: "Analysis", zh: "分析" }],
  ["/admin/users", { en: "Members", zh: "成员" }],
];

export function pageTitle(pathname: string): Label | undefined {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * Where the top bar offers "New check": the lists of checks, where making one
 * is the next thing people do. Other pages keep only their own actions.
 */
export function offersNewCheck(pathname: string): boolean {
  return pathname === "/checks" || pathname === "/checks/manage";
}

/** Check pages title the browser tab with the check's own name. */
export function namesItsOwnTab(pathname: string): boolean {
  return /^\/checks\/[^/]+$/.test(pathname) && pathname !== "/checks/new" && pathname !== "/checks/manage";
}
