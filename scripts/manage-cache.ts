#!/usr/bin/env ts-node

/**
 * 缓存管理脚本
 * 用于监控、优化和管理Redis缓存
 *
 * 使用方法:
 * npm run cache:health    # 检查缓存健康状态
 * npm run cache:clear     # 清理缓存
 * npm run cache:stats     # 查看缓存统计
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

import { config } from "dotenv";
import {
  cacheManager,
  getCacheHealth,
  INTELLIGENT_CACHE_STRATEGIES,
} from "../src/lib/cache-strategies";
import redis from "../src/lib/redis";

// 加载环境变量
config();

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
Redis缓存管理工具

使用方法:
  ts-node scripts/manage-cache.ts [命令] [选项]

命令:
  health              显示缓存健康报告
  stats               显示缓存性能统计
  clear [pattern]     清理缓存（可指定模式）
  monitor             实时监控缓存性能
  strategies          显示缓存策略配置
  keys [pattern]      列出缓存键
  size                显示内存使用情况

选项:
  --help, -h          显示此帮助信息
  --format json       以JSON格式输出
  --verbose           显示详细信息

示例:
  # 查看健康报告
  ts-node scripts/manage-cache.ts health
  
  # 清理所有dashboard相关缓存
  ts-node scripts/manage-cache.ts clear "stats:dashboard:*"
  
  # 以JSON格式查看统计
  ts-node scripts/manage-cache.ts stats --format json
  
  # 实时监控（每5秒刷新）
  ts-node scripts/manage-cache.ts monitor

环境要求:
  - UPSTASH_REDIS_REST_URL: Redis连接URL
  - UPSTASH_REDIS_REST_TOKEN: Redis认证Token
  `);
}

/**
 * 解析命令行参数
 */
function parseArgs(args: string[]) {
  const options = {
    command: args[0] || "health",
    pattern: args[1] || "*",
    help: false,
    format: "table" as "table" | "json",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--format":
        if (i + 1 < args.length && ["json", "table"].includes(args[i + 1])) {
          options.format = args[i + 1] as "table" | "json";
          i++;
        }
        break;
      case "--verbose":
        options.verbose = true;
        break;
    }
  }

  return options;
}

/**
 * 格式化文件大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化表格输出
 */
function formatTable(headers: string[], rows: string[][]): void {
  // 计算每列的最大宽度
  const colWidths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map((row) => (row[i] || "").length));
    return Math.max(header.length, maxRowWidth);
  });

  // 输出表头
  const headerRow = headers
    .map((header, i) => header.padEnd(colWidths[i]))
    .join(" | ");
  console.log(headerRow);
  console.log(headers.map((_, i) => "-".repeat(colWidths[i])).join("-|-"));

  // 输出数据行
  rows.forEach((row) => {
    const formattedRow = row
      .map((cell, i) => (cell || "").padEnd(colWidths[i]))
      .join(" | ");
    console.log(formattedRow);
  });
}

/**
 * 显示缓存健康报告
 */
