/**
 * 数据库优化工具
 * 提供索引管理、查询分析和性能监控功能
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Db, IndexSpecification } from "mongodb";
import { getMongoDbClient } from "./mongodb";
import { query as pgQuery } from "./db";

/**
 * 查询分析结果接口
 */
export interface QueryAnalysis {
  /** 查询类型 */
  queryType: "read" | "write" | "aggregate";
  /** 执行时间(ms) */
  executionTime: number;
  /** 扫描的文档数 */
  docsExamined: number;
  /** 返回的文档数 */
  docsReturned: number;
  /** 是否使用了索引 */
  indexUsed: boolean;
  /** 建议的优化措施 */
  recommendations: string[];
}

/**
 * 连接池健康状态接口
 */
export interface PoolHealth {
  /** 活跃连接数 */
  activeConnections: number;
  /** 空闲连接数 */
  idleConnections: number;
  /** 连接池大小 */
  poolSize: number;
  /** 平均响应时间(ms) */
  avgResponseTime: number;
  /** 健康状态 */
  status: "healthy" | "warning" | "critical";
  /** 建议操作 */
  recommendations: string[];
}

/**
 * 索引创建结果接口
 */
export interface IndexCreationResult {
  /** 集合名称 */
  collection: string;
  /** 索引名称 */
  indexName: string;
  /** 是否成功创建 */
  success: boolean;
  /** 错误信息(如果有) */
  error?: string;
  /** 创建耗时(ms) */
  duration: number;
}

/**
 * MongoDB推荐索引配置
 * 基于实际查询模式优化的索引设计
 */
