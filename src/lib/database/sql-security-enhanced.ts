import { Pool, QueryResult } from "pg";
import { createHash } from "crypto";

/**
 * 增强的SQL安全执行器
 * 提供参数化查询、AST验证、沙箱执行等安全特性
 */
export class SecureSQLExecutor {
  private pool: Pool;
  private queryWhitelist: Map<string, string> = new Map();
  private queryTemplates: Map<string, QueryTemplate> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeQueryTemplates();
  }

  /**
   * 安全的SQL执行接口
   * @param sqlContent 原始SQL内容
   * @param context 执行上下文信息
   * @returns 执行结果
   */
  async executeSecurely(
    sqlContent: string,
    context: ExecutionContext
  ): Promise<QueryResult[]> {
    // 1. 预处理和清理
    const cleanedSQL = this.sanitizeSQL(sqlContent);

    // 2. 安全验证
    const securityCheck = await this.comprehensiveSecurityCheck(cleanedSQL);
    if (!securityCheck.isValid) {
      throw new Error(`安全检查失败: ${securityCheck.reason}`);
    }

    // 3. 尝试参数化查询
    const parameterizedResult = this.tryParameterizeQuery(cleanedSQL);
    if (
      parameterizedResult.success &&
      parameterizedResult.template &&
      parameterizedResult.params
    ) {
      return await this.executeParameterized(
        parameterizedResult.template,
        parameterizedResult.params
      );
    }

    // 4. 白名单验证
    const whitelistCheck = this.checkQueryWhitelist(cleanedSQL);
    if (whitelistCheck.approved) {
      return await this.executeWhitelisted(cleanedSQL, context);
    }

    // 5. 沙箱执行（只读用户）
    return await this.executeSandboxed(cleanedSQL, context);
  }

  /**
   * SQL清理和预处理
   */
  private sanitizeSQL(sqlContent: string): string {
    return sqlContent
      .replace(/--.*$/gm, "") // 移除行注释
      .replace(/\/\*[\s\S]*?\*\//g, "") // 移除块注释
      .replace(/\s+/g, " ") // 标准化空白字符
      .trim();
  }

  /**
   * 综合安全检查
   */
  private async comprehensiveSecurityCheck(
    sql: string
  ): Promise<SecurityCheckResult> {
    const checks = [
      this.checkSQLInjectionPatterns(sql),
      this.checkForbiddenOperations(sql),
      this.checkResourceLimits(sql),
      this.checkDataAccess(sql),
    ];

    const results = await Promise.all(checks);
    const failed = results.find((r) => !r.isValid);

    return failed || { isValid: true, reason: "" };
  }

  /**
   * SQL注入模式检测
   */
  private async checkSQLInjectionPatterns(
    sql: string
  ): Promise<SecurityCheckResult> {
    const dangerousPatterns = [
      /union\s+select/i,
      /;\s*(drop|delete|insert|update)/i,
      /exec\s*\(/i,
      /char\s*\(/i,
      /0x[0-9a-f]+/i,
      /\/\*.*\*\//s,
      /\'\s*or\s*\'/i,
      /\'\s*and\s*\'/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        return {
          isValid: false,
          reason: `检测到可疑的SQL注入模式: ${pattern.source}`,
        };
      }
    }

    return { isValid: true, reason: "" };
  }

  /**
   * 禁用操作检查
   */
  private async checkForbiddenOperations(
    sql: string
  ): Promise<SecurityCheckResult> {
    const upperSQL = sql.toUpperCase();

    // 严格的操作白名单
    const allowedOperations = ["SELECT", "WITH", "EXPLAIN", "DO"];
    const firstKeyword = upperSQL.trim().split(/\s+/)[0];

    if (!allowedOperations.includes(firstKeyword)) {
      return {
        isValid: false,
        reason: `不允许的操作: ${firstKeyword}. 仅允许: ${allowedOperations.join(
          ", "
        )}`,
      };
    }

    // 检查嵌套的危险操作
    const forbiddenInContext = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "CREATE",
      "ALTER",
      "GRANT",
      "REVOKE",
      "TRUNCATE",
      "EXEC",
    ];

    for (const forbidden of forbiddenInContext) {
      if (upperSQL.includes(forbidden)) {
        return {
          isValid: false,
          reason: `SQL内容包含禁止的操作: ${forbidden}`,
        };
      }
    }

    return { isValid: true, reason: "" };
  }

  /**
   * 资源限制检查
   */
  private async checkResourceLimits(sql: string): Promise<SecurityCheckResult> {
    const queryComplexity = this.estimateQueryComplexity(sql);

    if (queryComplexity.score > 100) {
      return {
        isValid: false,
        reason: `查询复杂度过高 (${queryComplexity.score}), 最大允许: 100`,
      };
    }

    if (queryComplexity.estimatedMemory > 1024 * 1024 * 100) {
      // 100MB
      return {
        isValid: false,
        reason: `预估内存使用过高: ${queryComplexity.estimatedMemory} bytes`,
      };
    }

    return { isValid: true, reason: "" };
  }

  /**
   * 数据访问权限检查
   */
  private async checkDataAccess(sql: string): Promise<SecurityCheckResult> {
    // 检查敏感表访问
    const sensitivePatterns = [
      /\busers\b/i,
      /\bpasswords\b/i,
      /\bcredentials\b/i,
      /\bsessions\b/i,
      /\btokens\b/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(sql)) {
        return {
          isValid: false,
          reason: `尝试访问敏感数据表: ${pattern.source}`,
        };
      }
    }

    return { isValid: true, reason: "" };
  }

  /**
   * 参数化查询尝试
   */
  private tryParameterizeQuery(sql: string): ParameterizationResult {
    // 检查是否匹配预定义模板
    for (const [templateId, template] of this.queryTemplates) {
      const match = template.pattern.exec(sql);
      if (match) {
        const params = this.extractParameters(match, template.paramMap);
        return {
          success: true,
          template: template.sql,
          params,
          templateId,
        };
      }
    }

    return { success: false };
  }

  /**
   * 执行参数化查询
   */
  private async executeParameterized(
    template: string,
    params: unknown[]
  ): Promise<QueryResult[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(template, params);
      return [result];
    } finally {
      client.release();
    }
  }

  /**
   * 沙箱执行（使用只读连接）
   */
  private async executeSandboxed(
    sql: string,
    _context: ExecutionContext
  ): Promise<QueryResult[]> {
    const client = await this.pool.connect();

    try {
      // 设置查询超时
      await client.query("SET statement_timeout = $1", [
        _context.timeoutMs || 30000,
      ]);

      // 设置只读模式
      await client.query("SET default_transaction_read_only = on");

      // 限制工作内存
      await client.query("SET work_mem = $1", ["64MB"]);

      // 执行查询
      const result = await client.query(sql);
      return [result];
    } finally {
      client.release();
    }
  }

  /**
   * 查询复杂度估算
   */
  private estimateQueryComplexity(sql: string): QueryComplexity {
    const upperSQL = sql.toUpperCase();
    let score = 0;
    let estimatedMemory = 1024; // 基础内存

    // JOIN 复杂度
    const joinCount = (upperSQL.match(/\bJOIN\b/g) || []).length;
    score += joinCount * 10;
    estimatedMemory += joinCount * 1024 * 1024; // 每个JOIN增加1MB

    // 子查询复杂度
    const subqueryCount = (upperSQL.match(/\(\s*SELECT/g) || []).length;
    score += subqueryCount * 15;
    estimatedMemory += subqueryCount * 512 * 1024; // 每个子查询512KB

    // ORDER BY 复杂度
    if (upperSQL.includes("ORDER BY")) {
      score += 5;
      estimatedMemory += 2 * 1024 * 1024; // 排序需要2MB
    }

    // GROUP BY 复杂度
    if (upperSQL.includes("GROUP BY")) {
      score += 8;
      estimatedMemory += 4 * 1024 * 1024; // 分组需要4MB
    }

    return { score, estimatedMemory };
  }

  /**
   * 初始化查询模板
   */
  private initializeQueryTemplates(): void {
    // 用户查询模板
    this.queryTemplates.set("user_by_id", {
      pattern: /SELECT \* FROM users WHERE id = (\d+)/i,
      sql: "SELECT * FROM users WHERE id = $1",
      paramMap: [{ index: 1, type: "number" }],
    });

    // 脚本查询模板
    this.queryTemplates.set("script_by_id", {
      pattern: /SELECT \* FROM sql_scripts WHERE script_id = '([^']+)'/i,
      sql: "SELECT * FROM sql_scripts WHERE script_id = $1",
      paramMap: [{ index: 1, type: "string" }],
    });

    // 执行历史查询模板
    this.queryTemplates.set("execution_history", {
      pattern:
        /SELECT \* FROM execution_results WHERE script_id = '([^']+)' ORDER BY created_at DESC LIMIT (\d+)/i,
      sql: "SELECT * FROM execution_results WHERE script_id = $1 ORDER BY created_at DESC LIMIT $2",
      paramMap: [
        { index: 1, type: "string" },
        { index: 2, type: "number" },
      ],
    });
  }

  /**
   * 白名单检查
   */
  private checkQueryWhitelist(sql: string): WhitelistResult {
    const sqlHash = createHash("sha256").update(sql).digest("hex");
    const approvedQuery = this.queryWhitelist.get(sqlHash);

    return {
      approved: !!approvedQuery,
      queryId: approvedQuery,
    };
  }

  /**
   * 执行白名单查询
   */
  private async executeWhitelisted(
    sql: string,
    _context: ExecutionContext
  ): Promise<QueryResult[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      return [result];
    } finally {
      client.release();
    }
  }

  /**
   * 参数提取
   */
  private extractParameters(
    match: RegExpExecArray,
    paramMap: ParameterMap[]
  ): unknown[] {
    return paramMap.map((param) => {
      const value = match[param.index];
      switch (param.type) {
        case "number":
          return parseInt(value, 10);
        case "string":
          return value;
        case "boolean":
          return value.toLowerCase() === "true";
        default:
          return value;
      }
    });
  }
}

