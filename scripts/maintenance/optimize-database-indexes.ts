#!/usr/bin/env -S npx tsx

/**
 * 数据库索引优化执行脚本
 * 手动执行数据库优化和索引创建
 *
 * 使用方法:
 * npm run optimize:db
 * 或者直接运行: tsx scripts/optimize-database-indexes.ts
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

import { config } from "dotenv";
import {
  generateOptimizationReport,
  dbOptimization,
} from "../../src/lib/database/database-optimization";

// 加载环境变量（优先使用 .env.local）
config({ path: ".env.local" });
config(); // 备用加载 .env

/**
 * 格式化输出结果
 */
function formatResults(report: any) {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 数据库优化报告");
  console.log("=".repeat(80));

  // 打印摘要
  console.log("\n📊 优化摘要:");
  console.log(report.summary);

  // 打印索引创建结果
  console.log("\n📈 索引创建详情:");
  if (report.indexes.length > 0) {
    console.log(
      `${"集合".padEnd(20)} ${"索引名称".padEnd(25)} ${"状态".padEnd(
        8
      )} ${"耗时(ms)".padEnd(10)}`
    );
    console.log("-".repeat(70));

    for (const idx of report.indexes) {
      const status = idx.success ? "✅ 成功" : "❌ 失败";
      const error = idx.error ? ` (${idx.error})` : "";
      console.log(
        `${idx.collection.padEnd(20)} ${idx.indexName.padEnd(
          25
        )} ${status.padEnd(8)} ${idx.duration.toString().padEnd(10)}${error}`
      );
    }
  } else {
    console.log("⚠️  没有需要创建的索引");
  }

  // 打印连接池状态
  console.log("\n🔍 连接池健康状态:");
  const pool = report.poolHealth;
  console.log(
    `状态: ${
      pool.status === "healthy" ? "🟢" : pool.status === "warning" ? "🟡" : "🔴"
    } ${pool.status.toUpperCase()}`
  );
  console.log(
    `活跃连接: ${pool.activeConnections}/${pool.poolSize} (${(
      (pool.activeConnections / pool.poolSize) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`平均响应时间: ${pool.avgResponseTime.toFixed(1)}ms`);

  // 打印查询分析
  if (report.queries.length > 0) {
    console.log("\n🔎 查询性能分析:");
    for (const query of report.queries) {
      console.log(
        `- ${query.queryType.toUpperCase()} 查询: ${query.executionTime.toFixed(
          1
        )}ms`
      );
      console.log(
        `  扫描文档: ${query.docsExamined}, 返回文档: ${query.docsReturned}`
      );
      console.log(`  索引使用: ${query.indexUsed ? "✅" : "❌"}`);
    }
  }

  // 打印优化建议
  console.log("\n💡 优化建议:");
  for (const recommendation of report.recommendations) {
    console.log(`• ${recommendation}`);
  }

  console.log("\n" + "=".repeat(80));
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
数据库索引优化工具

使用方法:
  tsx scripts/optimize-database-indexes.ts [选项]

选项:
  --help, -h           显示此帮助信息
  --dry-run           预览模式，不实际创建索引
  --report-only       只生成报告，不创建索引
  --force             强制重新创建已存在的索引
  --collection <name>  只处理指定集合

示例:
  # 完整优化（推荐）
  tsx scripts/optimize-database-indexes.ts
  
  # 预览模式
  tsx scripts/optimize-database-indexes.ts --dry-run
  
  # 只生成报告
  tsx scripts/optimize-database-indexes.ts --report-only
  
  # 只处理特定集合
  tsx scripts/optimize-database-indexes.ts --collection execution_results

环境要求:
  - MONGODB_URI: MongoDB连接字符串
  - DATABASE_URL: PostgreSQL连接字符串（可选）
  `);
}

/**
 * 解析命令行参数
 */
function parseArgs(args: string[]) {
  const options = {
    help: false,
    dryRun: false,
    reportOnly: false,
    force: false,
    collection: null as string | null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--report-only":
        options.reportOnly = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--collection":
        if (i + 1 < args.length) {
          options.collection = args[i + 1];
          i++; // 跳过下一个参数
        }
        break;
    }
  }

  return options;
}

/**
 * 验证环境配置
 */
function validateEnvironment() {
  const required = ["MONGODB_URI"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ 缺少必要的环境变量:");
    for (const key of missing) {
      console.error(`   - ${key}`);
    }
    console.error("\n请检查 .env 文件或环境变量配置");
    process.exit(1);
  }

  console.log("✅ 环境配置验证通过");
}

/**
 * 主执行函数
 */
async function main() {
  try {
    // 解析命令行参数
    const options = parseArgs(process.argv.slice(2));

    // 显示帮助
    if (options.help) {
      showHelp();
      return;
    }

    console.log("🚀 启动数据库优化工具...");
    console.log(
      `模式: ${
        options.dryRun ? "预览模式" : options.reportOnly ? "仅报告" : "完整优化"
      }`
    );

    if (options.collection) {
      console.log(`目标集合: ${options.collection}`);
    }

    // 验证环境
    validateEnvironment();

    const startTime = Date.now();

    if (options.reportOnly) {
      // 只生成报告，不创建索引
      console.log("\n📊 生成数据库状态报告...");

      const [queries, poolHealth, indexStats] = await Promise.all([
        dbOptimization.analyzeSlowQueries(),
        dbOptimization.monitorConnectionPool(),
        dbOptimization.getIndexStats(),
      ]);

      const report = {
        summary: `仅报告模式 - 生成于: ${new Date().toLocaleString("zh-CN")}`,
        indexes: [],
        queries,
        poolHealth,
        indexStats,
        recommendations: [
          "运行完整优化以创建推荐索引",
          "定期监控数据库性能",
          "根据查询模式调整索引策略",
        ],
      };

      formatResults(report);
    } else if (options.dryRun) {
      // 预览模式
      console.log("\n👀 预览模式 - 不会实际创建索引");

      // 这里可以添加预览逻辑
      console.log("将创建以下索引:");

      const { MONGODB_RECOMMENDED_INDEXES } = await import(
        "../../src/lib/database/database-optimization.js"
      );

      for (const [collectionName, indexes] of Object.entries(
        MONGODB_RECOMMENDED_INDEXES
      )) {
        if (options.collection && collectionName !== options.collection) {
          continue;
        }

        console.log(`\n📁 集合: ${collectionName}`);
        for (const indexConfig of indexes) {
          console.log(
            `  - ${indexConfig.options.name}: ${indexConfig.options.comment}`
          );
        }
      }
    } else {
      // 完整优化
      console.log("\n🔧 执行完整数据库优化...");

      const report = await generateOptimizationReport();
      formatResults(report);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✨ 优化完成，耗时: ${duration}ms`);
  } catch (error) {
    console.error("\n❌ 优化过程中发生错误:");
    console.error(error);
    process.exit(1);
  }
}

// 优雅处理进程信号
process.on("SIGINT", () => {
  console.log("\n\n⚠️  收到中断信号，正在退出...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️  收到终止信号，正在退出...");
  process.exit(0);
});

// 捕获未处理的异常
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ 未处理的Promise拒绝:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ 未捕获的异常:", error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}
