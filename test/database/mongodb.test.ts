// Load environment variables FIRST
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve(__dirname, "../../.env.local"),
  override: true,
}); // Use override to be sure

// Now import other modules
import { getMongoDbClient } from "../../src/lib/database/mongodb";

// test/mongodb/connection.test.ts

async function runTest() {
  console.log("开始 MongoDB 连接和写入测试...");

  try {
    // 1. 获取数据库实例
    console.log("正在获取 MongoDB 数据库实例...");
    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    console.log(`成功连接到数据库: ${db.databaseName}`);

    // 2. 测试 Ping (可选，确认连接活跃)
    console.log("正在执行 ping 命令...");
    const pingResult = await db.command({ ping: 1 });
    if (pingResult?.ok === 1) {
      console.log("Ping 命令成功！");
    } else {
      console.warn("Ping 命令未返回成功状态:", pingResult);
    }

    // 3. 获取测试集合并写入数据
    const testCollectionName = "test_connection_logs";
    console.log(`正在访问集合: ${testCollectionName}`);
    const collection = db.collection(testCollectionName);

    const testDoc = {
      message: "MongoDB 连接测试成功",
      timestamp: new Date(),
      randomNumber: Math.random(),
    };

    console.log("正在插入测试文档...");
    const insertResult = await collection.insertOne(testDoc);
    console.log(`文档插入成功，ID: ${insertResult.insertedId}`);

    // 4. （可选）查找刚插入的文档进行验证
    console.log("正在查找刚插入的文档...");
    const findResult = await collection.findOne({
      _id: insertResult.insertedId,
    });
    if (findResult) {
      console.log("成功找到测试文档:", findResult);
    } else {
      console.error("未能找到刚插入的测试文档！");
    }

    console.log("测试成功完成！");
  } catch (error) {
    console.error("MongoDB 测试过程中发生错误:", error);
    process.exitCode = 1; // 指示脚本失败
  } finally {
    // 5. 关闭连接
    console.log("正在关闭 MongoDB 连接...");
    const mongoDbClient = getMongoDbClient();
    await mongoDbClient.closeConnection();
    console.log("测试脚本结束。");
  }
}

// 执行测试
runTest();
