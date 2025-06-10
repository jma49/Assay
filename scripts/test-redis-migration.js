// Redis 迁移验证测试脚本
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function testUpstashRedis() {
  console.log('🔍 开始 Redis 迁移验证测试...\n');

  // 1. 检查环境变量
  console.log('1️⃣ 环境变量检查:');
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ 缺少必需的环境变量:');
    console.error(`   UPSTASH_REDIS_REST_URL: ${redisUrl ? '✅ 已设置' : '❌ 未设置'}`);
    console.error(`   UPSTASH_REDIS_REST_TOKEN: ${redisToken ? '✅ 已设置' : '❌ 未设置'}`);
    console.error('\n请在 .env.local 文件中配置 Upstash Redis 环境变量');
    process.exit(1);
  }

  console.log(`   UPSTASH_REDIS_REST_URL: ✅ 已设置`);
  console.log(`   UPSTASH_REDIS_REST_TOKEN: ✅ 已设置\n`);

  try {
    // 2. 测试 Upstash Redis 连接
    console.log('2️⃣ 测试 Upstash Redis 连接...');
    
    // 直接使用 @upstash/redis 测试连接
    const { Redis } = require('@upstash/redis');
    
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    console.log('   ✅ Redis 客户端创建成功\n');

    // 3. 测试连接
    console.log('3️⃣ 测试连接...');
    
    // 使用简单的 ping 测试连接
    try {
      const pingResult = await redis.ping();
      if (pingResult === 'PONG') {
        console.log('   ✅ Redis 连接成功\n');
      } else {
        console.error('   ❌ Redis ping 返回异常:', pingResult);
        process.exit(1);
      }
    } catch (pingError) {
      console.error('   ❌ Redis 连接失败:', pingError.message);
      process.exit(1);
    }

    // 4. 测试基本操作
    console.log('4️⃣ 测试基本操作...');
    const testKey = `migration_test_${Date.now()}`;
    const testValue = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      migration: 'upstash-redis'
    });

    // SET 操作
    await redis.setex(testKey, 60, testValue);
    console.log('   ✅ SET 操作成功');

    // GET 操作
    const retrieved = await redis.get(testKey);
    console.log('   ✅ GET 操作成功');

    // 验证数据一致性
    // Upstash Redis 自动反序列化JSON数据为对象
    let parsedValue;
    if (typeof retrieved === 'string') {
      parsedValue = JSON.parse(retrieved);
    } else {
      parsedValue = retrieved; // Upstash 自动反序列化
    }
    const originalValue = JSON.parse(testValue);
    
    if (parsedValue.test === originalValue.test && 
        parsedValue.migration === originalValue.migration) {
      console.log('   ✅ 数据一致性验证通过');
    } else {
      console.error('   ❌ 数据一致性验证失败');
      process.exit(1);
    }

    // DEL 操作
    await redis.del(testKey);
    console.log('   ✅ DEL 操作成功\n');

    // 5. 测试高级功能
    console.log('5️⃣ 测试高级功能...');
    
    // 测试 SET 集合操作
    const setKey = `test_set_${Date.now()}`;
    await redis.sadd(setKey, 'member1', 'member2', 'member3');
    const members = await redis.smembers(setKey);
    console.log(`   ✅ SET 集合操作: ${members.length} 个成员`);

    // 清理测试数据
    await redis.del(setKey);

    // 6. 测试应用缓存功能
    console.log('\n6️⃣ 测试应用缓存功能...');
    
    // 测试缓存键过期功能
    const cacheTestKey = `cache_test_${Date.now()}`;
    await redis.setex(cacheTestKey, 1, 'cache_test_value'); // 1秒过期
    
    const cachedValue = await redis.get(cacheTestKey);
    if (cachedValue === 'cache_test_value') {
      console.log('   ✅ 缓存TTL设置和读取成功');
    } else {
      console.error('   ❌ 缓存TTL测试失败');
      process.exit(1);
    }
    
    // 等待1.5秒，测试过期
    console.log('   ⏳ 等待缓存过期...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const expiredValue = await redis.get(cacheTestKey);
    if (expiredValue === null) {
      console.log('   ✅ 缓存过期机制正常');
    } else {
      console.error('   ❌ 缓存过期机制异常');
      process.exit(1);
    }

    console.log('\n🎉 所有测试通过！Redis 迁移成功！\n');

    // 打印迁移总结
    console.log('📊 迁移总结:');
    console.log('   • 依赖库: ioredis → @upstash/redis');
    console.log('   • 连接方式: TCP 连接 → HTTP REST API');
    console.log('   • 部署模式: 本地 Redis → Serverless Redis');
    console.log('   • 性能优化: 为 Serverless 环境优化');
    console.log('   • 兼容性: 保持所有现有功能');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error('请检查 Upstash Redis 配置和网络连接');
    process.exit(1);
  }
}

// 运行测试
testUpstashRedis(); 