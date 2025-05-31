import { MongoClient, Db } from "mongodb";

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
  private client: MongoClient | null = null;
  private clientPromise: Promise<MongoClient>;
  private dbName: string = "sql_check_history_db"; 
  private uri: string;
  private isLoggedConnection: boolean = false;
  private static readonly shouldLog =
    process.env.NODE_ENV === "development" &&
    process.env.MONGODB_SILENT !== "true";

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("请在 .env.local 文件中定义 MONGODB_URI 环境变量");
    }
    this.uri = mongoUri;

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
            console.log("开发环境：创建新的 MongoDB 连接 Promise");
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
        console.log("生产/其他环境：创建新的 MongoDB 连接 Promise");
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
        console.log(`将连接到 MongoDB 数据库: ${this.dbName}`);
        globalWithMongo._hasLoggedDbName = true;
      }
    } catch (e) {
      if (MongoDbClient.shouldLog) {
        console.warn(
          `无法从 URI '${this.uri}' 解析数据库名称，将使用默认值: ${this.dbName}`,
          e
        );
      }
    }
  }

  public async getClient(): Promise<MongoClient> {
    return this.clientPromise;
  }

  public async getDb(): Promise<Db> {
    try {
      const client = await this.getClient();
      return client.db(this.dbName);
    } catch (error) {
      console.error("获取 MongoDB 数据库实例失败:", error);
      throw new Error("无法连接到 MongoDB");
    }
  }

  public async closeConnection(): Promise<void> {
    try {
      const clientInstance = await this.getClient();
      await clientInstance.close();
      if (MongoDbClient.shouldLog) {
        console.log("MongoDB 连接已关闭");
      }
      if (process.env.NODE_ENV === "development") {
        globalWithMongo._mongoClientPromise = null;
        globalWithMongo._isConnected = false;
        globalWithMongo._hasLoggedDbName = false; // 重置日志状态
      }
    } catch (error) {
      console.error("关闭 MongoDB 连接失败:", error);
    }
  }
}

// 使用单例模式，确保整个应用只有一个MongoDB客户端实例
let mongoDbClientInstance: MongoDbClient | null = null;

function getMongoDbClient(): MongoDbClient {
  if (!mongoDbClientInstance) {
    mongoDbClientInstance = new MongoDbClient();
  }
  return mongoDbClientInstance;
}

export default getMongoDbClient();
