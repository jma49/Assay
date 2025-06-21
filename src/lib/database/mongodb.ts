import { MongoClient, Db } from "mongodb";

/**
 * 开发环境日志辅助函数
 */
const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...args);
  }
};

const devWarn = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(message, ...args);
  }
};

const devError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.error(message, ...args);
  }
};

// 用于在开发环境中缓存 MongoDB 连接 Promise 的全局变量类型扩展
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise: Promise<MongoClient> | null;
  _isConnected: boolean;
  _hasLoggedDbName: boolean; // 新增：跟踪是否已打印数据库名称
};

/**
 * MongoDB 客户端类，封装连接、获取数据库实例和关闭连接的逻辑。
 * 在开发环境中利用全局缓存来复用连接。
 */
class MongoDbClient {
  private static instance: MongoDbClient;
  private client: MongoClient | null = null;
  private clientPromise: Promise<MongoClient> | null = null;
  private dbName: string = "sql_check_history_db";
  private uri: string;
  private isLoggedConnection: boolean = false;
  private hasLoggedConnection: boolean = false;
  private static readonly shouldLog =
    process.env.NODE_ENV === "development" &&
    process.env.MONGODB_SILENT !== "true";

  constructor() {
    this.uri = process.env.MONGODB_URI || "";
    this.dbName = process.env.MONGODB_DB_NAME || "sql_script_monitoring";

    if (!this.uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const options = {
      maxPoolSize: 10, // 最大连接池大小
      serverSelectionTimeoutMS: 5000, // 连接超时时间
      socketTimeoutMS: 45000, // Socket 超时时间
      maxIdleTimeMS: 30000, // 连接最大空闲时间
      connectTimeoutMS: 10000,
    };

    if (process.env.NODE_ENV === "development") {
      if (!globalWithMongo._mongoClientPromise) {
        this.client = new MongoClient(this.uri, options);
        globalWithMongo._mongoClientPromise = this.client.connect();
        globalWithMongo._isConnected = false;
        globalWithMongo._hasLoggedDbName = false; // 初始化
        if (!globalWithMongo._isConnected) {
          if (MongoDbClient.shouldLog) {
            devLog("开发环境：创建新的 MongoDB 连接 Promise");
          }
          globalWithMongo._isConnected = true;
        }
      } else {
        // In development, client can be new for each instance, but clientPromise is shared.
        this.client = new MongoClient(this.uri, options);
      }
      this.clientPromise =
        globalWithMongo._mongoClientPromise as Promise<MongoClient>;
    } else {
      // 在生产环境中，只有第一次创建时才打印日志
      if (!this.isLoggedConnection && process.env.NODE_ENV !== "production") {
        devLog("生产/其他环境：创建新的 MongoDB 连接 Promise");
        this.isLoggedConnection = true;
      }
      this.client = new MongoClient(this.uri, options);
      this.clientPromise = this.client.connect();
    }

    try {
      const parsedUrl = new URL(this.uri);
      const pathDbName = parsedUrl.pathname.substring(1);
      if (pathDbName) {
        this.dbName = pathDbName;
      }
      // 使用全局状态避免重复打印数据库名称
      // 在构建时(process.env.NODE_ENV === 'production')完全静默
      const shouldLogDbName =
        MongoDbClient.shouldLog && !globalWithMongo._hasLoggedDbName;

      if (shouldLogDbName) {
        devLog(`将连接到 MongoDB 数据库: ${this.dbName}`);
        globalWithMongo._hasLoggedDbName = true;
      }
    } catch (e) {
      if (MongoDbClient.shouldLog) {
        devWarn(
          `无法从 URI '${this.uri}' 解析数据库名称，将使用默认值: ${this.dbName}`,
          e
        );
      }
    }
  }

  public async getClient(): Promise<MongoClient> {
    if (!this.clientPromise) {
      if (!this.client) {
        this.client = new MongoClient(this.uri);
      }
      this.clientPromise = this.client.connect();
    }

    try {
      this.client = await this.clientPromise;

      // 只在第一次成功连接时打印日志
      if (!this.hasLoggedConnection && MongoDbClient.shouldLog) {
        devLog("MongoDB 连接已建立。");
        this.hasLoggedConnection = true;
      }

      return this.client;
    } catch (error) {
      // 连接失败时清除缓存的Promise，以便下次重试
      this.clientPromise = null;
      throw error;
    }
  }

  public async getDb(): Promise<Db> {
    try {
      const client = await this.getClient();
      return client.db(this.dbName);
    } catch (error) {
      devError("获取 MongoDB 数据库实例失败:", error);
      throw new Error(
        `MongoDB 连接失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  public async closeConnection(): Promise<void> {
    try {
      const clientInstance = await this.getClient();
      devLog("MongoDB 连接已关闭");
      await clientInstance.close();
      this.client = null;
      this.clientPromise = null;
      if (process.env.NODE_ENV === "development") {
        globalWithMongo._mongoClientPromise = null;
        globalWithMongo._isConnected = false;
        globalWithMongo._hasLoggedDbName = false; // 重置日志状态
      }
    } catch (error) {
      devError("关闭 MongoDB 连接失败:", error);
    }
  }
}

// 使用单例模式，确保整个应用只有一个MongoDB客户端实例
let mongoDbClientInstance: MongoDbClient | null = null;

export function getMongoDbClient(): MongoDbClient {
  if (!mongoDbClientInstance) {
    mongoDbClientInstance = new MongoDbClient();
  }
  return mongoDbClientInstance;
}

export default getMongoDbClient;
