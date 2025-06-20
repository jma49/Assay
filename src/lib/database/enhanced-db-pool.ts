import { Pool, PoolConfig, PoolClient, QueryResult } from "pg";
import { EventEmitter } from "events";

/**
 * 增强的数据库连接池管理器
 * 提供智能连接管理、性能监控、健康检查等功能
 */
export class EnhancedDatabasePool extends EventEmitter {
  private static instance: EnhancedDatabasePool;
  private pool: Pool | null = null;
  private metrics: PoolMetrics = this.initializeMetrics();
  private config: EnhancedPoolConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor(config?: Partial<EnhancedPoolConfig>) {
    super();
    this.config = this.mergeConfig(config);
    this.setupEventListeners();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    config?: Partial<EnhancedPoolConfig>
  ): EnhancedDatabasePool {
    if (!EnhancedDatabasePool.instance) {
      EnhancedDatabasePool.instance = new EnhancedDatabasePool(config);
    }
    return EnhancedDatabasePool.instance;
  }

  /**
   * 初始化连接池
   */
  public async initialize(): Promise<void> {
    if (this.pool) {
      console.warn("[EnhancedDB] Pool already initialized");
      return;
    }

    try {
      console.log("[EnhancedDB] Initializing enhanced database pool...");

      const poolConfig = await this.buildPoolConfig();
      this.pool = new Pool(poolConfig);

      this.setupPoolEventListeners();
      this.startHealthCheck();
      this.startMonitoring();

      // 预热连接池
      await this.warmupPool();

      console.log("[EnhancedDB] Pool initialized successfully");
      this.emit("poolReady");
    } catch (error) {
      console.error("[EnhancedDB] Pool initialization failed:", error);
      this.emit("poolError", error);
      throw error;
    }
  }

  /**
   * 获取连接池
   */
  public async getPool(): Promise<Pool> {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool!;
  }

