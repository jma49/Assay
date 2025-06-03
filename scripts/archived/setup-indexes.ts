import * as dotenv from "dotenv";
import * as path from "path";

// 加载环境变量文件
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

import mongoDbClient from "../src/lib/mongodb";

/**
 * 安全地创建索引，如果索引已存在则跳过
 */
async function createIndexSafely(
  collection: any,
  indexSpec: any,
  options: any,
  description: string,
) {
  try {
    await collection.createIndex(indexSpec, options);
    console.log(`✅ 创建 ${description}`);
  } catch (error: any) {
    if (error.code === 85) {
      // IndexOptionsConflict - 索引已存在但名称不同
      console.log(`⚠️  跳过 ${description} (索引已存在)`);
    } else if (error.code === 86) {
      // IndexKeySpecsConflict - 相同的索引规格已存在
      console.log(`⚠️  跳过 ${description} (索引已存在)`);
    } else {
      throw error;
    }
  }
}

/**
 * 设置MongoDB索引以优化查询性能
 */
async function setupIndexes() {
  try {
    console.log("开始设置MongoDB索引...");
    console.log(`MongoDB URI 已配置: ${!!process.env.MONGODB_URI}`);

    const db = await mongoDbClient.getDb();

    // 1. 为 result 集合创建索引（用于 check-history API）
    const resultCollection = db.collection("result");

    // 在 execution_time 字段上创建降序索引（用于按时间排序）
    await createIndexSafely(
      resultCollection,
      { execution_time: -1 },
      { name: "execution_time_desc" },
      "result.execution_time 降序索引",
    );

    // 在 script_name 字段上创建索引（用于按脚本名筛选）
    await createIndexSafely(
      resultCollection,
      { script_name: 1 },
      { name: "script_name_asc" },
      "result.script_name 索引",
    );

    // 在 status 字段上创建索引（用于按状态筛选）
    await createIndexSafely(
      resultCollection,
      { status: 1 },
      { name: "status_asc" },
      "result.status 索引",
    );

    // 复合索引：script_name + execution_time（用于特定脚本的历史查询）
    await createIndexSafely(
      resultCollection,
      { script_name: 1, execution_time: -1 },
      { name: "script_execution_time" },
      "result 复合索引 (script_name + execution_time)",
    );

    // 2. 为 sql_scripts 集合创建索引（用于 list-scripts API）
    const scriptsCollection = db.collection("sql_scripts");

    // 在 name 字段上创建索引（用于按名称排序）
    await createIndexSafely(
      scriptsCollection,
      { name: 1 },
      { name: "name_asc" },
      "sql_scripts.name 索引",
    );

    // 在 scriptId 字段上创建索引（确保快速查询）
    // 注意：不设置unique，因为可能已经存在不同名称的索引
    await createIndexSafely(
      scriptsCollection,
      { scriptId: 1 },
      { name: "scriptId_asc" },
      "sql_scripts.scriptId 索引",
    );

    // 在 isScheduled 字段上创建索引（用于定时任务查询）
    await createIndexSafely(
      scriptsCollection,
      { isScheduled: 1 },
      { name: "isScheduled_asc" },
      "sql_scripts.isScheduled 索引",
    );

    // 在 createdAt 字段上创建索引（用于按创建时间排序）
    await createIndexSafely(
      scriptsCollection,
      { createdAt: -1 },
      { name: "createdAt_desc" },
      "sql_scripts.createdAt 索引",
    );

    // 3. 显示当前所有索引
    console.log("\n📋 当前索引列表:");

    const resultIndexes = await resultCollection.listIndexes().toArray();
    console.log("result 集合索引:");
    resultIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const scriptsIndexes = await scriptsCollection.listIndexes().toArray();
    console.log("sql_scripts 集合索引:");
    scriptsIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log("\n✅ 所有索引设置完成!");
  } catch (error) {
    console.error("❌ 设置索引时发生错误:", error);
    throw error;
  } finally {
    await mongoDbClient.closeConnection();
  }
}

// 执行索引设置
setupIndexes()
  .then(() => {
    console.log("🎉 索引设置脚本执行成功");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 索引设置脚本执行失败:", error);
    process.exit(1);
  });
