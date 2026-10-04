const en = {
  title: "Manage checks",
  description: "Create, view, update, and delete your checks in one place.",
  search: "Search by check name or ID",
  allHistory: "All checks edit history",
  loadFailed: "Data loading failed",
  // Editor dialog
  addTitle: "Add new check",
  editTitle: "Edit check",
  addHint: "Provide details for the check.",
  sqlLabel: "SQL Content",
  cancel: "Cancel",
  save: "Save check",
  saved: "Check saved successfully.",
  saveFailed: "Failed to save check.",
  updated: "Check updated successfully.",
  updateFailed: "Failed to update check.",
  // Delete dialog
  deleteTitle: "Confirm deletion",
  deleteMessage: (name: string) => `Are you sure you want to delete the check '${name}'? This action cannot be undone.`,
  delete: "Delete",
  deleted: "Check deleted successfully.",
  deleteFailed: "Failed to delete check.",
};

type Copy = typeof en;

const zh: Copy = {
  title: "检查管理",
  description: "从集中界面创建、查看、更新和删除你的检查。",
  search: "按检查名称或 ID 搜索",
  allHistory: "所有检查历史",
  loadFailed: "数据加载失败",
  addTitle: "添加检查",
  editTitle: "编辑检查",
  addHint: "请提供检查的详细信息。",
  sqlLabel: "SQL 内容",
  cancel: "取消",
  save: "保存检查",
  saved: "检查保存成功。",
  saveFailed: "检查保存失败。",
  updated: "检查更新成功。",
  updateFailed: "更新检查失败。",
  deleteTitle: "确认删除",
  deleteMessage: (name) => `您确定要删除检查 '${name}' 吗？此操作无法撤销。`,
  delete: "删除",
  deleted: "检查删除成功。",
  deleteFailed: "删除检查失败。",
};

export function manageCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
