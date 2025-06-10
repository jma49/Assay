import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 严格检查SQL内容，只允许安全的查询操作
export function isReadOnlyQuery(sqlContent: string): {
  isValid: boolean;
  reason?: string;
} {
  const upperSql = sqlContent.toUpperCase().trim();

  // 完全禁止的危险关键词（DDL/DML操作）
  const forbiddenKeywords = [
    // 数据修改操作
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "MERGE",
    "UPSERT",
    // 结构修改操作
    "CREATE",
    "DROP",
    "ALTER",
    "RENAME",
    // 权限和用户管理
    "GRANT",
    "REVOKE",
    "DENY",
    // 事务控制（可能被滥用）
    "COMMIT",
    "ROLLBACK",
    "SAVEPOINT",
    // 存储过程和函数
    "EXEC",
    "EXECUTE",
    "CALL",
    "PROCEDURE",
    "FUNCTION",
    // 数据库管理
    "BACKUP",
    "RESTORE",
    "LOAD",
    "BULK",
    // 系统命令
    "SHUTDOWN",
    "KILL",
    "xp_",
    "sp_",
  ];

  // 检查是否包含禁止的关键词
  for (const keyword of forbiddenKeywords) {
    if (
      upperSql.includes(keyword + " ") ||
      upperSql.includes(keyword + ";") ||
      upperSql.includes(keyword + "\n") ||
      upperSql.includes(keyword + "\t") ||
      upperSql.includes(keyword + "(") ||
      upperSql.endsWith(keyword)
    ) {
      return {
        isValid: false,
        reason: `禁止使用关键词 "${keyword}"。系统仅允许查询操作（SELECT）。`,
      };
    }
  }

  // 移除注释和字符串，简化检查
  const cleanSql = upperSql
    .replace(/--.*$/gm, "") // 移除行注释
    .replace(/\/\*[\s\S]*?\*\//g, "") // 移除块注释
    .replace(/'[^']*'/g, "'STRING'") // 替换字符串字面量
    .replace(/"[^"]*"/g, '"STRING"') // 替换双引号字符串
    .replace(/\s+/g, " ") // 标准化空白字符
    .trim();

  // 检查是否以SELECT开头（最基本的要求）
  if (
    !cleanSql.startsWith("SELECT") &&
    !cleanSql.startsWith("WITH") &&
    !cleanSql.startsWith("EXPLAIN")
  ) {
    return {
      isValid: false,
      reason:
        "SQL语句必须以 SELECT、WITH 或 EXPLAIN 开头。系统仅允许查询操作。",
    };
  }

  // 额外的安全检查：检查是否有可疑的函数调用
  const suspiciousFunctions = ["EXEC", "EVAL", "SYSTEM", "CMD", "SHELL"];
  for (const func of suspiciousFunctions) {
    if (cleanSql.includes(func + "(")) {
      return {
        isValid: false,
        reason: `禁止使用函数 "${func}"。可能存在安全风险。`,
      };
    }
  }

  return { isValid: true };
}

// 保持向后兼容性的旧函数（仍被一些地方使用）
export function containsHarmfulSql(sqlContent: string): boolean {
  const result = isReadOnlyQuery(sqlContent);
  return !result.isValid;
}