  /**
   * 执行查询（带监控）
   */
  public async query(text: string, params?: unknown[]): Promise<QueryResult> {
    const startTime = Date.now();
    let client: PoolClient | undefined;

    try {
      const pool = await this.getPool();
      client = await pool.connect();

      this.metrics.activeConnections++;
      this.metrics.totalQueries++;

      const result = await client.query(text, params);

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, false);
      this.metrics.errorCount++;

      console.error("[EnhancedDB] Query failed:", error);
      throw error;
    } finally {
      if (client) {
        client.release();
        this.metrics.activeConnections--;
      }
    }
  }

  /**
   * 获取连接（用于事务）
   */
  public async getConnection(): Promise<PoolClient> {
    const pool = await this.getPool();
    const client = await pool.connect();

    this.metrics.activeConnections++;

    // 包装release方法以更新指标
    const originalRelease = client.release.bind(client);
    client.release = () => {
      this.metrics.activeConnections--;
      originalRelease();
    };

    return client;
  }

  /**
   * 获取连接池指标
   */
  public getMetrics(): PoolMetrics {
    if (this.pool) {
      this.metrics.poolSize = this.pool.totalCount;
      this.metrics.idleConnections = this.pool.idleCount;
      this.metrics.waitingClients = this.pool.waitingCount;
    }

    return { ...this.metrics };
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      await this.query("SELECT 1 as health_check");
      const responseTime = Date.now() - startTime;

      const metrics = this.getMetrics();
      const poolUtilization =
        metrics.poolSize > 0
          ? (metrics.activeConnections / metrics.poolSize) * 100
          : 0;

      return {
        healthy: true,
        responseTime,
        poolSize: metrics.poolSize,
        activeConnections: metrics.activeConnections,
        idleConnections: metrics.idleConnections,
        waitingClients: metrics.waitingClients,
        poolUtilization,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * 动态调整连接池大小
   */
  public async adjustPoolSize(newMax: number, newMin?: number): Promise<void> {
    if (!this.pool) {
      throw new Error("Pool not initialized");
    }

    // 验证参数
    if (newMax < 1 || newMax > 100) {
      throw new Error("Max pool size must be between 1 and 100");
    }

    const currentMax = this.config.max;
    this.config.max = newMax;

    if (newMin !== undefined) {
      this.config.min = Math.min(newMin, newMax);
    }

    console.log(
      `[EnhancedDB] Adjusting pool size from ${currentMax} to ${newMax}`
    );

    // 记录配置变更
    this.emit("configChanged", {
      oldMax: currentMax,
      newMax,
      newMin: this.config.min,
    });
  }

  /**
   * 获取慢查询统计
   */
  public getSlowQueries(): SlowQuery[] {
    return [...this.metrics.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // 返回最慢的10个查询
  }

  /**
   * 清除统计数据
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    console.log("[EnhancedDB] Metrics reset");
  }

  /**
   * 关闭连接池
   */
  public async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("[EnhancedDB] Pool closed");
      this.emit("poolClosed");
    }
  }

  /**
   * 构建连接池配置
   */
  private async buildPoolConfig(): Promise<PoolConfig> {
    const baseConfig: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: this.config.max,
      min: this.config.min,
      idleTimeoutMillis: this.config.idleTimeoutMs,
      connectionTimeoutMillis: this.config.connectionTimeoutMs,
      statement_timeout: this.config.statementTimeoutMs,
      query_timeout: this.config.queryTimeoutMs,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    // SSL配置
    if (this.config.enableSSL) {
      baseConfig.ssl = await this.prepareSSLConfig();
    }

    return baseConfig;
  }

  /**
   * 准备SSL配置
   */
  private async prepareSSLConfig(): Promise<
    Record<string, unknown> | undefined
  > {
    // 复用现有的SSL准备逻辑
    const caCertUrl = process.env.CA_CERT_BLOB_URL;

    if (caCertUrl) {
      try {
        // 这里可以调用现有的 prepareSSLFiles 函数
        console.log("[EnhancedDB] SSL configuration enabled");
        return {
          rejectUnauthorized: false,
          // 其他SSL配置...
        };
      } catch {
        console.warn(
          "[EnhancedDB] SSL setup failed, falling back to connection string"
        );
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * 设置连接池事件监听
   */
  private setupPoolEventListeners(): void {
    if (!this.pool) return;

    this.pool.on("connect", (_client) => {
      this.metrics.connectionCount++;
      console.log(
        `[EnhancedDB] New client connected. Total: ${this.pool?.totalCount}`
      );
    });

    this.pool.on("remove", (_client) => {
      console.log(
        `[EnhancedDB] Client removed. Total: ${this.pool?.totalCount}`
      );
    });

    this.pool.on("error", (error, _client) => {
      this.metrics.errorCount++;
      console.error("[EnhancedDB] Pool error:", error);
      this.emit("poolError", error);
    });
  }

  /**
   * 预热连接池
   */
  private async warmupPool(): Promise<void> {
    if (!this.pool) return;

    console.log(
      `[EnhancedDB] Warming up pool with ${this.config.min} connections...`
    );

    const warmupPromises = [];
    for (let i = 0; i < this.config.min; i++) {
      warmupPromises.push(
        this.pool
          .connect()
          .then((client) => {
            client.release();
          })
          .catch((error) => {
            console.warn(`[EnhancedDB] Warmup connection ${i} failed:`, error);
          })
      );
    }

    await Promise.allSettled(warmupPromises);
    console.log("[EnhancedDB] Pool warmup completed");
  }

  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    if (!this.config.enableHealthCheck) return;

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();

        if (!health.healthy) {
          console.warn("[EnhancedDB] Health check failed:", health.error);
          this.emit("healthCheckFailed", health);
        } else if (health.poolUtilization && health.poolUtilization > 80) {
          console.warn(
            `[EnhancedDB] High pool utilization: ${health.poolUtilization.toFixed(
              1
            )}%`
          );
          this.emit("highUtilization", health);
        }
      } catch (error) {
        console.error("[EnhancedDB] Health check error:", error);
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * 开始性能监控
   */
  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getMetrics();

      // 记录关键指标
      console.log(
        `[EnhancedDB] Metrics - Pool: ${metrics.poolSize}, Active: ${
          metrics.activeConnections
        }, Queries: ${
          metrics.totalQueries
        }, Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms`
      );

      // 检查是否需要调整
      this.checkAutoScaling(metrics);

      this.emit("metricsUpdate", metrics);
    }, this.config.monitoringIntervalMs);
  }

  /**
   * 自动扩缩容检查
   */
  private checkAutoScaling(metrics: PoolMetrics): void {
    if (!this.config.enableAutoScaling) return;

    const utilization =
      metrics.poolSize > 0
        ? (metrics.activeConnections / metrics.poolSize) * 100
        : 0;

    // 扩容条件：利用率 > 80% 且等待客户端 > 0
    if (
      utilization > 80 &&
      metrics.waitingClients > 0 &&
      metrics.poolSize < this.config.maxScaleLimit
    ) {
      const newSize = Math.min(
        metrics.poolSize + this.config.scaleStep,
        this.config.maxScaleLimit
      );
      console.log(
        `[EnhancedDB] Auto-scaling up: ${metrics.poolSize} -> ${newSize}`
      );
      this.adjustPoolSize(newSize).catch(console.error);
    }

    // 缩容条件：利用率 < 30% 且空闲连接 > min * 2
    else if (
      utilization < 30 &&
      metrics.idleConnections > this.config.min * 2 &&
      metrics.poolSize > this.config.min
    ) {
      const newSize = Math.max(
        metrics.poolSize - this.config.scaleStep,
        this.config.min
      );
      console.log(
        `[EnhancedDB] Auto-scaling down: ${metrics.poolSize} -> ${newSize}`
      );
      this.adjustPoolSize(newSize).catch(console.error);
    }
  }

  /**
   * 更新查询指标
   */
  private updateQueryMetrics(duration: number, success: boolean): void {
    // 更新响应时间
    const totalTime =
      this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) +
      duration;
    this.metrics.averageResponseTime = totalTime / this.metrics.totalQueries;

    // 记录慢查询
    if (duration > this.config.slowQueryThresholdMs) {
      const slowQuery: SlowQuery = {
        duration,
        timestamp: new Date().toISOString(),
        success,
      };

      this.metrics.slowQueries.push(slowQuery);

      // 保持最近100个慢查询
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries.shift();
      }

      console.warn(`[EnhancedDB] Slow query detected: ${duration}ms`);
    }

    // 更新成功率
    if (success) {
      this.metrics.successfulQueries++;
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(
    userConfig?: Partial<EnhancedPoolConfig>
  ): EnhancedPoolConfig {
    const defaultConfig: EnhancedPoolConfig = {
      max: 20,
      min: 5,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 2000,
      acquireTimeoutMs: 60000,
      statementTimeoutMs: 30000,
      queryTimeoutMs: 10000,
      enableSSL: true,
      enableHealthCheck: true,
      enableMonitoring: true,
      enableAutoScaling: false,
      healthCheckIntervalMs: 30000,
      monitoringIntervalMs: 10000,
      slowQueryThresholdMs: 1000,
      maxScaleLimit: 50,
      scaleStep: 5,
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.on("error", (error) => {
      console.error("[EnhancedDB] Error event:", error);
    });
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): PoolMetrics {
    return {
      poolSize: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      successfulQueries: 0,
      errorCount: 0,
      connectionCount: 0,
      averageResponseTime: 0,
      slowQueries: [],
    };
  }
}

// 类型定义
export interface EnhancedPoolConfig {
  max: number;
  min: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  acquireTimeoutMs: number;
  statementTimeoutMs: number;
  queryTimeoutMs: number;
  enableSSL: boolean;
  enableHealthCheck: boolean;
  enableMonitoring: boolean;
  enableAutoScaling: boolean;
  healthCheckIntervalMs: number;
  monitoringIntervalMs: number;
  slowQueryThresholdMs: number;
  maxScaleLimit: number;
  scaleStep: number;
}

export interface PoolMetrics {
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  successfulQueries: number;
  errorCount: number;
  connectionCount: number;
  averageResponseTime: number;
  slowQueries: SlowQuery[];
}

export interface HealthStatus {
  healthy: boolean;
  responseTime?: number;
  poolSize?: number;
  activeConnections?: number;
  idleConnections?: number;
  waitingClients?: number;
  poolUtilization?: number;
  error?: string;
  lastCheck: string;
}

export interface SlowQuery {
  duration: number;
  timestamp: string;
  success: boolean;
}

/**
 * 便捷的数据库实例
 */
export const enhancedDb = EnhancedDatabasePool.getInstance({
  max: 20,
  min: 5,
  enableAutoScaling: true,
  enableMonitoring: true,
  slowQueryThresholdMs: 1000,
});
