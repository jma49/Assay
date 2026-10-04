const en = {
  pageTitle: "Dashboard",
  historyTitle: "Check history",
  historyDesc: (runs: number) => `${runs} runs recorded`,
  nextScheduled: "Next scheduled check",
  search: "Search by check name or ID",
  clearSearch: "Clear",
  status: "Status",
  check: "Check",
  finished: "Finished",
  result: "Result",
  actions: "Actions",
  noData: "No data found",
  noMatches: "No matching execution records",
  viewReport: "View report",
};

type Copy = typeof en;

const zh: Copy = {
  pageTitle: "仪表盘",
  historyTitle: "检查历史",
  historyDesc: (runs) => `共记录 ${runs} 次执行`,
  nextScheduled: "下次计划检查",
  search: "按检查名称或 ID 搜索",
  clearSearch: "清除",
  status: "状态",
  check: "检查",
  finished: "完成时间",
  result: "结果",
  actions: "操作",
  noData: "无数据",
  noMatches: "无匹配执行记录",
  viewReport: "查看完整报告",
};

export function runsCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
