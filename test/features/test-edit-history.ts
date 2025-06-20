// 测试编辑历史功能的脚本
import mongoDbClient from "../../src/lib/database/mongodb";

async function testEditHistory() {
  try {
    console.log("正在连接到 MongoDB...");
    const db = await mongoDbClient.getDb();

    // 检查 edit_history 集合
    const editHistoryCollection = db.collection("edit_history");

    console.log("检查编辑历史集合...");
    const count = await editHistoryCollection.countDocuments();
    console.log(`编辑历史记录数量: ${count}`);

    if (count > 0) {
      console.log("\n最近的编辑历史记录:");
      const recentHistory = await editHistoryCollection
        .find({})
        .sort({ operationTime: -1 })
        .limit(3)
        .toArray();

      recentHistory.forEach((record, index) => {
        console.log(
          `${index + 1}. 操作: ${record.operation}, 脚本: ${
            record.scriptSnapshot?.scriptId || "Unknown"
          }, 时间: ${record.operationTime}`
        );
      });
    } else {
      console.log("暂无编辑历史记录");

      // 插入一条测试记录
      console.log("\n插入测试编辑历史记录...");
      const testRecord = {
        operation: "create",
        operationTime: new Date(),
        userId: "test-user-123",
        scriptSnapshot: {
          scriptId: "test-script-001",
          name: "测试脚本",
          cnName: "Test Script",
          author: "测试用户",
        },
        changes: [
          {
            field: "name",
            fieldDisplayName: "Script Name",
            fieldDisplayNameCn: "脚本名称",
            oldValue: null,
            newValue: "测试脚本",
          },
        ],
        description: "创建了测试脚本",
        descriptionCn: "创建了测试脚本",
        searchableAuthor: "测试用户",
        searchableScriptName: "测试脚本",
        searchableScriptNameCn: "test script",
        operationType: "create",
      };

      const result = await editHistoryCollection.insertOne(testRecord);
      console.log(`测试记录插入成功，ID: ${result.insertedId}`);
    }

    // 检查索引
    console.log("\n检查索引状态:");
    const indexes = await editHistoryCollection.listIndexes().toArray();
    console.log(`索引数量: ${indexes.length}`);
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (error) {
    console.error("测试编辑历史失败:", error);
  } finally {
    await mongoDbClient.closeConnection();
    console.log("\n数据库连接已关闭");
  }
}

// 如果作为脚本直接运行
if (require.main === module) {
  testEditHistory();
}

export { testEditHistory };
