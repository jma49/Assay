import { MongoClient, Db } from "mongodb";

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise: Promise<MongoClient> | null;
};

class MongoDbClient {
  private client: MongoClient | null = null; // Allow null initially
  private clientPromise: Promise<MongoClient>;
  private dbName: string = "sql_check_history_db"; // Default value
  private uri: string;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("请在 .env.local 文件中定义 MONGODB_URI 环境变量");
    }
    this.uri = mongoUri; // Assign validated URI

    const options = {};

    if (process.env.NODE_ENV === "development") {
      if (!globalWithMongo._mongoClientPromise) {
        this.client = new MongoClient(this.uri, options);
        globalWithMongo._mongoClientPromise = this.client.connect();
        console.log("开发环境：创建新的 MongoDB 连接 Promise");
      } else {
        // If promise exists in cache, create a client instance for type info anyway
        this.client = new MongoClient(this.uri, options);
        console.log("开发环境：使用缓存的 MongoDB 连接 Promise");
      }

      // Ensure the promise exists before assigning
      if (!globalWithMongo._mongoClientPromise) {
        throw new Error("MongoDB client promise not found in global cache.");
      }
      this.clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      this.client = new MongoClient(this.uri, options);
      this.clientPromise = this.client.connect();
      console.log("生产环境：创建新的 MongoDB 连接 Promise");
    }

    // Extract DB name after ensuring URI is set
    try {
      this.dbName = new URL(this.uri).pathname.substring(1) || this.dbName;
      console.log(`将连接到 MongoDB 数据库: ${this.dbName}`);
    } catch (e) {
      console.warn(
        `无法从 URI 解析数据库名称，将使用默认值: ${this.dbName}`,
        e
      );
      // Keep the default dbName
    }
  }

  public async getClient(): Promise<MongoClient> {
    // clientPromise is guaranteed to be set in constructor
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
      const client = await this.getClient();
      await client.close();
      console.log("MongoDB 连接已关闭");
      if (process.env.NODE_ENV === "development") {
        globalWithMongo._mongoClientPromise = null; // 清除缓存
      }
    } catch (error) {
      console.error("关闭 MongoDB 连接失败:", error);
    }
  }
}

const mongoDbClient = new MongoDbClient();
export default mongoDbClient;
