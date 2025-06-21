/**
 * 智能Redis缓存策略管理
 * 提供分层缓存、智能失效机制和性能监控
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

import redis from "./redis";

/**
 * 缓存数据访问频率分类
 */
export enum CacheAccessPattern {
  /** 热数据 - 高频访问，短TTL */
  HOT = "HOT",
  /** 温数据 - 中频访问，中等TTL */
  WARM = "WARM",
  /** 冷数据 - 低频访问，长TTL */
  COLD = "COLD",
  /** 静态数据 - 很少变化，超长TTL */
  STATIC = "STATIC",
}

/**
 * 缓存策略配置接口
 */
export interface CacheStrategyConfig {
  /** 数据类型标识 */
  pattern: string;
  /** 缓存TTL（秒） */
  ttl: number;
  /** 访问模式 */
  accessPattern: CacheAccessPattern;
  /** 描述信息 */
  description: string;
  /** 是否启用压缩 */
  compression?: boolean;
  /** 最大存储大小(KB) */
  maxSize?: number;
  /** 自动刷新阈值（访问次数） */
  autoRefreshThreshold?: number;
}

/**
 * 缓存性能统计接口
 */
export interface CachePerformanceStats {
  /** 缓存命中率 */
  hitRate: number;
  /** 缓存未命中率 */
  missRate: number;
  /** 总访问次数 */
  totalAccess: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 平均响应时间(ms) */
  avgResponseTime: number;
  /** 内存使用量(KB) */
  memoryUsage: number;
  /** 活跃键数量 */
  activeKeys: number;
}

/**
 * 智能缓存策略配置
 * 基于实际业务场景优化的缓存策略
 */
export const INTELLIGENT_CACHE_STRATEGIES: Record<string, CacheStrategyConfig> =
  {
    // 热数据 - 高频访问，短TTL，快速响应
    DASHBOARD_STATS: {
      pattern: "stats:dashboard:*",
      ttl: 120, // 2分钟
      accessPattern: CacheAccessPattern.HOT,
      description: "Dashboard统计数据 - 实时更新，高频访问",
      compression: false, // 不压缩，优先速度
      maxSize: 50, // 50KB
      autoRefreshThreshold: 100, // 访问100次后自动刷新
    },

    EXECUTION_RESULTS_RECENT: {
      pattern: "exec:recent:*",
      ttl: 300, // 5分钟
      accessPattern: CacheAccessPattern.HOT,
      description: "最近执行结果 - 用户常查看",
      compression: false,
      maxSize: 100,
      autoRefreshThreshold: 50,
    },

    CHECK_HISTORY_PAGINATED: {
      pattern: "history:page:*",
      ttl: 180, // 3分钟
      accessPattern: CacheAccessPattern.HOT,
      description: "分页的检查历史 - 频繁翻页",
      compression: true, // 压缩以节省空间
      maxSize: 200,
      autoRefreshThreshold: 30,
    },

    // 温数据 - 中频访问，中等TTL，平衡性能
    SCRIPT_LIST: {
      pattern: "scripts:list:*",
      ttl: 600, // 10分钟
      accessPattern: CacheAccessPattern.WARM,
      description: "脚本列表 - 定期查看和更新",
      compression: true,
      maxSize: 500,
      autoRefreshThreshold: 20,
    },

    USER_PERMISSIONS: {
      pattern: "perms:user:*",
      ttl: 900, // 15分钟
      accessPattern: CacheAccessPattern.WARM,
      description: "用户权限信息 - 会话期间使用",
      compression: false,
      maxSize: 30,
      autoRefreshThreshold: 10,
    },

    APPROVAL_QUEUE: {
      pattern: "approvals:queue:*",
      ttl: 450, // 7.5分钟
      accessPattern: CacheAccessPattern.WARM,
      description: "审批队列 - 管理员定期查看",
      compression: true,
      maxSize: 150,
      autoRefreshThreshold: 15,
    },

    EDIT_HISTORY: {
      pattern: "edit:history:*",
      ttl: 1200, // 20分钟
      accessPattern: CacheAccessPattern.WARM,
      description: "编辑历史 - 按需查看",
      compression: true,
      maxSize: 300,
      autoRefreshThreshold: 8,
    },

    // 冷数据 - 低频访问，长TTL，节省资源
    SCHEMA_INFO: {
      pattern: "schema:db:*",
      ttl: 3600, // 1小时
      accessPattern: CacheAccessPattern.COLD,
      description: "数据库表结构信息 - 很少变化",
      compression: true,
      maxSize: 1000,
      autoRefreshThreshold: 5,
    },

    ANALYTICS_MONTHLY: {
      pattern: "analytics:monthly:*",
      ttl: 7200, // 2小时
      accessPattern: CacheAccessPattern.COLD,
      description: "月度分析数据 - 定期生成",
      compression: true,
      maxSize: 2000,
      autoRefreshThreshold: 3,
    },

    USER_ROLES_MAPPING: {
      pattern: "roles:mapping:*",
      ttl: 1800, // 30分钟
      accessPattern: CacheAccessPattern.COLD,
      description: "用户角色映射 - 不频繁变化",
      compression: true,
      maxSize: 100,
      autoRefreshThreshold: 5,
    },

    // 静态数据 - 极少变化，超长TTL
    SYSTEM_CONFIG: {
      pattern: "config:system:*",
      ttl: 14400, // 4小时
      accessPattern: CacheAccessPattern.STATIC,
      description: "系统配置 - 很少修改",
      compression: true,
      maxSize: 50,
      autoRefreshThreshold: 1,
    },

    APP_METADATA: {
      pattern: "meta:app:*",
      ttl: 21600, // 6小时
      accessPattern: CacheAccessPattern.STATIC,
      description: "应用元数据 - 基本不变",
      compression: true,
      maxSize: 20,
      autoRefreshThreshold: 1,
    },
  };

