import type { TimeRange } from "./analytics";

const en = {
  title: "Analysis",
  description: "How checks have run over time.",
  ranges: { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" } as Record<TimeRange, string>,
  lastDays: (n: number) => `Last ${n} days`,
  timeRange: "Time range",
  check: "Check",
  allChecks: "All checks",
  tags: "Tags",
  reset: "Reset filters",
  runs: "Runs",
  acrossChecks: (n: number) => (n === 1 ? "Across 1 check" : `Across ${n} checks`),
  shareOfRuns: (percent: string) => `${percent}% of runs`,
  outcomes: "Outcomes",
  perDay: "Runs per day",
  allRuns: "All runs",
  byDay: "By day",
  byCheck: "By check",
  cleanRate: "Clean rate",
  lastRun: "Last run",
  noRunsDay: "No runs",
  runCount: (n: number) => (n === 1 ? "1 run" : `${n} runs`),
  previousPage: "Previous page",
  nextPage: "Next page",
  empty: "No runs in this range.",
  emptyHint: "Pick a longer range, or run a check.",
  loadFailed: "Couldn't load the analysis",
  retry: "Try again",
};

type Copy = typeof en;

const zh: Copy = {
  title: "分析",
  description: "检查的历史执行情况。",
  ranges: { "7d": "最近 7 天", "30d": "最近 30 天", "90d": "最近 90 天", all: "全部时间" },
  lastDays: (n) => `最近 ${n} 天`,
  timeRange: "时间范围",
  check: "检查",
  allChecks: "全部检查",
  tags: "标签",
  reset: "重置筛选",
  runs: "执行次数",
  acrossChecks: (n) => `共 ${n} 个检查`,
  shareOfRuns: (percent) => `占全部执行的 ${percent}%`,
  outcomes: "执行结果",
  perDay: "每日执行",
  allRuns: "全部执行",
  byDay: "按天",
  byCheck: "按检查",
  cleanRate: "正常率",
  lastRun: "最近执行",
  noRunsDay: "没有执行",
  runCount: (n) => `${n} 次执行`,
  previousPage: "上一页",
  nextPage: "下一页",
  empty: "这个时间范围内没有执行记录。",
  emptyHint: "选择更长的时间范围，或执行一次检查。",
  loadFailed: "无法加载分析数据",
  retry: "重试",
};

export function analysisCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
