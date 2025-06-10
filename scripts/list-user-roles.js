// 查看所有用户角色的脚本
// 使用方法: node scripts/list-user-roles.js

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function listUserRoles() {
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

    const userRoles = await userRolesCollection
      .find({ isActive: true })
      .sort({ updatedAt: -1 })
      .toArray();

    console.log('\n📋 当前用户角色列表:');
    console.log('='.repeat(80));

    if (userRoles.length === 0) {
      console.log('暂无用户角色数据');
    } else {
      userRoles.forEach((userRole, index) => {
        console.log(`${index + 1}. 用户: ${userRole.email}`);
        console.log(`   ID: ${userRole.userId}`);
        console.log(`   角色: ${userRole.role}`);
        console.log(`   分配者: ${userRole.assignedBy}`);
        console.log(`   分配时间: ${userRole.assignedAt.toLocaleString()}`);
        console.log('-'.repeat(50));
      });
    }

    console.log(`\n总计: ${userRoles.length} 个用户`);

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await client.close();
    console.log('\n已断开 MongoDB 连接');
  }
}

listUserRoles(); 