/**
 * 缓存失效策略映射
 * 定义不同操作触发的缓存失效模式
 */
export const CACHE_INVALIDATION_PATTERNS: Record<string, string[]> = {
  // 脚本相关操作
  script_create: ["scripts:list:*", "stats:dashboard:*", "analytics:*"],
  script_update: [
    "scripts:list:*",
    "scripts:detail:*",
    "edit:history:*",
    "stats:dashboard:*",
  ],
  script_delete: [
    "scripts:list:*",
    "scripts:detail:*",
    "stats:dashboard:*",
    "analytics:*",
  ],

  // 执行相关操作
  execution_start: ["exec:recent:*", "stats:dashboard:*", "history:page:*"],
  execution_complete: [
    "exec:recent:*",
    "stats:dashboard:*",
    "history:page:*",
    "analytics:*",
  ],

  // 用户权限操作
  user_role_change: ["perms:user:*", "roles:mapping:*"],

  // 审批操作
  approval_submit: ["approvals:queue:*", "stats:dashboard:*"],
  approval_process: [
    "approvals:queue:*",
    "scripts:list:*",
    "stats:dashboard:*",
  ],

  // 系统配置操作
  config_update: ["config:system:*", "meta:app:*"],
};

/**
 * 智能缓存管理器
 */
export class IntelligentCacheManager {
  private performanceStats: Map<string, CachePerformanceStats> = new Map();
  private accessCounts: Map<string, number> = new Map();

  /**
   * 获取缓存策略配置
   */
  getCacheStrategy(dataType: string): CacheStrategyConfig | null {
    return INTELLIGENT_CACHE_STRATEGIES[dataType] || null;
  }

