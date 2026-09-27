import { formatDateTime } from "@/lib/utils/datetime";

// 日期格式化函数
/** Full timestamp in the viewer's own time zone. */
export const formatDate = (dateString: string, language: string = "en") => formatDateTime(dateString, language);
