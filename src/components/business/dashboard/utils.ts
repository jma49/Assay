import { formatDateTime } from "@/lib/utils/datetime";

/** Full timestamp in the viewer's own time zone. */
export const formatDate = (dateString: string, language: string = "en") => formatDateTime(dateString, language);
