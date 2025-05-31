import Redis from "ioredis";

/**
 * Redis客户端管理类
 * 负责Redis连接的创建、维护和状态管理
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;

  /**
   * 获取Redis客户端实例
   * 如果连接不存在或已断开，将自动重新连接
   */
  public async getClient(): Promise<Redis> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
    return this.client!;
  }

  /**
   * 建立Redis连接
   * 配置包含连接池、超时设置和重连策略
   */
  private async connect(): Promise<void> {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || "0"),
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 300,
        retryDelayOnClusterCreate: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        // 连接池配置
        family: 4,
        // 超时配置
        connectTimeout: 10000,
        commandTimeout: 5000,
        // 重连配置
        retryDelayMin: 50,
        retryDelayMax: 2000,
      };

      this.client = new Redis(redisConfig);

      // 绑定连接状态事件监听器
      this.client.on("connect", () => {
        console.log("[Redis] 连接已建立");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        console.log("[Redis] 客户端就绪");
      });

      this.client.on("error", (error) => {
        console.error("[Redis] 连接错误:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("[Redis] 连接已关闭");
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("[Redis] 正在重连...");
      });

      // 执行连接
      await this.client.connect();
    } catch (error) {
      console.error("[Redis] 连接失败:", error);
      throw error;
    }
  }

  /**
   * 测试Redis连接可用性
   * 通过PING命令验证连接状态
   */
  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("[Redis] 连接测试失败:", error);
      return false;
    }
  }

  /**
   * 关闭Redis连接
   * 安全地断开连接并清理资源
   */
  public async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log("[Redis] 连接已安全关闭");
    }
  }

  /**
   * 获取当前连接状态
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && this.client !== null;
  }
}

// 导出单例实例
const redisClient = new RedisClient();

export default redisClient;
