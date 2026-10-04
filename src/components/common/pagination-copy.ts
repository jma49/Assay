const en = {
  previous: "Previous",
  next: "Next",
  jumpToFirst: "Jump to first page",
  jumpToLast: "Jump to last page",
  pageNumber: "Page",
  of: "of",
  pages: "pages",
  jumpToPage: "Jump",
  pageJump: "Go",
  /** Filled by `formatPageInfo`: start, end, total, page, page count. */
  pageInfo: "Showing %s-%s of %s results (Page %s of %s)",
};

type Copy = typeof en;

const zh: Copy = {
  previous: "上一页",
  next: "下一页",
  jumpToFirst: "跳转到首页",
  jumpToLast: "跳转到末页",
  pageNumber: "第",
  of: "/",
  pages: "页",
  jumpToPage: "跳转",
  pageJump: "跳转",
  pageInfo: "显示第 %s-%s 条，共 %s 条结果（第 %s 页/共 %s 页）",
};

export function paginationCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
