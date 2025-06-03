import { QueryResult } from "pg";
import db from "../../src/lib/db"; // 调整路径
import { saveResultToMongo } from "../services/mongo-service";
import { sendSlackNotification } from "../services/slack-service";
import { ExecutionResult, ExecutionStatusType } from "../types";

/**
 * PostgreSQL 完整语法解析器
 * 支持所有PostgreSQL特有的语法特性
 */
class PostgreSQLParser {
  private position = 0;
  private content = "";
  private queries: string[] = [];
  private currentQuery = "";

  /**
   * 解析PostgreSQL脚本内容
   * @param sqlContent SQL内容
   * @returns 解析后的SQL语句数组
   */
  parse(sqlContent: string): string[] {
    this.position = 0;
    this.content = sqlContent;
    this.queries = [];
    this.currentQuery = "";

    // 预处理：移除注释但保留字符串内的注释
    this.content = this.preprocessComments(sqlContent);

    while (this.position < this.content.length) {
      this.parseNext();
    }

    // 添加最后一个查询
    this.finishCurrentQuery();

    return this.queries.filter((q) => q.trim().length > 0);
  }

  /**
   * 智能注释处理，保留字符串和dollar-quoted内的注释
   */
  private preprocessComments(content: string): string {
    let result = "";
    let i = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inDollarQuoted = false;
    let dollarTag = "";

    while (i < content.length) {
      const char = content[i];
      const nextChar = content[i + 1] || "";

      // 检查dollar-quoted字符串
      if (!inSingleQuote && !inDoubleQuote && char === "$") {
        const dollarMatch = this.findDollarTag(content, i);
        if (dollarMatch) {
          if (inDollarQuoted && dollarMatch.tag === dollarTag) {
            // 结束dollar-quoted
            inDollarQuoted = false;
            dollarTag = "";
          } else if (!inDollarQuoted) {
            // 开始dollar-quoted
            inDollarQuoted = true;
            dollarTag = dollarMatch.tag;
          }
          result += dollarMatch.tag;
          i += dollarMatch.tag.length;
          continue;
        }
      }

      // 检查字符串引号
      if (!inDollarQuoted) {
        if (char === "'" && !inDoubleQuote) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote) {
          inDoubleQuote = !inDoubleQuote;
        }
      }

      // 处理注释
      if (!inSingleQuote && !inDoubleQuote && !inDollarQuoted) {
        // 行注释
        if (char === "-" && nextChar === "-") {
          const lineEnd = content.indexOf("\n", i);
          if (lineEnd === -1) {
            // 注释到文件末尾
            break;
          }
          result += "\n"; // 保留换行符
          i = lineEnd + 1;
          continue;
        }

        // 块注释
        if (char === "/" && nextChar === "*") {
          const commentEnd = content.indexOf("*/", i + 2);
          if (commentEnd === -1) {
            // 未闭合的块注释，跳过到末尾
            break;
          }
          // 保留注释中的换行符数量
          const commentContent = content.substring(i, commentEnd + 2);
          const newlineCount = (commentContent.match(/\n/g) || []).length;
          result += "\n".repeat(newlineCount);
          i = commentEnd + 2;
          continue;
        }
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * 查找dollar标签
   */
  private findDollarTag(
    content: string,
    start: number,
  ): { tag: string } | null {
    if (content[start] !== "$") return null;

    let end = start + 1;
    while (end < content.length && content[end] !== "$") {
      const char = content[end];
      // dollar标签只能包含字母、数字和下划线
      if (!/[a-zA-Z0-9_]/.test(char)) {
        return null;
      }
      end++;
    }

    if (end < content.length && content[end] === "$") {
      return { tag: content.substring(start, end + 1) };
    }

    return null;
  }

  /**
   * 解析下一个字符
   */
  private parseNext(): void {
    const char = this.getCurrentChar();

    if (char === "$") {
      this.parseDollarQuoted();
    } else if (char === "'") {
      this.parseStringLiteral();
    } else if (char === '"') {
      this.parseIdentifier();
    } else if (char === "E" && this.peekChar() === "'") {
      this.parseEscapeString();
    } else if (char === ";") {
      this.handleStatementEnd();
    } else {
      this.currentQuery += char;
      this.position++;
    }
  }

  /**
   * 解析dollar-quoted字符串
   */
  private parseDollarQuoted(): void {
    const dollarMatch = this.findDollarTag(this.content, this.position);

    if (!dollarMatch) {
      this.currentQuery += this.getCurrentChar();
      this.position++;
      return;
    }

    const openTag = dollarMatch.tag;
    this.currentQuery += openTag;
    this.position += openTag.length;

    // 查找对应的结束标签
    while (this.position < this.content.length) {
      const closeMatch = this.findDollarTag(this.content, this.position);
      if (closeMatch && closeMatch.tag === openTag) {
        this.currentQuery += closeMatch.tag;
        this.position += closeMatch.tag.length;
        break;
      }
      this.currentQuery += this.getCurrentChar();
      this.position++;
    }
  }

  /**
   * 解析字符串字面量
   */
  private parseStringLiteral(): void {
    this.currentQuery += "'";
    this.position++;

    while (this.position < this.content.length) {
      const char = this.getCurrentChar();
      this.currentQuery += char;

      if (char === "'") {
        // 检查是否是转义的引号
        if (this.peekChar() === "'") {
          this.position++;
          this.currentQuery += "'";
        } else {
          break;
        }
      } else if (char === "\\") {
        // 处理反斜杠转义
        this.position++;
        if (this.position < this.content.length) {
          this.currentQuery += this.getCurrentChar();
        }
      }
      this.position++;
    }
    this.position++;
  }

  /**
   * 解析标识符（双引号包围）
   */
  private parseIdentifier(): void {
    this.currentQuery += '"';
    this.position++;

    while (this.position < this.content.length) {
      const char = this.getCurrentChar();
      this.currentQuery += char;
      this.position++;

      if (char === '"') {
        // 检查是否是转义的双引号
        if (this.peekChar() === '"') {
          this.position++;
          this.currentQuery += '"';
        } else {
          break;
        }
      }
    }
  }

  /**
   * 解析转义字符串 (E'...')
   */
  private parseEscapeString(): void {
    this.currentQuery += "E";
    this.position++;
    this.parseStringLiteral();
  }

  /**
   * 处理语句结束
   */
  private handleStatementEnd(): void {
    // 检查是否在函数/过程定义中
    const trimmedQuery = this.currentQuery.trim().toLowerCase();

    // PostgreSQL中，这些关键字表示多语句块，分号不是结束符
    const multiStatementKeywords = [
      "create function",
      "create or replace function",
      "create procedure",
      "create or replace procedure",
      "do $$",
      "do $",
      "begin;", // 事务块
      "begin transaction",
      "begin work",
    ];

    // 检查是否在PL/pgSQL块中（通过检查BEGIN/END配对）
    const isInPlpgsqlBlock = this.isInPlpgsqlBlock();

    const isMultiStatement =
      multiStatementKeywords.some((keyword) =>
        trimmedQuery.includes(keyword),
      ) || isInPlpgsqlBlock;

    if (isMultiStatement) {
      // 在函数/过程/PL/pgSQL定义中，分号不结束语句
      this.currentQuery += ";";
      this.position++;
    } else {
      // 正常的语句结束
      this.finishCurrentQuery();
      this.position++;
    }
  }

  /**
   * 检查是否在PL/pgSQL块中
   */
  private isInPlpgsqlBlock(): boolean {
    const query = this.currentQuery.toLowerCase();

    // 计算BEGIN和END的数量来判断是否在块中
    const beginCount = (query.match(/\bbegin\b/g) || []).length;
    const endCount = (query.match(/\bend\b/g) || []).length;

    // 如果BEGIN多于END，说明还在块中
    return beginCount > endCount;
  }

  /**
   * 完成当前查询
   */
  private finishCurrentQuery(): void {
    const trimmed = this.currentQuery.trim();
    if (trimmed.length > 0) {
      this.queries.push(trimmed);
    }
    this.currentQuery = "";
  }

  /**
   * 获取当前字符
   */
  private getCurrentChar(): string {
    return this.content[this.position] || "";
  }

  /**
   * 查看下一个字符
   */
  private peekChar(): string {
    return this.content[this.position + 1] || "";
  }
}

/**
 * 智能分割PostgreSQL语句，完全支持PostgreSQL语法
 * @param sqlContent SQL内容
 * @returns SQL语句数组
 */
function parsePostgreSQLStatements(sqlContent: string): string[] {
  const parser = new PostgreSQLParser();
  return parser.parse(sqlContent);
}

/**
 * 确定基于查询结果决定脚本执行状态
 * @param scriptId 脚本ID
 * @param findings 查询结果摘要
 * @param results 详细查询结果
 * @returns 执行的状态类型
 */
function determineStatusType(
  scriptId: string,
  findings: string,
  results?: QueryResult[],
): ExecutionStatusType {
  // 如果是检查类脚本且发现了问题，则标记为需要关注
  // 移除 isCheckOrValidateScript(scriptId) &&
  if (
    findings !== "No matching records found" &&
    findings !== "No valid queries" &&
    results?.some((r) => r.rows && r.rows.length > 0)
  ) {
    return "attention_needed";
  }

  return "success";
}

/**
 * 执行从数据库获取的 SQL 脚本内容。
 * 该函数负责解析并执行 SQL 内容，
 * 然后调用服务保存结果到 MongoDB 并发送 Slack 通知。
 *
 * @param scriptId 脚本的唯一标识符。
 * @param sqlContent SQL 脚本的完整内容。
 * @returns 返回一个包含执行结果的 Promise 对象。
 */
export async function executeSqlScriptFromDb(
  scriptId: string,
  sqlContent: string, // Changed from filePath
): Promise<ExecutionResult> {
  const executionTimestamp = Date.now();
  console.log(
    // Updated log message
    `[EXEC ${executionTimestamp}] Starting script execution: ${scriptId} (from DB content)`,
  );

  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "Execution incomplete";
  let statusType: ExecutionStatusType = "failure"; // 默认失败
  let mongoResultId: string | undefined = undefined;

  try {
    // Removed: if (!fs.existsSync(filePath)) { ... }

    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    // Removed: const sqlContentFromFile = fs.readFileSync(filePath, "utf8");
    // sqlContent is now a parameter

    if (!sqlContent || sqlContent.trim() === "") {
      successMessage = "SQL content is empty.";
      findings = "No SQL content provided";
      statusType = "success"; // Or perhaps a specific status like 'no_content'
      results = [];
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`,
      );
      const mongoSaveResult = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        successMessage,
        findings,
        results,
      );
      if (mongoSaveResult && mongoSaveResult.insertedId) {
        mongoResultId = mongoSaveResult.insertedId.toString();
      }
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType,
        mongoResultId,
      );
      return {
        success: true, // Technically not a failure, but script didn't run SQL
        statusType,
        message: successMessage,
        findings,
        mongoResultId,
      };
    }

    // 使用完整的PostgreSQL解析器，无需预处理注释
    const queries = parsePostgreSQLStatements(sqlContent)
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    console.log(
      `[EXEC ${executionTimestamp}] Parsed ${queries.length} PostgreSQL statements with full syntax support`,
    );

    // 打印解析的查询用于调试（仅在开发环境）
    if (process.env.NODE_ENV === "development") {
      queries.forEach((query, index) => {
        console.log(
          `[EXEC ${executionTimestamp}] Query ${index + 1}:`,
          query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        );
      });
    }

    // 预验证PostgreSQL语法
    const validation = PostgreSQLValidator.validateQueries(queries);
    if (!validation.isValid) {
      console.warn(
        `[EXEC ${executionTimestamp}] PostgreSQL syntax validation warnings:`,
        validation.errors,
      );
      // 注意：这里我们只警告，不阻止执行，因为验证器可能不完美
    }

    if (queries.length === 0) {
      successMessage =
        "SQL content is empty or contains only comments after processing."; // Adjusted message
      findings = "No valid queries after processing";
      statusType = "success";
      results = [];
      // ... (rest of the block for no queries is the same as original)
      console.warn(
        `[EXEC ${executionTimestamp}] ${scriptId}: ${successMessage}`,
      );
      const mongoSaveResult = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        successMessage,
        findings,
        results,
      );
      if (mongoSaveResult && mongoSaveResult.insertedId) {
        mongoResultId = mongoSaveResult.insertedId.toString();
        console.log(
          `[EXEC ${executionTimestamp}] 保存结果到MongoDB，ID: ${mongoResultId}`,
        );
      }
      await sendSlackNotification(
        scriptId,
        `${successMessage} (${findings})`,
        statusType,
        mongoResultId,
      );
      return {
        success: true,
        statusType,
        message: successMessage,
        findings,
        mongoResultId,
      };
    }

    results = [];
    for (let i = 0; i < queries.length; i++) {
      const queryText = queries[i];
      console.log(
        `[EXEC ${executionTimestamp}] Executing query ${i + 1}/${
          queries.length
        }`,
      );

      // 检查是否是可能长时间运行的查询
      const isLongRunning = isLongRunningQuery(queryText);
      if (isLongRunning) {
        console.log(
          `[EXEC ${executionTimestamp}] Detected potentially long-running query, setting extended timeout`,
        );
      }

      try {
        // 设置查询超时（普通查询30秒，复杂查询5分钟）
        const timeout = isLongRunning ? 300000 : 30000; // 5分钟 vs 30秒

        // 创建带超时的Promise
        const queryPromise = db.query(queryText);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Query timeout after ${
                  timeout / 1000
                } seconds. Query may be too complex or processing large amounts of data.`,
              ),
            );
          }, timeout);
        });

        console.log(
          `[EXEC ${executionTimestamp}] Query ${
            i + 1
          } started, timeout set to ${timeout / 1000} seconds`,
        );

        // 添加额外的调试信息
        if (process.env.NODE_ENV === "development") {
          console.log(`[EXEC ${executionTimestamp}] Query details:`, {
            length: queryText.length,
            hasNestedLoops: /\bloop\b.*\bloop\b/s.test(queryText.toLowerCase()),
            estimatedComplexity: estimateQueryComplexity(queryText),
          });
        }

        const result = (await Promise.race([
          queryPromise,
          timeoutPromise,
        ])) as QueryResult;
        results.push(result);
        console.log(
          `[EXEC ${executionTimestamp}] Query ${
            i + 1
          } completed successfully, affected rows: ${result.rowCount || 0}`,
        );
      } catch (queryError) {
        console.error(
          `[EXEC ${executionTimestamp}] Query ${i + 1} failed:`,
          queryError,
        );

        // 检查是否是超时错误
        if (
          queryError instanceof Error &&
          queryError.message.includes("timeout")
        ) {
          console.error(
            `[EXEC ${executionTimestamp}] Query ${
              i + 1
            } timed out. Consider optimizing the query or breaking it into smaller parts.`,
          );
          throw new Error(
            `Query execution timed out. The query may be processing too much data or contain inefficient logic. Original error: ${queryError.message}`,
          );
        }

        // 对于PostgreSQL，某些类型的"错误"实际上是正常的（如DO块中的NOTICE）
        if (queryError instanceof Error) {
          const errorMessage = queryError.message.toLowerCase();

          // 如果是PostgreSQL的NOTICE或INFO消息，不视为错误
          if (
            errorMessage.includes("notice:") ||
            errorMessage.includes("info:")
          ) {
            console.log(
              `[EXEC ${executionTimestamp}] Query ${
                i + 1
              } generated notice/info, continuing...`,
            );
            // 创建一个假的成功结果
            results.push({
              command: "NOTICE",
              rowCount: 0,
              rows: [],
              fields: [],
              oid: 0,
            } as unknown as QueryResult);
            continue;
          }
        }

        // 真正的错误，重新抛出
        throw queryError;
      }
    }

    findings = formatPostgreSQLFindings(results);
    successMessage = `Script ${scriptId} executed successfully. ${findings}.`;
    console.log(`[EXEC ${executionTimestamp}] ${successMessage}`);

    statusType = determineStatusType(scriptId, findings, results);

    const mongoSaveResultOnSuccess = await saveResultToMongo(
      scriptId,
      statusType === "attention_needed" ? "success" : statusType,
      statusType,
      successMessage,
      findings,
      results,
    );

    if (mongoSaveResultOnSuccess && mongoSaveResultOnSuccess.insertedId) {
      mongoResultId = mongoSaveResultOnSuccess.insertedId.toString();
      console.log(
        `[EXEC ${executionTimestamp}] 保存结果到MongoDB，ID: ${mongoResultId}`,
      );
    }

    // 只在需要关注或失败时发送通知，成功时不发送
    if (statusType === "attention_needed" || statusType === "failure") {
      await sendSlackNotification(
        scriptId,
        successMessage,
        statusType,
        mongoResultId,
      );
      console.log(
        `[EXEC ${executionTimestamp}] 发送通知 (${statusType}): ${scriptId}`,
      );
    } else {
      console.log(
        `[EXEC ${executionTimestamp}] 跳过通知 (${statusType}): ${scriptId} - 执行成功无需通知`,
      );
    }

    return {
      success: true,
      statusType,
      message: successMessage,
      findings,
      data: results,
      mongoResultId,
    };
  } catch (error: unknown) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EXEC ${executionTimestamp}] Script ${scriptId} execution failed: ${errorMessage}`,
      error,
    );
    findings = "Execution failed";
    statusType = "failure";

    try {
      const mongoSaveResultOnError = await saveResultToMongo(
        scriptId,
        statusType,
        statusType,
        errorMessage,
        findings,
        results,
      );
      if (mongoSaveResultOnError && mongoSaveResultOnError.insertedId) {
        mongoResultId = mongoSaveResultOnError.insertedId.toString();
        console.log(
          `[EXEC ${executionTimestamp}] 保存错误结果到MongoDB，ID: ${mongoResultId}`,
        );
      }
    } catch (mongoError) {
      console.error(
        `[EXEC ${executionTimestamp}] Failed to save error result to MongoDB for ${scriptId}:`,
        mongoError,
      );
    }

    await sendSlackNotification(
      scriptId,
      `Execution failed: ${errorMessage}`,
      statusType,
      mongoResultId,
    );

    return {
      success: false,
      statusType,
      message: errorMessage,
      findings,
      data: results,
      mongoResultId,
    };
  }
}

/**
 * PostgreSQL语法验证器
 * 提供基本的语法预检查，避免明显的语法错误
 */
class PostgreSQLValidator {
  /**
   * 验证PostgreSQL语句的基本语法
   * @param queries 要验证的SQL语句数组
   * @returns 验证结果
   */
  static validateQueries(queries: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      const queryNumber = i + 1;

      // 检查基本的语法平衡
      const balanceErrors = this.checkSyntaxBalance(query, queryNumber);
      errors.push(...balanceErrors);

      // 检查PostgreSQL特有的语法
      const pgErrors = this.checkPostgreSQLSyntax(query, queryNumber);
      errors.push(...pgErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查语法平衡（括号、引号等）
   */
  private static checkSyntaxBalance(
    query: string,
    queryNumber: number,
  ): string[] {
    const errors: string[] = [];

    // 检查括号平衡
    let parenCount = 0;
    let inString = false;
    let inDollarQuoted = false;
    let dollarTag = "";

    for (let i = 0; i < query.length; i++) {
      const char = query[i];

      // 处理dollar-quoted字符串
      if (char === "$" && !inString) {
        const dollarMatch = query.substring(i).match(/^\$([a-zA-Z0-9_]*)\$/);
        if (dollarMatch) {
          const tag = dollarMatch[0];
          if (inDollarQuoted && tag === dollarTag) {
            inDollarQuoted = false;
            dollarTag = "";
          } else if (!inDollarQuoted) {
            inDollarQuoted = true;
            dollarTag = tag;
          }
          i += tag.length - 1;
          continue;
        }
      }

      if (!inDollarQuoted) {
        if (char === "'" && !inString) {
          inString = true;
        } else if (char === "'" && inString) {
          inString = false;
        } else if (!inString) {
          if (char === "(") parenCount++;
          else if (char === ")") parenCount--;
        }
      }
    }

    if (parenCount !== 0) {
      errors.push(
        `Query ${queryNumber}: Unbalanced parentheses (${
          parenCount > 0 ? "missing closing" : "extra closing"
        } parentheses)`,
      );
    }

    if (inString) {
      errors.push(`Query ${queryNumber}: Unterminated string literal`);
    }

    if (inDollarQuoted) {
      errors.push(
        `Query ${queryNumber}: Unterminated dollar-quoted string (missing ${dollarTag})`,
      );
    }

    return errors;
  }

  /**
   * 检查PostgreSQL特有的语法
   */
  private static checkPostgreSQLSyntax(
    query: string,
    queryNumber: number,
  ): string[] {
    const errors: string[] = [];
    const lowerQuery = query.toLowerCase();

    // 检查DO块的基本结构
    if (lowerQuery.includes("do $$") || lowerQuery.includes("do $")) {
      if (
        !lowerQuery.includes("$$") &&
        !lowerQuery.match(/\$[a-zA-Z0-9_]*\$/)
      ) {
        errors.push(
          `Query ${queryNumber}: DO block missing proper dollar-quoted string termination`,
        );
      }
    }

    // 检查函数定义的基本结构
    if (
      lowerQuery.includes("create function") ||
      lowerQuery.includes("create or replace function")
    ) {
      if (!lowerQuery.includes("returns") && !lowerQuery.includes("return")) {
        errors.push(
          `Query ${queryNumber}: Function definition missing RETURNS clause`,
        );
      }
      if (!lowerQuery.includes("language")) {
        errors.push(
          `Query ${queryNumber}: Function definition missing LANGUAGE clause`,
        );
      }
    }

    return errors;
  }
}

/**
 * 增强的执行结果格式化，支持PostgreSQL特有的结果类型
 */
function formatPostgreSQLFindings(results: QueryResult[]): string {
  if (!results || results.length === 0) {
    return "No queries executed";
  }

  let totalRows = 0;
  let hasNotices = false;
  let hasData = false;

  results.forEach((result) => {
    if (result.command === "NOTICE") {
      hasNotices = true;
    } else if (result.rows && result.rows.length > 0) {
      totalRows += result.rows.length;
      hasData = true;
    }
  });

  const parts: string[] = [];

  if (hasData) {
    parts.push(`Found ${totalRows} records`);
  }

  if (hasNotices) {
    parts.push(`Generated notices/info messages`);
  }

  if (parts.length === 0) {
    return "Completed successfully (no data returned)";
  }

  return parts.join(", ");
}

/**
 * 检查是否是可能长时间运行的查询
 */
function isLongRunningQuery(queryText: string): boolean {
  const lowerQuery = queryText.toLowerCase();

  // 检查是否包含可能长时间运行的操作
  const longRunningPatterns = [
    /\bdo\s+\$\$.*\bloop\b.*\$\$/s, // DO块包含循环
    /\bfor\s+\w+\s+in\s+select\b/, // FOR循环查询
    /\bwhile\b.*\bloop\b/, // WHILE循环
    /\bcreate\s+index\b/, // 创建索引
    /\breindex\b/, // 重建索引
    /\bvacuum\b/, // 清理操作
    /\banalyze\b/, // 分析操作
    /\balter\s+table\b.*\badd\s+column\b/, // 添加列
    /\bupdate\b.*\bfrom\b.*\bjoin\b/, // 复杂更新
    /\bdelete\b.*\bfrom\b.*\bjoin\b/, // 复杂删除
  ];

  return longRunningPatterns.some((pattern) => pattern.test(lowerQuery));
}

/**
 * 估算查询复杂度
 */
function estimateQueryComplexity(
  queryText: string,
): "low" | "medium" | "high" | "very_high" {
  const lower = queryText.toLowerCase();
  let score = 0;

  // 基础复杂度评分
  if (lower.includes("select")) score += 1;
  if (lower.includes("join")) score += 2;
  if (lower.includes("loop")) score += 3;
  if (lower.includes("for")) score += 2;
  if (lower.includes("while")) score += 3;
  if (lower.includes("do $$")) score += 2;

  // 嵌套循环惩罚
  const nestedLoops = (lower.match(/\bloop\b/g) || []).length;
  if (nestedLoops > 1) score += nestedLoops * 2;

  // 复杂子查询
  const subqueries = (lower.match(/\bselect\b/g) || []).length;
  if (subqueries > 2) score += subqueries;

  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  if (score <= 10) return "high";
  return "very_high";
}
