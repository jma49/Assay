// 用于为指定用户分配管理员角色的脚本
// 使用方法: node scripts/assign-admin-role.js USER_ID USER_EMAIL

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function assignAdminRole(userId, userEmail) {
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
    const userRolesCollection = db.collection('user_roles');

    const now = new Date();
    const userRoleData = {
      userId,
      email: userEmail,
      role: 'admin',
      assignedBy: 'script',
      assignedAt: now,
      updatedAt: now,
      isActive: true,
    };

    const result = await userRolesCollection.replaceOne(
      { userId },
      userRoleData,
      { upsert: true }
    );

    if (result.acknowledged) {
      console.log(`✅ 成功为用户 ${userEmail} (${userId}) 分配管理员角色`);
    } else {
      console.log('❌ 角色分配失败');
    }

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await client.close();
    console.log('已断开 MongoDB 连接');
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('使用方法: node scripts/assign-admin-role.js USER_ID USER_EMAIL');
  console.log('示例: node scripts/assign-admin-role.js user_123 admin@example.com');
  process.exit(1);
}

const [userId, userEmail] = args;
assignAdminRole(userId, userEmail); 