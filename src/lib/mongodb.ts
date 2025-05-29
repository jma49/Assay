import { MongoClient, Db } from "mongodb";

// 用于在开发环境中缓存 MongoDB 连接 Promise 的全局变量类型扩展
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise: Promise<MongoClient> | null;
};

/**
 * MongoDB 客户端类，封装连接、获取数据库实例和关闭连接的逻辑。
 * 在开发环境中利用全局缓存来复用连接。
 */
class MongoDbClient {
  private client: MongoClient | null = null;
  private clientPromise: Promise<MongoClient>;
  private dbName: string = "sql_check_history_db"; // 默认数据库名称。确保这个是您想要的，如果 MONGODB_URI 中没有指定。
  private uri: string;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("请在 .env.local 文件中定义 MONGODB_URI 环境变量");
    }
    this.uri = mongoUri;

    const options = {};

    if (process.env.NODE_ENV === "development") {
      if (!globalWithMongo._mongoClientPromise) {
        this.client = new MongoClient(this.uri, options);
        globalWithMongo._mongoClientPromise = this.client.connect();
        console.log("开发环境：创建新的 MongoDB 连接 Promise");
      } else {
        // In development, client can be new for each instance, but clientPromise is shared.
        this.client = new MongoClient(this.uri, options);
        console.log("开发环境：使用缓存的 MongoDB 连接 Promise");
      }
      this.clientPromise =
        globalWithMongo._mongoClientPromise as Promise<MongoClient>;
    } else {
      this.client = new MongoClient(this.uri, options);
      this.clientPromise = this.client.connect();
      console.log("生产/其他环境：创建新的 MongoDB 连接 Promise");
    }

    try {
      const parsedUrl = new URL(this.uri);
      const pathDbName = parsedUrl.pathname.substring(1);
      if (pathDbName) {
        this.dbName = pathDbName;
      }
      console.log(`将连接到 MongoDB 数据库: ${this.dbName}`);
    } catch (e) {
      console.warn(
        `无法从 URI '${this.uri}' 解析数据库名称，将使用默认值: ${this.dbName}`,
        e
      );
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
      const clientInstance = await this.clientPromise;
      await clientInstance.close();
      console.log("MongoDB 连接已关闭");
      if (process.env.NODE_ENV === "development") {
        globalWithMongo._mongoClientPromise = null;
      }
    } catch (error) {
      console.error("关闭 MongoDB 连接失败:", error);
    }
  }
}

const mongoDbClient = new MongoDbClient();
export default mongoDbClient;