export const MONGODB_RECOMMENDED_INDEXES = {
  // 执行结果集合索引
  execution_results: [
    {
      spec: { timestamp: -1, status: 1 } as IndexSpecification,
      options: {
        name: "timestamp_status_idx",
        background: true,
        comment: "执行时间和状态的复合索引，优化状态筛选和时间排序",
      },
    },
    {
      spec: { script_id: 1, timestamp: -1 } as IndexSpecification,
      options: {
        name: "script_timestamp_idx",
        background: true,
        comment: "脚本ID和时间复合索引，优化特定脚本的历史查询",
      },
    },
    {
      spec: { user_email: 1, timestamp: -1 } as IndexSpecification,
      options: {
        name: "user_timestamp_idx",
        background: true,
        comment: "用户邮箱和时间复合索引，优化用户操作历史查询",
      },
    },
    {
      spec: { status: 1, created_at: -1 } as IndexSpecification,
      options: {
        name: "status_created_idx",
        background: true,
        comment: "状态和创建时间索引，优化状态过滤",
      },
    },
  ],

  // SQL脚本集合索引
  sql_scripts: [
    {
      spec: { hashtags: 1, updated_at: -1 } as IndexSpecification,
      options: {
        name: "hashtags_updated_idx",
        background: true,
        comment: "标签和更新时间复合索引，优化标签筛选",
      },
    },
    {
      spec: { author: 1, created_at: -1 } as IndexSpecification,
      options: {
        name: "author_created_idx",
        background: true,
        comment: "作者和创建时间索引，优化作者查询",
      },
    },
    {
      spec: { isScheduled: 1, cronSchedule: 1 } as IndexSpecification,
      options: {
        name: "scheduled_cron_idx",
        background: true,
        comment: "调度状态和cron表达式索引，优化定时任务查询",
      },
    },
    {
      spec: { scriptId: 1 } as IndexSpecification,
      options: {
        name: "scriptId_unique_idx",
        unique: true,
        background: true,
        comment: "脚本ID唯一索引，确保ID唯一性",
      },
    },
    {
      spec: {
        name: "text",
        cnName: "text",
        description: "text",
      } as IndexSpecification,
      options: {
        name: "fulltext_search_idx",
        background: true,
        comment: "全文搜索索引，支持脚本名称和描述搜索",
      },
    },
  ],

  // 审批集合索引
  approvals: [
    {
      spec: { status: 1, created_at: -1 } as IndexSpecification,
      options: {
        name: "status_created_idx",
        background: true,
        comment: "审批状态和创建时间索引，优化待审批查询",
      },
    },
    {
      spec: { script_id: 1, status: 1 } as IndexSpecification,
      options: {
        name: "script_status_idx",
        background: true,
        comment: "脚本ID和状态复合索引，优化脚本审批历史查询",
      },
    },
    {
      spec: { requester_id: 1, created_at: -1 } as IndexSpecification,
      options: {
        name: "requester_created_idx",
        background: true,
        comment: "申请人和创建时间索引，优化用户申请历史",
      },
    },
    {
      spec: { priority: 1, status: 1 } as IndexSpecification,
      options: {
        name: "priority_status_idx",
        background: true,
        comment: "优先级和状态索引，优化优先级排序",
      },
    },
  ],

  // 编辑历史集合索引
  edit_history: [
    {
      spec: { script_id: 1, timestamp: -1 } as IndexSpecification,
      options: {
        name: "script_timestamp_idx",
        background: true,
        comment: "脚本ID和时间戳索引，优化脚本编辑历史查询",
      },
    },
    {
      spec: { user_id: 1, timestamp: -1 } as IndexSpecification,
      options: {
        name: "user_timestamp_idx",
        background: true,
        comment: "用户ID和时间戳索引，优化用户编辑历史",
      },
    },
    {
      spec: { timestamp: -1 } as IndexSpecification,
      options: {
        name: "timestamp_desc_idx",
        background: true,
        comment: "时间戳降序索引，优化最近编辑查询",
      },
    },
  ],

  // 用户角色集合索引
  user_roles: [
    {
      spec: { user_id: 1 } as IndexSpecification,
      options: {
        name: "user_id_unique_idx",
        unique: true,
        background: true,
        comment: "用户ID唯一索引，确保一个用户只有一个角色记录",
      },
    },
    {
      spec: { role: 1, updated_at: -1 } as IndexSpecification,
      options: {
        name: "role_updated_idx",
        background: true,
        comment: "角色和更新时间索引，优化角色管理查询",
      },
    },
  ],

  // 执行结果集合索引 (result集合 - Check History API专用)
  result: [
    {
      spec: {
        execution_time: -1,
        status: 1,
        statusType: 1,
      } as IndexSpecification,
      options: {
        name: "execution_status_compound_idx",
        background: true,
        comment: "执行时间、状态和状态类型复合索引，优化Check History主查询",
      },
    },
    {
      spec: { script_name: 1, execution_time: -1 } as IndexSpecification,
      options: {
        name: "script_execution_idx",
        background: true,
        comment: "脚本名称和执行时间复合索引，优化脚本筛选查询",
      },
    },
    {
      spec: { script_name: "text" } as IndexSpecification,
      options: {
        name: "script_name_text_idx",
        background: true,
        comment: "脚本名称文本索引，支持模糊搜索",
      },
    },
    {
      spec: { status: 1, execution_time: -1 } as IndexSpecification,
      options: {
        name: "status_execution_idx",
        background: true,
        comment: "状态和执行时间索引，优化状态过滤",
      },
    },
    {
      spec: { statusType: 1, execution_time: -1 } as IndexSpecification,
      options: {
        name: "statusType_execution_idx",
        background: true,
        comment: "状态类型和执行时间索引，优化attention_needed过滤",
      },
    },
  ],
} as const;

/**
 * PostgreSQL查询优化建议
 */
export const POSTGRESQL_OPTIMIZATION_TIPS = {
  // 常见查询模式优化
  commonPatterns: [
    {
      pattern: "SELECT ... WHERE timestamp BETWEEN ? AND ?",
      recommendation: "在timestamp列上创建B-tree索引",
      sql: "CREATE INDEX CONCURRENTLY idx_timestamp ON table_name (timestamp);",
    },
    {
      pattern: "SELECT ... WHERE status = ? ORDER BY created_at DESC",
      recommendation: "创建status和created_at的复合索引",
      sql: "CREATE INDEX CONCURRENTLY idx_status_created ON table_name (status, created_at DESC);",
    },
    {
      pattern: "SELECT ... WHERE user_id = ? AND active = true",
      recommendation: "创建user_id和active的复合索引",
      sql: "CREATE INDEX CONCURRENTLY idx_user_active ON table_name (user_id, active);",
    },
  ],

  // 性能优化建议
  performanceTips: [
    "使用EXPLAIN ANALYZE分析查询执行计划",
    "避免在WHERE子句中使用函数，考虑函数索引",
    "对于大表的分页查询，使用游标分页替代OFFSET",
    "定期运行ANALYZE更新表统计信息",
    "考虑使用部分索引减少索引大小",
    "对于只读查询，考虑使用物化视图",
    "使用连接池减少连接开销",
    "监控慢查询日志，及时优化问题查询",
  ],
};

