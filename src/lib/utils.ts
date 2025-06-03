import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function containsHarmfulSql(sqlContent: string): boolean {
  const harmfulKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
  ];
  const upperSql = sqlContent.toUpperCase();
  // Check for keywords followed by a space, semicolon, newline, or at the very end of the string
  return harmfulKeywords.some(
    (keyword) =>
      upperSql.includes(keyword + " ") ||
      upperSql.includes(keyword + ";") ||
      upperSql.includes(keyword + "\n") ||
      upperSql.endsWith(keyword),
  );
}