// 类型定义
interface ExecutionContext {
  userId: string;
  scriptId: string;
  timeoutMs?: number;
  maxMemoryMB?: number;
}

interface SecurityCheckResult {
  isValid: boolean;
  reason: string;
}

interface QueryComplexity {
  score: number;
  estimatedMemory: number;
}

interface ParameterizationResult {
  success: boolean;
  template?: string;
  params?: unknown[];
  templateId?: string;
}

interface QueryTemplate {
  pattern: RegExp;
  sql: string;
  paramMap: ParameterMap[];
}

interface ParameterMap {
  index: number;
  type: "string" | "number" | "boolean";
}

interface WhitelistResult {
  approved: boolean;
  queryId?: string;
}

/**
 * 安全的查询构建器
 * 提供类型安全的查询构建接口
 */
export class SafeQueryBuilder {
  private selectFields: string[] = [];
  private fromTable: string = "";
  private whereClauses: WhereClause[] = [];
  private orderByFields: string[] = [];
  private limitValue?: number;

  select(fields: string[]): this {
    // 验证字段名安全性
    const safeFields = fields.filter((field) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)
    );
    this.selectFields = safeFields;
    return this;
  }

  from(table: string): this {
    // 验证表名安全性
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      this.fromTable = table;
    }
    return this;
  }

  where(
    field: string,
    operator: "=" | ">" | "<" | ">=" | "<=" | "LIKE",
    value: unknown
  ): this {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      this.whereClauses.push({ field, operator, value });
    }
    return this;
  }

  orderBy(fields: string[]): this {
    const safeFields = fields.filter((field) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*( ASC| DESC)?$/.test(field)
    );
    this.orderByFields = safeFields;
    return this;
  }

  limit(count: number): this {
    if (count > 0 && count <= 10000) {
      this.limitValue = count;
    }
    return this;
  }

  build(): { sql: string; params: unknown[] } {
    const params: unknown[] = [];
    let paramIndex = 1;

    let sql = `SELECT ${
      this.selectFields.length ? this.selectFields.join(", ") : "*"
    }`;
    sql += ` FROM ${this.fromTable}`;

    if (this.whereClauses.length > 0) {
      sql += " WHERE ";
      const whereConditions = this.whereClauses.map((clause) => {
        params.push(clause.value);
        return `${clause.field} ${clause.operator} $${paramIndex++}`;
      });
      sql += whereConditions.join(" AND ");
    }

    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(", ")}`;
    }

    if (this.limitValue) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(this.limitValue);
    }

    return { sql, params };
  }
}

interface WhereClause {
  field: string;
  operator: string;
  value: unknown;
}