async function showHealthReport(format: "table" | "json"): Promise<void> {
  console.log("📊 生成缓存健康报告...\n");

  try {
    const report = await getCacheHealth();

    if (format === "json") {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // 表格格式输出
    console.log("=".repeat(80));
    console.log("🚀 Redis缓存健康报告");
    console.log("=".repeat(80));

    console.log("\n📈 摘要信息:");
    console.log(report.summary);

    console.log("\n🎯 缓存策略配置:");
    const strategyRows = Object.entries(report.strategies).map(
      ([name, config]) => [
        name,
        config.accessPattern,
        `${config.ttl}s`,
        config.compression ? "✅" : "❌",
        config.maxSize ? `${config.maxSize}KB` : "N/A",
        config.description.split(" - ")[0],
      ]
    );

    formatTable(
      ["策略名称", "访问模式", "TTL", "压缩", "大小限制", "描述"],
      strategyRows
    );

    console.log("\n⚡ 性能统计:");
    const perfRows = Object.entries(report.performance).map(([type, stats]) => [
      type,
      `${(stats.hitRate * 100).toFixed(1)}%`,
      stats.totalAccess.toString(),
      stats.hits.toString(),
      stats.misses.toString(),
      `${stats.avgResponseTime.toFixed(1)}ms`,
    ]);

    if (perfRows.length > 0) {
      formatTable(
        ["数据类型", "命中率", "总访问", "命中数", "未命中", "响应时间"],
        perfRows
      );
    } else {
      console.log("⚠️  暂无性能数据");
    }

    console.log("\n💡 优化建议:");
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    console.log("\n📊 Redis状态:");
    console.log(`- 内存使用: ${report.redisInfo.usedMemory}`);
    console.log(`- 活跃键数: ${report.redisInfo.totalKeys}`);
    console.log(`- 命中率: ${(report.redisInfo.hitRate * 100).toFixed(1)}%`);

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("❌ 生成健康报告失败:", error);
  }
}

/**
 * 显示缓存统计
 */
async function showCacheStats(format: "table" | "json"): Promise<void> {
  console.log("📊 获取缓存统计信息...\n");

  try {
    const stats = cacheManager.getPerformanceStats();

    if (format === "json") {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    if (typeof stats === "object" && Object.keys(stats).length > 0) {
      const rows = Object.entries(stats).map(([type, stat]) => [
        type,
        `${(stat.hitRate * 100).toFixed(2)}%`,
        `${(stat.missRate * 100).toFixed(2)}%`,
        stat.totalAccess.toString(),
        `${stat.avgResponseTime.toFixed(2)}ms`,
        stat.activeKeys.toString(),
      ]);

      console.log("⚡ 缓存性能统计:");
      formatTable(
        ["数据类型", "命中率", "未命中率", "总访问", "平均响应", "活跃键"],
        rows
      );
    } else {
      console.log("⚠️  暂无统计数据，请先使用智能缓存功能");
    }
  } catch (error) {
    console.error("❌ 获取统计信息失败:", error);
  }
}

/**
 * 清理缓存
 */
async function clearCache(pattern: string): Promise<void> {
  console.log(`🧹 清理缓存模式: ${pattern}\n`);

  try {
    // 获取匹配的键
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log("⚠️  未找到匹配的缓存键");
      return;
    }

    console.log(`找到 ${keys.length} 个匹配的键:`);
    keys.forEach((key, i) => {
      console.log(`${i + 1}. ${key}`);
    });

    // 批量删除
    const deletedCount = await redis.del(...keys);

    console.log(`\n✅ 成功清理 ${deletedCount} 个缓存键`);
  } catch (error) {
    console.error("❌ 清理缓存失败:", error);
  }
}

/**
 * 显示缓存策略
 */
function showStrategies(format: "table" | "json"): void {
  console.log("🎯 缓存策略配置:\n");

  if (format === "json") {
    console.log(JSON.stringify(INTELLIGENT_CACHE_STRATEGIES, null, 2));
    return;
  }

  const rows = Object.entries(INTELLIGENT_CACHE_STRATEGIES).map(
    ([name, config]) => [
      name,
      config.pattern,
      config.accessPattern,
      `${config.ttl}s`,
      config.compression ? "✅" : "❌",
      config.maxSize ? `${config.maxSize}KB` : "∞",
      config.autoRefreshThreshold?.toString() || "N/A",
    ]
  );

  formatTable(
    [
      "策略名称",
      "键模式",
      "访问模式",
      "TTL",
      "压缩",
      "大小限制",
      "自动刷新阈值",
    ],
    rows
  );

  console.log("\n💡 访问模式说明:");
  console.log("- HOT: 热数据，高频访问，短TTL，快速响应");
  console.log("- WARM: 温数据，中频访问，中等TTL，平衡性能");
  console.log("- COLD: 冷数据，低频访问，长TTL，节省资源");
  console.log("- STATIC: 静态数据，极少变化，超长TTL");
}

/**
 * 列出缓存键
 */
async function listKeys(pattern: string, verbose: boolean): Promise<void> {
  console.log(`🔍 搜索缓存键: ${pattern}\n`);

  try {
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log("⚠️  未找到匹配的键");
      return;
    }

    console.log(`找到 ${keys.length} 个键:\n`);

    if (verbose) {
      // 详细模式：显示键值信息
      for (let i = 0; i < Math.min(keys.length, 50); i++) {
        // 限制显示50个
        const key = keys[i];
        try {
          const ttl = await redis.ttl(key);
          const value = await redis.get(key);
          const size = value
            ? new TextEncoder().encode(String(value)).length
            : 0;

          console.log(`${i + 1}. ${key}`);
          console.log(
            `   TTL: ${ttl === -1 ? "永久" : ttl === -2 ? "已过期" : `${ttl}s`}`
          );
          console.log(`   大小: ${formatBytes(size)}`);
          console.log("");
        } catch (error) {
          console.log(`${i + 1}. ${key} (读取失败)`);
        }
      }

      if (keys.length > 50) {
        console.log(`... 还有 ${keys.length - 50} 个键未显示`);
      }
    } else {
      // 简单模式：只显示键名
      keys.forEach((key, i) => {
        console.log(`${i + 1}. ${key}`);
      });
    }
  } catch (error) {
    console.error("❌ 列出键失败:", error);
  }
}