  /**
   * 智能缓存设置
   * 根据数据类型自动选择最优策略
   */
  async setIntelligent(
    key: string,
    value: unknown,
    dataType?: string
  ): Promise<boolean> {
    try {
      // 自动检测数据类型
      const detectedType = dataType || this.detectDataType(key);
      const strategy = this.getCacheStrategy(detectedType);

      if (!strategy) {
        // 使用默认策略
        await redis.setex(key, 300, JSON.stringify(value)); // 5分钟默认
        return true;
      }

      // 应用压缩（如果启用）
      const serializedValue = strategy.compression
        ? this.compressValue(value)
        : JSON.stringify(value);

      // 检查大小限制
      if (
        strategy.maxSize &&
        this.getValueSize(serializedValue) > strategy.maxSize * 1024
      ) {
        console.warn(
          `[缓存] 值大小超过限制: ${key} (${this.getValueSize(
            serializedValue
          )}KB > ${strategy.maxSize}KB)`
        );
        return false;
      }

      // 设置缓存
      await redis.setex(key, strategy.ttl, serializedValue);

      // 记录访问统计
      this.recordCacheSet(key, strategy);

      console.log(
        `[缓存] 智能设置: ${key} (${strategy.accessPattern}, TTL: ${strategy.ttl}s)`
      );
      return true;
    } catch (error) {
      console.error(`[缓存] 设置失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 智能缓存获取
   * 支持性能统计和自动刷新
   */
  async getIntelligent<T>(
    key: string,
    refreshFunction?: () => Promise<T>,
    dataType?: string
  ): Promise<T | null> {
    const startTime = Date.now();

    try {
      // 尝试获取缓存
      const cachedValue = await redis.get(key);
      const responseTime = Date.now() - startTime;

      if (cachedValue !== null && typeof cachedValue === "string") {
        // 缓存命中
        this.recordCacheHit(key, responseTime);

        // 检查是否需要自动刷新
        if (refreshFunction && this.shouldAutoRefresh(key, dataType)) {
          // 异步刷新，不阻塞当前请求
          this.refreshCacheAsync(key, refreshFunction, dataType);
        }

        // 解压缩（如果需要）
        const strategy = dataType ? this.getCacheStrategy(dataType) : null;
        return strategy?.compression
          ? this.decompressValue(cachedValue)
          : JSON.parse(cachedValue);
      } else {
        // 缓存未命中
        this.recordCacheMiss(key, responseTime);

        if (refreshFunction) {
          // 获取新数据并缓存
          const freshData = await refreshFunction();
          await this.setIntelligent(key, freshData, dataType);
          return freshData;
        }

        return null;
      }
    } catch (error) {
      console.error(`[缓存] 获取失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 智能缓存失效
   * 根据操作类型批量失效相关缓存
   */
  async invalidateByOperation(
    operation: string,
    entityId?: string
  ): Promise<number> {
    const patterns = CACHE_INVALIDATION_PATTERNS[operation];
    if (!patterns) {
      console.warn(`[缓存] 未知操作类型: ${operation}`);
      return 0;
    }

    let deletedCount = 0;

    for (const pattern of patterns) {
      try {
        // 如果有实体ID，替换通配符
        const searchPattern = entityId
          ? pattern.replace("*", entityId)
          : pattern;

        // 获取匹配的键
        const keys = await redis.keys(searchPattern);

        if (keys.length > 0) {
          // 批量删除
          await redis.del(...keys);
          deletedCount += keys.length;

          console.log(
            `[缓存] 操作 ${operation} 失效缓存: ${keys.length} 个键 (${searchPattern})`
          );
        }
      } catch (error) {
        console.error(`[缓存] 失效模式失败: ${pattern}`, error);
      }
    }

    console.log(`[缓存] 操作 ${operation} 总共失效: ${deletedCount} 个缓存键`);
    return deletedCount;
  }

  /**
   * 获取缓存性能统计
   */
  getPerformanceStats(
    dataType?: string
  ): CachePerformanceStats | Record<string, CachePerformanceStats> {
    if (dataType) {
      return this.performanceStats.get(dataType) || this.createEmptyStats();
    }

    // 返回所有统计信息
    const allStats: Record<string, CachePerformanceStats> = {};
    for (const [type, stats] of this.performanceStats.entries()) {
      allStats[type] = stats;
    }

    return allStats;
  }

  /**
   * 生成缓存健康报告
   */
  async generateHealthReport(): Promise<{
    summary: string;
    strategies: Record<string, CacheStrategyConfig>;
    performance: Record<string, CachePerformanceStats>;
    recommendations: string[];
    redisInfo: {
      usedMemory: string;
      totalKeys: number;
      hitRate: number;
    };
  }> {
    try {
      // 获取Redis信息
      const redisInfo = await this.getRedisInfo();

      // 计算整体命中率
      const allStats = this.getPerformanceStats() as Record<
        string,
        CachePerformanceStats
      >;
      const overallHitRate = this.calculateOverallHitRate(allStats);

      // 生成建议
      const recommendations = this.generateRecommendations(allStats, redisInfo);

      const summary = `
缓存健康报告生成于: ${new Date().toLocaleString("zh-CN")}

整体性能:
- 缓存策略数量: ${Object.keys(INTELLIGENT_CACHE_STRATEGIES).length} 个
- 整体命中率: ${(overallHitRate * 100).toFixed(2)}%
- Redis内存使用: ${redisInfo.usedMemory}
- 活跃缓存键: ${redisInfo.totalKeys} 个

性能状态: ${
        overallHitRate > 0.8
          ? "✅ 优秀"
          : overallHitRate > 0.6
          ? "⚠️ 良好"
          : "❌ 需优化"
      }
      `.trim();

      return {
        summary,
        strategies: INTELLIGENT_CACHE_STRATEGIES,
        performance: allStats,
        recommendations,
        redisInfo,
      };
    } catch (error) {
      console.error("[缓存] 生成健康报告失败:", error);
      return {
        summary: "缓存健康报告生成失败",
        strategies: INTELLIGENT_CACHE_STRATEGIES,
        performance: {},
        recommendations: ["检查Redis连接状态", "确认缓存配置正确"],
        redisInfo: {
          usedMemory: "N/A",
          totalKeys: 0,
          hitRate: 0,
        },
      };
    }
  }

  /**
   * 数据类型自动检测
   */
  private detectDataType(key: string): string {
    // 根据键名模式检测数据类型
    for (const [dataType, config] of Object.entries(
      INTELLIGENT_CACHE_STRATEGIES
    )) {
      const pattern = config.pattern.replace("*", "");
      if (key.includes(pattern)) {
        return dataType;
      }
    }

    return "DEFAULT"; // 默认类型
  }

  /**
   * 值压缩（简单的JSON压缩）
   */
  private compressValue(value: unknown): string {
    const jsonString = JSON.stringify(value);
    // 这里可以集成真正的压缩算法，如gzip
    // 目前只是移除多余空格
    return jsonString.replace(/\s+/g, "");
  }

  /**
   * 值解压缩
   */
  private decompressValue<T>(compressedValue: string): T {
    // 对应compressValue的解压缩
    return JSON.parse(compressedValue);
  }

  /**
   * 获取值大小（字节）
   */
  private getValueSize(value: string): number {
    return new TextEncoder().encode(value).length;
  }

  /**
   * 检查是否应该自动刷新
   */
  private shouldAutoRefresh(key: string, dataType?: string): boolean {
    if (!dataType) return false;

    const strategy = this.getCacheStrategy(dataType);
    if (!strategy?.autoRefreshThreshold) return false;

    const accessCount = this.accessCounts.get(key) || 0;
    return accessCount >= strategy.autoRefreshThreshold;
  }

  /**
   * 异步刷新缓存
   */
  private async refreshCacheAsync<T>(
    key: string,
    refreshFunction: () => Promise<T>,
    dataType?: string
  ): Promise<void> {
    try {
      console.log(`[缓存] 自动刷新: ${key}`);
      const freshData = await refreshFunction();
      await this.setIntelligent(key, freshData, dataType);

      // 重置访问计数
      this.accessCounts.set(key, 0);
    } catch (error) {
      console.error(`[缓存] 自动刷新失败: ${key}`, error);
    }
  }

  /**
   * 记录缓存设置
   */
  private recordCacheSet(key: string, strategy: CacheStrategyConfig): void {
    // 这里可以记录设置统计
    console.log(`[缓存统计] 设置: ${key} (${strategy.accessPattern})`);
  }

  /**
   * 记录缓存命中
   */
  private recordCacheHit(key: string, responseTime: number): void {
    const dataType = this.detectDataType(key);
    const stats =
      this.performanceStats.get(dataType) || this.createEmptyStats();

    stats.hits++;
    stats.totalAccess++;
    stats.hitRate = stats.hits / stats.totalAccess;
    stats.missRate = 1 - stats.hitRate;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;

    this.performanceStats.set(dataType, stats);

    // 增加访问计数
    const currentCount = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, currentCount + 1);
  }

  /**
   * 记录缓存未命中
   */
  private recordCacheMiss(key: string, responseTime: number): void {
    const dataType = this.detectDataType(key);
    const stats =
      this.performanceStats.get(dataType) || this.createEmptyStats();

    stats.misses++;
    stats.totalAccess++;
    stats.hitRate = stats.hits / stats.totalAccess;
    stats.missRate = 1 - stats.hitRate;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;

    this.performanceStats.set(dataType, stats);
  }

  /**
   * 创建空的性能统计
   */
  private createEmptyStats(): CachePerformanceStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalAccess: 0,
      hits: 0,
      misses: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      activeKeys: 0,
    };
  }

