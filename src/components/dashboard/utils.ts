// 日期格式化函数
export const formatDate = (dateString: string, locale: string = "en-US") => {
  const date = new Date(dateString);
  // 根据语言上下文调整区域设置
  const effectiveLocale = locale.startsWith("zh") ? "zh-CN" : "en-US";
  return date.toLocaleString(effectiveLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
