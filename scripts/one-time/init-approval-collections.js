// 初始化审批相关的 MongoDB 集合和索引
// 使用方法: node scripts/init-approval-collections.js

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function initApprovalCollections() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('错误: 请设置 MONGODB_URI 环境变量');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('已连接到 MongoDB');

    const db = client.db();

    // 获取现有集合列表
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    console.log('\n📋 当前集合列表:');
    collectionNames.forEach(name => console.log(`  - ${name}`));

    // 初始化 approval_requests 集合
    if (!collectionNames.includes('approval_requests')) {
      console.log('\n🔧 创建 approval_requests 集合...');
      await db.createCollection('approval_requests');
      
      // 创建索引
      const approvalRequestsCollection = db.collection('approval_requests');
      await approvalRequestsCollection.createIndexes([
        { key: { requestId: 1 }, unique: true },
        { key: { scriptId: 1 } },
        { key: { status: 1 } },
        { key: { requesterId: 1 } },
        { key: { requestedAt: -1 } },
        { key: { status: 1, requestedAt: -1 } }
      ]);
      console.log('✅ approval_requests 集合和索引创建完成');
    } else {
      console.log('\n✅ approval_requests 集合已存在');
    }

    // 初始化 approval_history 集合
    if (!collectionNames.includes('approval_history')) {
      console.log('\n🔧 创建 approval_history 集合...');
      await db.createCollection('approval_history');
      
      // 创建索引
      const approvalHistoryCollection = db.collection('approval_history');
      await approvalHistoryCollection.createIndexes([
        { key: { historyId: 1 }, unique: true },
        { key: { requestId: 1 } },
        { key: { scriptId: 1 } },
        { key: { actionBy: 1 } },
        { key: { actionAt: -1 } },
        { key: { requestId: 1, actionAt: -1 } }
      ]);
      console.log('✅ approval_history 集合和索引创建完成');
    } else {
      console.log('\n✅ approval_history 集合已存在');
    }

    // 检查集合状态
    const approvalRequestsCount = await db.collection('approval_requests').countDocuments();
    const approvalHistoryCount = await db.collection('approval_history').countDocuments();

    console.log('\n📊 集合统计:');
    console.log(`  - approval_requests: ${approvalRequestsCount} 条记录`);
    console.log(`  - approval_history: ${approvalHistoryCount} 条记录`);

    if (approvalRequestsCount === 0) {
      console.log('\n💡 提示: approval_requests 集合为空，这是正常的，当有脚本提交审批时会自动创建记录');
    }

    if (approvalHistoryCount === 0) {
      console.log('💡 提示: approval_history 集合为空，这是正常的，当有审批操作时会自动创建记录');
    }

    console.log('\n🎉 审批集合初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await client.close();
    console.log('\n已断开 MongoDB 连接');
  }
}

initApprovalCollections(); 