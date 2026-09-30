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
  ["/settings/data-sources", { en: "Data sources", zh: "数据源" }],
  ["/runs/", { en: "Run", zh: "执行结果" }],
  ["/runs", { en: "Runs", zh: "执行记录" }],
  ["/coverage", { en: "Coverage", zh: "覆盖情况" }],
  ["/data-analysis", { en: "Analysis", zh: "分析" }],
  ["/admin/users", { en: "Members", zh: "成员" }],
];

export function pageTitle(pathname: string): Label | undefined {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

// One sentence under the page title: what the page is for.
const INTROS: [string, Label][] = [
  ["/checks/manage/history", { en: "Who changed which check, when, and what the diff was.", zh: "谁在什么时候改了哪个检查，以及改动内容。" }],
  ["/checks/manage", { en: "Edit, schedule and version the checks you own.", zh: "编辑、调度检查，并管理它们的版本。" }],
  ["/checks/new", { en: "Write a query that should return nothing. Saving sends it for approval before it runs.", zh: "写一条应当返回空结果的查询。保存后需要审批才会运行。" }],
  ["/checks", { en: "Queries that should return nothing. Filter by status, or search by name.", zh: "应当返回空结果的查询。可以按状态筛选，或按名称搜索。" }],
  ["/approvals", { en: "New and edited checks wait here until a manager or admin approves them.", zh: "新建和修改的检查在这里等待管理员或经理审批。" }],
  ["/activity", { en: "What changed across your checks, and who was told.", zh: "检查结果发生了什么变化，通知了谁。" }],
  ["/settings/notifications", { en: "Where alerts go when a check starts or stops finding rows.", zh: "检查开始或停止发现问题时，告警发到哪里。" }],
  ["/settings/api-keys", { en: "Keys for scripts, CI and agents that call the Assay API.", zh: "供脚本、CI 和智能体调用 Assay API 的密钥。" }],
  ["/settings/data-sources", { en: "The databases your checks run against, read-only.", zh: "检查以只读方式连接的数据库。" }],
  ["/runs", { en: "Every run, scheduled or manual, with what it found.", zh: "每一次定时或手动执行，以及它发现了什么。" }],
  ["/coverage", { en: "Which tables your checks watch, and which they miss.", zh: "哪些表有检查覆盖，哪些还没有。" }],
  ["/data-analysis", { en: "Pass rates and recurring findings over time.", zh: "随时间变化的通过率和反复出现的问题。" }],
  ["/admin/users", { en: "Who can read, write, approve or manage this workspace.", zh: "谁可以查看、编写、审批或管理这个工作区。" }],
];

export function pageIntro(pathname: string): Label | undefined {
  if (parentPage(pathname)) return undefined;
  return INTROS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * Pages about one thing (a check, a run) carry their own heading; the shell
 * shows a way back to the list above it instead of a page title.
 */
export function parentPage(pathname: string): { href: string; label: Label } | undefined {
  if (namesItsOwnTab(pathname)) return { href: "/checks", label: { en: "Checks", zh: "检查" } };
  if (/^\/runs\/[^/]+$/.test(pathname)) return { href: "/runs", label: { en: "Runs", zh: "执行记录" } };
  return undefined;
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
