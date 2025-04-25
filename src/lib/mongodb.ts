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
  private client: MongoClient | null = null; // MongoClient 实例，允许初始为 null
  private clientPromise: Promise<MongoClient>; // 连接的 Promise，确保只连接一次
  private dbName: string = "sql_check_history_db"; // 默认数据库名称
  private uri: string; // MongoDB 连接 URI

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      // 错误消息改为中文
      throw new Error("请在 .env.local 文件中定义 MONGODB_URI 环境变量");
    }
    this.uri = mongoUri; // 存储验证后的 URI

    const options = {}; // MongoDB 连接选项（如果需要可以添加）

    if (process.env.NODE_ENV === "development") {
      // 开发环境：使用全局变量缓存连接 Promise
      if (!globalWithMongo._mongoClientPromise) {
        // 如果全局缓存中没有 Promise，则创建新的客户端和连接 Promise
        this.client = new MongoClient(this.uri, options);
        globalWithMongo._mongoClientPromise = this.client.connect();
        console.log("开发环境：创建新的 MongoDB 连接 Promise");
      } else {
        // 如果全局缓存中有 Promise，复用该 Promise
        // 仍然创建一个 client 实例，主要用于类型提示和结构一致性
        this.client = new MongoClient(this.uri, options);
        console.log("开发环境：使用缓存的 MongoDB 连接 Promise");
      }

      // 确保全局 Promise 存在（理论上总会存在）
      if (!globalWithMongo._mongoClientPromise) {
        throw new Error("MongoDB 客户端 Promise 在全局缓存中未找到。"); // 中文错误
      }
      this.clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      // 生产环境或其他环境：每次都创建新的客户端和连接 Promise
      this.client = new MongoClient(this.uri, options);
      this.clientPromise = this.client.connect();
      console.log("生产/其他环境：创建新的 MongoDB 连接 Promise"); // 调整日志信息
    }

    // 从 URI 中尝试解析数据库名称
    try {
      // 如果 URI 中包含路径（数据库名），则使用它，否则使用默认值
      this.dbName = new URL(this.uri).pathname.substring(1) || this.dbName;
      console.log(`将连接到 MongoDB 数据库: ${this.dbName}`);
    } catch (e) {
      // 如果 URI 格式不正确或无法解析，发出警告并使用默认名称
      console.warn(
        `无法从 URI 解析数据库名称，将使用默认值: ${this.dbName}`,
        e
      );
    }
  }

  /**
   * 获取已连接的 MongoClient 实例的 Promise。
   * @returns 返回 MongoClient 连接的 Promise。
   */
  public async getClient(): Promise<MongoClient> {
    // clientPromise 在构造函数中保证被赋值
    return this.clientPromise;
  }

  /**
   * 获取指定数据库的 Db 实例。
   * @returns 返回 Db 实例的 Promise。
   */
  public async getDb(): Promise<Db> {
    try {
      const client = await this.getClient();
      return client.db(this.dbName);
    } catch (error) {
      console.error("获取 MongoDB 数据库实例失败:", error); // 中文日志
      throw new Error("无法连接到 MongoDB"); // 中文错误
    }
  }

  /**
   * 关闭 MongoDB 连接。
   * 在开发环境中还会清除全局缓存。
   */
  public async closeConnection(): Promise<void> {
    try {
      const client = await this.getClient();
      await client.close();
      console.log("MongoDB 连接已关闭"); // 中文日志
      if (process.env.NODE_ENV === "development") {
        globalWithMongo._mongoClientPromise = null; // 清除开发环境缓存
      }
    } catch (error) {
      console.error("关闭 MongoDB 连接失败:", error); // 中文日志
    }
  }
}

// 创建并导出 MongoDbClient 的单例
const mongoDbClient = new MongoDbClient();
export default mongoDbClient;