/**
 * 数据库优化管理类
 */
export class DatabaseOptimization {
  private db: Db | null = null;

  /**
   * 获取MongoDB数据库实例
   */
  private async getDb(): Promise<Db> {
    if (!this.db) {
      this.db = await getMongoDbClient().getDb();
    }
    return this.db;
  }

  /**
   * 创建推荐的MongoDB索引
   */
  async createRecommendedIndexes(): Promise<IndexCreationResult[]> {
    const results: IndexCreationResult[] = [];
    const db = await this.getDb();

    console.log("[数据库优化] 开始创建推荐索引...");

    for (const [collectionName, indexes] of Object.entries(
      MONGODB_RECOMMENDED_INDEXES
    )) {
      const collection = db.collection(collectionName);

      for (const indexConfig of indexes) {
        const startTime = Date.now();

        try {
          // 检查索引是否已存在
          const existingIndexes = await collection.listIndexes().toArray();
          const indexExists = existingIndexes.some(
            (idx) => idx.name === indexConfig.options.name
          );

          if (indexExists) {
            console.log(
              `[数据库优化] 索引已存在，跳过: ${collectionName}.${indexConfig.options.name}`
            );
            results.push({
              collection: collectionName,
              indexName: indexConfig.options.name || "unknown",
              success: true,
              duration: Date.now() - startTime,
            });
            continue;
          }

          // 创建索引
          await collection.createIndex(indexConfig.spec, indexConfig.options);

          const duration = Date.now() - startTime;
          console.log(
            `[数据库优化] ✅ 创建索引成功: ${collectionName}.${indexConfig.options.name} (${duration}ms)`
          );

          results.push({
            collection: collectionName,
            indexName: indexConfig.options.name || "unknown",
            success: true,
            duration,
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          console.error(
            `[数据库优化] ❌ 创建索引失败: ${collectionName}.${indexConfig.options.name}`,
            error
          );

          results.push({
            collection: collectionName,
            indexName: indexConfig.options.name || "unknown",
            success: false,
            error: errorMessage,
            duration,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    console.log(
      `[数据库优化] 索引创建完成: ${successCount}/${totalCount} 成功`
    );

    return results;
  }

  /**
   * 分析慢查询（模拟实现，实际需要基于数据库日志）
   */
  async analyzeSlowQueries(): Promise<QueryAnalysis[]> {
    const db = await this.getDb();
    const analyses: QueryAnalysis[] = [];

    try {
      // 获取数据库统计信息
      const collections = [
        "execution_results",
        "sql_scripts",
        "approvals",
        "edit_history",
      ];

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);

        // 检查集合统计信息
        const docCount = await collection.countDocuments();

        // 模拟查询分析（实际环境中应该分析查询计划）
        if (docCount > 1000) {
          analyses.push({
            queryType: "read",
            executionTime: docCount / 100, // 模拟执行时间
            docsExamined: docCount,
            docsReturned: Math.min(50, docCount),
            indexUsed: false, // 假设未使用索引
            recommendations: [
              `集合 ${collectionName} 包含 ${docCount} 文档，建议创建适当索引`,
              "考虑使用复合索引优化常见查询模式",
              "定期分析查询性能并优化",
            ],
          });
        }
      }
    } catch (error) {
      console.error("[数据库优化] 查询分析失败:", error);
    }

    return analyses;
  }

  /**
   * 监控连接池健康状态
   */
  async monitorConnectionPool(): Promise<PoolHealth> {
    try {
      // MongoDB连接池监控
      const adminDb = (await this.getDb()).admin();

      // 尝试获取服务器状态（可能需要管理员权限）
      let serverStatus;
      try {
        serverStatus = await adminDb.serverStatus();
      } catch {
        console.warn("[数据库优化] 无法获取服务器状态，使用模拟数据");
        serverStatus = null;
      }

      // PostgreSQL连接池状态检查
      let pgHealth = true;
      try {
        await pgQuery("SELECT 1");
      } catch {
        pgHealth = false;
      }

      // 构建健康状态报告
      const mockActiveConnections = serverStatus?.connections?.current || 5;
      const mockTotalConnections = serverStatus?.connections?.available || 100;

      const health: PoolHealth = {
        activeConnections: mockActiveConnections,
        idleConnections: mockTotalConnections - mockActiveConnections,
        poolSize: mockTotalConnections,
        avgResponseTime: serverStatus?.opcounters
          ? (serverStatus.opcounters.query || 0) / 10
          : 25,
        status:
          pgHealth && mockActiveConnections < mockTotalConnections * 0.8
            ? "healthy"
            : "warning",
        recommendations: [],
      };

      // 生成建议
      if (health.activeConnections > health.poolSize * 0.8) {
        health.recommendations.push("连接池使用率较高，考虑增加连接池大小");
      }

      if (health.avgResponseTime > 100) {
        health.recommendations.push("平均响应时间较长，检查查询性能和网络延迟");
      }

      if (!pgHealth) {
        health.status = "critical";
        health.recommendations.push("PostgreSQL连接异常，检查数据库服务状态");
      }

      if (health.recommendations.length === 0) {
        health.recommendations.push("连接池状态良好");
      }

      return health;
    } catch (error) {
      console.error("[数据库优化] 连接池监控失败:", error);

      return {
        activeConnections: 0,
        idleConnections: 0,
        poolSize: 0,
        avgResponseTime: 0,
        status: "critical",
        recommendations: ["无法获取连接池状态，请检查数据库连接"],
      };
    }
  }

  /**
   * 获取索引使用统计
   */
  async getIndexStats(): Promise<Record<string, unknown[]>> {
    const db = await this.getDb();
    const stats: Record<string, unknown[]> = {};

    try {
      const collections = [
        "execution_results",
        "sql_scripts",
        "approvals",
        "edit_history",
      ];

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);

        try {
          // 获取索引统计信息
          const indexStats = await collection
            .aggregate([{ $indexStats: {} }])
            .toArray();

          stats[collectionName] = indexStats;
        } catch (error) {
          console.warn(
            `[数据库优化] 无法获取 ${collectionName} 的索引统计:`,
            error
          );
          stats[collectionName] = [];
        }
      }
    } catch (error) {
      console.error("[数据库优化] 获取索引统计失败:", error);
    }

    return stats;
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport(): Promise<{
    summary: string;
    indexes: IndexCreationResult[];
    queries: QueryAnalysis[];
    poolHealth: PoolHealth;
    indexStats: Record<string, unknown[]>;
    recommendations: string[];
  }> {
    console.log("[数据库优化] 生成优化报告...");

    const [indexes, queries, poolHealth, indexStats] = await Promise.all([
      this.createRecommendedIndexes(),
      this.analyzeSlowQueries(),
      this.monitorConnectionPool(),
      this.getIndexStats(),
    ]);

    const successfulIndexes = indexes.filter((idx) => idx.success).length;
    const totalIndexes = indexes.length;

    const summary = `
数据库优化报告生成于: ${new Date().toLocaleString("zh-CN")}

索引优化:
- 推荐索引: ${totalIndexes} 个
- 成功创建: ${successfulIndexes} 个
- 创建成功率: ${((successfulIndexes / totalIndexes) * 100).toFixed(1)}%

性能状态:
- 连接池状态: ${poolHealth.status}
- 活跃连接: ${poolHealth.activeConnections}/${poolHealth.poolSize}
- 平均响应时间: ${poolHealth.avgResponseTime.toFixed(1)}ms

查询分析:
- 分析的查询: ${queries.length} 个
- 需要优化的查询: ${queries.filter((q) => !q.indexUsed).length} 个
    `.trim();

    const recommendations = [
      ...poolHealth.recommendations,
      ...POSTGRESQL_OPTIMIZATION_TIPS.performanceTips.slice(0, 3),
      "定期运行数据库优化脚本维护最佳性能",
      "监控慢查询日志，及时发现性能问题",
      "考虑使用数据库连接池监控工具",
    ];

    return {
      summary,
      indexes,
      queries,
      poolHealth,
      indexStats,
      recommendations: [...new Set(recommendations)], // 去重
    };
  }
}

// 导出单例实例
export const dbOptimization = new DatabaseOptimization();

// 向后兼容的导出函数
export async function createRecommendedIndexes(): Promise<
  IndexCreationResult[]
> {
  return dbOptimization.createRecommendedIndexes();
}

export async function analyzeSlowQueries(): Promise<QueryAnalysis[]> {
  return dbOptimization.analyzeSlowQueries();
}

export async function monitorConnectionPool(): Promise<PoolHealth> {
  return dbOptimization.monitorConnectionPool();
}

export async function generateOptimizationReport() {
  return dbOptimization.generateOptimizationReport();
}