  /**
   * 获取Redis信息
   */
  private async getRedisInfo(): Promise<{
    usedMemory: string;
    totalKeys: number;
    hitRate: number;
  }> {
    try {
      const totalKeys = await redis.dbsize();

      return {
        usedMemory: "N/A", // Upstash不支持memory命令
        totalKeys: totalKeys || 0,
        hitRate: 0.85, // 模拟数据，实际应该从Redis INFO获取
      };
    } catch (error) {
      console.error("[缓存] 获取Redis信息失败:", error);
      return {
        usedMemory: "N/A",
        totalKeys: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * 计算整体命中率
   */
  private calculateOverallHitRate(
    stats: Record<string, CachePerformanceStats>
  ): number {
    let totalHits = 0;
    let totalAccess = 0;

    for (const stat of Object.values(stats)) {
      totalHits += stat.hits;
      totalAccess += stat.totalAccess;
    }

    return totalAccess > 0 ? totalHits / totalAccess : 0;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    stats: Record<string, CachePerformanceStats>,
    redisInfo: { usedMemory: string; totalKeys: number; hitRate: number }
  ): string[] {
    const recommendations: string[] = [];

    // 基于命中率的建议
    for (const [dataType, stat] of Object.entries(stats)) {
      if (stat.hitRate < 0.5) {
        recommendations.push(
          `${dataType} 缓存命中率较低 (${(stat.hitRate * 100).toFixed(
            1
          )}%)，考虑调整TTL或缓存策略`
        );
      }

      if (stat.avgResponseTime > 100) {
        recommendations.push(
          `${dataType} 缓存响应时间较长 (${stat.avgResponseTime.toFixed(
            1
          )}ms)，检查数据大小和压缩策略`
        );
      }
    }

    // 基于Redis状态的建议
    if (redisInfo.totalKeys > 10000) {
      recommendations.push(
        `Redis键数量较多 (${redisInfo.totalKeys})，建议定期清理过期键`
      );
    }

    if (redisInfo.hitRate < 0.7) {
      recommendations.push(`Redis整体命中率偏低，考虑增加内存或优化缓存策略`);
    }

    if (recommendations.length === 0) {
      recommendations.push("缓存性能良好，继续保持当前策略");
    }

    return recommendations;
  }
}

// 导出单例实例
export const cacheManager = new IntelligentCacheManager();

// 向后兼容的便捷函数
export async function setCache(
  key: string,
  value: unknown,
  ttl?: number
): Promise<boolean> {
  if (ttl) {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  }
  return cacheManager.setIntelligent(key, value);
}

export async function getCache<T>(key: string): Promise<T | null> {
  return cacheManager.getIntelligent<T>(key);
}

export async function invalidateCache(
  operation: string,
  entityId?: string
): Promise<number> {
  return cacheManager.invalidateByOperation(operation, entityId);
}

export async function getCacheHealth() {
  return cacheManager.generateHealthReport();
}

/**
 * API 缓存辅助函数
 * 将现有 API 迁移到智能缓存管理器的便捷方法
 */
export async function withSmartCache<T>(
  key: string,
  dataType: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 尝试从缓存获取
  const cached = await cacheManager.getIntelligent<T>(key, fetchFn, dataType);

  if (cached !== null) {
    return cached;
  }

  // 缓存未命中，执行获取函数
  const data = await fetchFn();

  // 存储到缓存
  await cacheManager.setIntelligent(key, data, dataType);

  return data;
}

/**
 * 生成标准化的缓存键
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, string | number | boolean> = {}
): string {
  const sortedParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("&");

  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}