/**
 * 显示内存使用情况
 */
async function showMemoryUsage(): Promise<void> {
  console.log("💾 Redis内存使用情况:\n");

  try {
    const totalKeys = await redis.dbsize();

    console.log(`📊 基本信息:`);
    console.log(`- 总键数: ${totalKeys}`);
    console.log(`- 连接状态: ✅ 正常`);

    // 按模式分组统计键数量
    const patterns = [
      "stats:*",
      "exec:*",
      "history:*",
      "scripts:*",
      "perms:*",
      "approvals:*",
      "edit:*",
      "schema:*",
      "analytics:*",
      "roles:*",
      "config:*",
      "meta:*",
    ];

    console.log(`\n📈 分类统计:`);
    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          console.log(`- ${pattern.replace("*", "")}: ${keys.length} 个键`);
        }
      } catch (error) {
        console.log(`- ${pattern.replace("*", "")}: 查询失败`);
      }
    }
  } catch (error) {
    console.error("❌ 获取内存信息失败:", error);
  }
}

/**
 * 实时监控
 */
async function monitorCache(): Promise<void> {
  console.log("📡 启动实时缓存监控 (Ctrl+C 退出)...\n");

  let iteration = 0;

  const monitor = setInterval(async () => {
    try {
      console.clear();
      console.log(
        `📊 Redis缓存监控 - 刷新 #${++iteration} (${new Date().toLocaleTimeString()})`
      );
      console.log("=".repeat(80));

      // 显示基本信息
      const totalKeys = await redis.dbsize();
      console.log(`总键数: ${totalKeys}`);

      // 显示性能统计
      const stats = cacheManager.getPerformanceStats() as Record<string, any>;
      if (Object.keys(stats).length > 0) {
        console.log("\n⚡ 实时性能:");
        Object.entries(stats).forEach(([type, stat]) => {
          console.log(
            `${type}: 命中率 ${(stat.hitRate * 100).toFixed(1)}%, 访问 ${
              stat.totalAccess
            }, 响应 ${stat.avgResponseTime.toFixed(1)}ms`
          );
        });
      }

      console.log("\n按 Ctrl+C 退出监控");
    } catch (error) {
      console.error("监控刷新失败:", error);
    }
  }, 5000); // 每5秒刷新

  // 优雅退出
  process.on("SIGINT", () => {
    clearInterval(monitor);
    console.log("\n\n👋 监控已停止");
    process.exit(0);
  });
}

/**
 * 验证环境配置
 */
function validateEnvironment(): boolean {
  const required = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ 缺少必要的环境变量:");
    for (const key of missing) {
      console.error(`   - ${key}`);
    }
    console.error("\n请检查 .env 文件配置");
    return false;
  }

  return true;
}

/**
 * 主执行函数
 */
async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      showHelp();
      return;
    }

    if (!validateEnvironment()) {
      process.exit(1);
    }

    console.log(`🚀 Redis缓存管理工具 - 执行: ${options.command}\n`);

    switch (options.command) {
      case "health":
        await showHealthReport(options.format);
        break;

      case "stats":
        await showCacheStats(options.format);
        break;

      case "clear":
        await clearCache(options.pattern);
        break;

      case "strategies":
        showStrategies(options.format);
        break;

      case "keys":
        await listKeys(options.pattern, options.verbose);
        break;

      case "size":
        await showMemoryUsage();
        break;

      case "monitor":
        await monitorCache();
        break;

      default:
        console.error(`❌ 未知命令: ${options.command}`);
        console.log("使用 --help 查看可用命令");
        process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ 执行失败:", error);
    process.exit(1);
  }
}

// 优雅处理进程信号
process.on("SIGTERM", () => {
  console.log("\n⚠️  收到终止信号，正在退出...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ 未处理的Promise拒绝:", reason);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}
