// 日期格式化函数
export const formatDate = (dateString: string, locale: string = "en-US") => {
  const date = new Date(dateString);
  // 统一使用美国中部时区
  return date.toLocaleString(locale, {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
