// 初始化编辑历史索引的脚本
import dotenv from "dotenv";
import mongoDbClient from "../../src/lib/database/mongodb";

// 加载环境变量
dotenv.config({ path: ".env.local" });

async function initEditHistoryIndexes() {
  try {
    console.log("开始初始化编辑历史索引...");

    const db = await mongoDbClient.getDb();
    const collection = db.collection("edit_history");

    console.log("创建索引...");

    // 1. 操作时间降序索引（默认排序）
    try {
      await collection.createIndex(
        { operationTime: -1 },
        {
          background: true,
          name: "edit_history_operationTime_desc",
        }
      );
      console.log("✅ 索引 1 创建成功: operationTime 降序");
    } catch (error) {
      console.warn("⚠️  索引 1 创建失败（可能已存在）:", error);
    }

    // 2. 脚本ID + 操作时间复合索引（脚本级别历史查询）
    try {
      await collection.createIndex(
        { "scriptSnapshot.scriptId": 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_scriptId_operationTime",
        }
      );
      console.log("✅ 索引 2 创建成功: scriptId + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 2 创建失败（可能已存在）:", error);
    }

    // 3. 作者搜索索引
    try {
      await collection.createIndex(
        { searchableAuthor: 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_author_operationTime",
        }
      );
      console.log("✅ 索引 3 创建成功: searchableAuthor + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 3 创建失败（可能已存在）:", error);
    }

    // 4. 脚本名称搜索索引（英文）
    try {
      await collection.createIndex(
        { searchableScriptName: 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_scriptName_operationTime",
        }
      );
      console.log("✅ 索引 4 创建成功: searchableScriptName + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 4 创建失败（可能已存在）:", error);
    }

    // 5. 脚本名称搜索索引（中文）
    try {
      await collection.createIndex(
        { searchableScriptNameCn: 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_scriptNameCn_operationTime",
        }
      );
      console.log("✅ 索引 5 创建成功: searchableScriptNameCn + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 5 创建失败（可能已存在）:", error);
    }

    // 6. 操作类型索引
    try {
      await collection.createIndex(
        { operationType: 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_operationType_operationTime",
        }
      );
      console.log("✅ 索引 6 创建成功: operationType + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 6 创建失败（可能已存在）:", error);
    }

    // 7. 用户ID索引
    try {
      await collection.createIndex(
        { userId: 1, operationTime: -1 },
        {
          background: true,
          name: "edit_history_userId_operationTime",
        }
      );
      console.log("✅ 索引 7 创建成功: userId + operationTime");
    } catch (error) {
      console.warn("⚠️  索引 7 创建失败（可能已存在）:", error);
    }

    // 8. 复合索引：常用筛选条件组合
    try {
      await collection.createIndex(
        {
          operationType: 1,
          searchableAuthor: 1,
          operationTime: -1,
        },
        {
          background: true,
          name: "edit_history_type_author_time",
        }
      );
      console.log(
        "✅ 索引 8 创建成功: operationType + searchableAuthor + operationTime"
      );
    } catch (error) {
      console.warn("⚠️  索引 8 创建失败（可能已存在）:", error);
    }

    // 查看所有索引
    const allIndexes = await collection.indexes();
    console.log("\n📊 当前所有索引:");
    allIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n🎉 编辑历史索引初始化完成！");
  } catch (error) {
    console.error("❌ 初始化编辑历史索引失败:", error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoDbClient.closeConnection();
    process.exit(0);
  }
}

// 运行初始化
initEditHistoryIndexes().catch(console.error);
