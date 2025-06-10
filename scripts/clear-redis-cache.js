#!/usr/bin/env node

/**
 * 清理 Redis 缓存的开发工具脚本
 * 用于解决缓存数据格式问题
 */

const { Redis } = require("@upstash/redis");
require("dotenv").config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function clearCache() {
  try {
    console.log("🔍 检查 Redis 连接...");
    
    // 测试连接
    const pingResult = await redis.ping();
    if (pingResult !== "PONG") {
      throw new Error("Redis 连接失败");
    }
    console.log("✅ Redis 连接正常");

    // 获取所有键
    console.log("\n🔍 获取缓存键列表...");
    const allKeys = await redis.keys("*");
    console.log(`📊 找到 ${allKeys ? allKeys.length : 0} 个缓存键:`, allKeys);

    // 检查脚本缓存
    console.log("\n🔍 检查脚本缓存状态...");
    const scriptsCache = await redis.get("scripts:list");
    if (scriptsCache) {
      console.log("📦 脚本缓存存在:");
      console.log("   类型:", typeof scriptsCache);
      console.log("   大小:", String(scriptsCache).length, "字符");
      console.log("   内容预览:", String(scriptsCache).substring(0, 200), "...");
    } else {
      console.log("📭 脚本缓存不存在");
    }

    // 清理缓存
    console.log("\n🧹 清理所有缓存...");
    if (allKeys && allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`✅ 已清理 ${allKeys.length} 个缓存键`);
    } else {
      console.log("📭 没有需要清理的缓存");
    }

    // 验证清理结果
    console.log("\n🔍 验证清理结果...");
    const remainingKeys = await redis.keys("*");
    console.log(`📊 剩余键数量: ${remainingKeys ? remainingKeys.length : 0}`);

    console.log("\n🎉 缓存清理完成！");

  } catch (error) {
    console.error("❌ 清理缓存失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log("🚀 开始清理 Redis 缓存...\n");
  clearCache().then(() => {
    console.log("\n✨ 缓存清理任务完成");
    process.exit(0);
  }).catch((error) => {
    console.error("\n💥 缓存清理任务失败:", error);
    process.exit(1);
  });
}

module.exports = { clearCache }; 