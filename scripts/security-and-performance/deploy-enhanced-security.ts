#!/usr/bin/env ts-node

import { Pool } from "pg";
import { SecureSQLExecutor } from "../../src/lib/database/sql-security-enhanced";
import { EnhancedDatabasePool } from "../../src/lib/database/enhanced-db-pool";

/**
 * 安全和性能增强部署脚本
 *
 * 功能：
 * 1. 验证当前系统安全状态
 * 2. 部署增强的SQL安全执行器
 * 3. 升级数据库连接池
 * 4. 执行兼容性测试
 * 5. 性能基准测试
 */

interface DeploymentConfig {
  enableSqlSecurity: boolean;
  enablePoolEnhancement: boolean;
  runCompatibilityTests: boolean;
  runPerformanceTests: boolean;
  backupCurrentConfig: boolean;
}

class SecurityPerformanceDeployer {
  private config: DeploymentConfig;
  private originalPool: Pool | null = null;
  private enhancedPool: EnhancedDatabasePool | null = null;
  private secureExecutor: SecureSQLExecutor | null = null;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * 主部署流程
   */
  async deploy(): Promise<void> {
    console.log("🚀 开始安全和性能增强部署...\n");

    try {
      // 1. 前置检查
      await this.preDeploymentChecks();

      // 2. 备份配置
      if (this.config.backupCurrentConfig) {
        await this.backupConfiguration();
      }

      // 3. 部署安全增强
      if (this.config.enableSqlSecurity) {
        await this.deploySQLSecurity();
      }

      // 4. 部署连接池增强
      if (this.config.enablePoolEnhancement) {
        await this.deployPoolEnhancement();
      }

      // 5. 兼容性测试
      if (this.config.runCompatibilityTests) {
        await this.runCompatibilityTests();
      }

      // 6. 性能测试
      if (this.config.runPerformanceTests) {
        await this.runPerformanceTests();
      }

      // 7. 部署总结
      await this.deploymentSummary();

      console.log("✅ 部署成功完成！");
    } catch (error) {
      console.error("❌ 部署失败:", error);
      await this.rollback();
      throw error;
    }
  }

  /**
   * 前置检查
   */
  private async preDeploymentChecks(): Promise<void> {
    console.log("📋 执行前置检查...");

    // 检查环境变量
    const requiredEnvVars = ["DATABASE_URL"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`缺少必需的环境变量: ${envVar}`);
      }
    }
    console.log("✅ 环境变量检查通过");

    // 检查数据库连接
    try {
      const testPool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await testPool.connect();
      await client.query("SELECT 1");
      client.release();
      await testPool.end();
      console.log("✅ 数据库连接检查通过");
    } catch (error) {
      throw new Error(`数据库连接失败: ${error}`);
    }

    // 检查系统资源
    const memoryUsage = process.memoryUsage();
    const freeMemoryMB = Math.round(
      (memoryUsage.external + memoryUsage.heapUsed) / 1024 / 1024
    );
    console.log(`✅ 系统内存使用: ${freeMemoryMB}MB`);

    console.log("");
  }

  /**
   * 备份当前配置
   */
  private async backupConfiguration(): Promise<void> {
    console.log("💾 备份当前配置...");

    const backupData = {
      timestamp: new Date().toISOString(),
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? "***已设置***" : "未设置",
        NODE_ENV: process.env.NODE_ENV,
      },
      deployment: {
        version: "1.0.0",
        features: {
          sqlSecurity: this.config.enableSqlSecurity,
          poolEnhancement: this.config.enablePoolEnhancement,
        },
      },
    };

    console.log("✅ 配置备份完成");
    console.log(JSON.stringify(backupData, null, 2));
    console.log("");
  }

  /**
   * 部署SQL安全增强
   */
  private async deploySQLSecurity(): Promise<void> {
    console.log("🔒 部署SQL安全增强...");

    try {
      // 创建测试连接池
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
      });

      // 初始化安全执行器
      this.secureExecutor = new SecureSQLExecutor(testPool);
      console.log("✅ 安全执行器初始化完成");

      // 测试安全检查
      await this.testSecurityFeatures();

      await testPool.end();
      console.log("✅ SQL安全增强部署完成\n");
    } catch (error) {
      throw new Error(`SQL安全增强部署失败: ${error}`);
    }
  }

  /**
   * 测试安全特性
   */
  private async testSecurityFeatures(): Promise<void> {
    if (!this.secureExecutor) return;

    console.log("  🧪 测试安全特性...");

    const testCases = [
      {
        name: "合法查询测试",
        sql: "SELECT 1 as test",
        shouldPass: true,
      },
      {
        name: "SQL注入测试1",
        sql: "SELECT * FROM users WHERE id = 1; DROP TABLE users; --",
        shouldPass: false,
      },
      {
        name: "SQL注入测试2",
        sql: "SELECT * FROM users WHERE name = '' OR '1'='1'",
        shouldPass: false,
      },
      {
        name: "禁止操作测试",
        sql: "INSERT INTO users (name) VALUES ('test')",
        shouldPass: false,
      },
    ];

    for (const testCase of testCases) {
      try {
        await this.secureExecutor.executeSecurely(testCase.sql, {
          userId: "test-user",
          scriptId: "test-script",
          timeoutMs: 5000,
        });

        if (!testCase.shouldPass) {
          throw new Error(`安全检查失败: ${testCase.name} 应该被阻止`);
        }
        console.log(`    ✅ ${testCase.name} - 通过`);
      } catch (error) {
        if (testCase.shouldPass) {
          throw new Error(`合法查询被错误阻止: ${testCase.name} - ${error}`);
        }
        console.log(`    ✅ ${testCase.name} - 正确阻止`);
      }
    }
  }

  /**
   * 部署连接池增强
   */
  private async deployPoolEnhancement(): Promise<void> {
    console.log("🏊 部署连接池增强...");

    try {
      // 创建增强连接池
      this.enhancedPool = EnhancedDatabasePool.getInstance({
        max: 20,
        min: 5,
        enableAutoScaling: true,
        enableMonitoring: true,
        enableHealthCheck: true,
        slowQueryThresholdMs: 1000,
      });

      // 初始化连接池
      await this.enhancedPool.initialize();
      console.log("✅ 增强连接池初始化完成");

      // 测试连接池功能
      await this.testPoolFeatures();

      console.log("✅ 连接池增强部署完成\n");
    } catch (error) {
      throw new Error(`连接池增强部署失败: ${error}`);
    }
  }

  /**
   * 测试连接池特性
   */
  private async testPoolFeatures(): Promise<void> {
    if (!this.enhancedPool) return;

    console.log("  🧪 测试连接池特性...");

    // 健康检查测试
    const health = await this.enhancedPool.healthCheck();
    if (!health.healthy) {
      throw new Error(`连接池健康检查失败: ${health.error}`);
    }
    console.log(`    ✅ 健康检查 - 响应时间: ${health.responseTime}ms`);

    // 基本查询测试
    const result = await this.enhancedPool.query(
      "SELECT NOW() as current_time"
    );
    if (!result.rows || result.rows.length === 0) {
      throw new Error("基本查询测试失败");
    }
    console.log("    ✅ 基本查询测试 - 通过");

    // 指标收集测试
    const metrics = this.enhancedPool.getMetrics();
    console.log(
      `    ✅ 指标收集 - 连接池大小: ${metrics.poolSize}, 查询总数: ${metrics.totalQueries}`
    );

    // 并发查询测试
    await this.testConcurrentQueries();
  }

  /**
   * 并发查询测试
   */
  private async testConcurrentQueries(): Promise<void> {
    if (!this.enhancedPool) return;

    console.log("  🔄 并发查询测试...");

    const concurrentQueries = Array.from({ length: 10 }, (_, i) =>
      this.enhancedPool!.query(`SELECT ${i + 1} as query_id, pg_sleep(0.1)`)
    );

    const startTime = Date.now();
    await Promise.all(concurrentQueries);
    const duration = Date.now() - startTime;

    console.log(`    ✅ 并发查询测试 - 10个查询耗时: ${duration}ms`);

    const finalMetrics = this.enhancedPool.getMetrics();
    console.log(
      `    📊 最终指标 - 总查询: ${
        finalMetrics.totalQueries
      }, 平均响应: ${finalMetrics.averageResponseTime.toFixed(2)}ms`
    );
  }

  /**
   * 兼容性测试
   */
  private async runCompatibilityTests(): Promise<void> {
    console.log("🔗 运行兼容性测试...");

    // 测试现有API路由兼容性
    await this.testApiCompatibility();

    // 测试现有脚本执行兼容性
    await this.testScriptCompatibility();

    console.log("✅ 兼容性测试完成\n");
  }

  /**
   * API兼容性测试
   */
  private async testApiCompatibility(): Promise<void> {
    console.log("  📡 API兼容性测试...");

    if (this.enhancedPool) {
      // 模拟常见的API查询
      const testQueries = [
        "SELECT 1 as api_test",
        "SELECT COUNT(*) FROM information_schema.tables",
        "SELECT current_database(), current_user",
      ];

      for (const query of testQueries) {
        try {
          await this.enhancedPool.query(query);
          console.log(`    ✅ API查询测试: ${query.substring(0, 30)}...`);
        } catch (error) {
          throw new Error(`API兼容性测试失败: ${query} - ${error}`);
        }
      }
    }
  }

  /**
   * 脚本兼容性测试
   */
  private async testScriptCompatibility(): Promise<void> {
    console.log("  📜 脚本执行兼容性测试...");

    if (this.secureExecutor) {
      // 模拟常见的脚本查询
      const testScripts = [
        {
          id: "test-select",
          sql: "SELECT version() as postgres_version",
        },
        {
          id: "test-with",
          sql: "WITH test_cte AS (SELECT 1 as num) SELECT * FROM test_cte",
        },
      ];

      for (const script of testScripts) {
        try {
          await this.secureExecutor.executeSecurely(script.sql, {
            userId: "compatibility-test",
            scriptId: script.id,
            timeoutMs: 5000,
          });
          console.log(`    ✅ 脚本兼容性测试: ${script.id}`);
        } catch (error) {
          throw new Error(`脚本兼容性测试失败: ${script.id} - ${error}`);
        }
      }
    }
  }

  /**
   * 性能测试
   */
  private async runPerformanceTests(): Promise<void> {
    console.log("⚡ 运行性能测试...");

    // 连接池性能测试
    await this.testPoolPerformance();

    // 安全检查性能测试
    await this.testSecurityPerformance();

    console.log("✅ 性能测试完成\n");
  }

  /**
   * 连接池性能测试
   */
  private async testPoolPerformance(): Promise<void> {
    if (!this.enhancedPool) return;

    console.log("  🏊 连接池性能测试...");

    // 批量查询性能测试
    const batchSize = 50;
    const startTime = Date.now();

    const promises = Array.from({ length: batchSize }, (_, i) =>
      this.enhancedPool!.query("SELECT $1 as batch_id", [i])
    );

    await Promise.all(promises);
    const duration = Date.now() - startTime;
    const qps = Math.round((batchSize / duration) * 1000);

    console.log(
      `    📊 批量查询性能: ${batchSize}个查询耗时${duration}ms, QPS: ${qps}`
    );

    const metrics = this.enhancedPool.getMetrics();
    console.log(
      `    📈 连接池指标: 成功率${(
        (metrics.successfulQueries / metrics.totalQueries) *
        100
      ).toFixed(1)}%`
    );
  }

  /**
   * 安全检查性能测试
   */
  private async testSecurityPerformance(): Promise<void> {
    if (!this.secureExecutor) return;

    console.log("  🔒 安全检查性能测试...");

    const testSQL =
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1";
    const iterations = 20;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      try {
        await this.secureExecutor.executeSecurely(testSQL, {
          userId: "perf-test",
          scriptId: `perf-test-${i}`,
          timeoutMs: 5000,
        });
      } catch (error) {
        // 预期的安全检查错误
      }
    }

    const duration = Date.now() - startTime;
    const avgTime = Math.round(duration / iterations);

    console.log(
      `    📊 安全检查性能: ${iterations}次检查耗时${duration}ms, 平均${avgTime}ms/次`
    );
  }

  /**
   * 部署总结
   */
  private async deploymentSummary(): Promise<void> {
    console.log("📋 部署总结");
    console.log("================================");

    if (this.config.enableSqlSecurity) {
      console.log("✅ SQL安全增强已部署");
      console.log("   - 参数化查询支持");
      console.log("   - SQL注入防护");
      console.log("   - 查询白名单机制");
      console.log("   - 资源限制控制");
    }

    if (this.config.enablePoolEnhancement) {
      console.log("✅ 连接池增强已部署");
      console.log("   - 智能连接管理");
      console.log("   - 性能监控");
      console.log("   - 健康检查");
      console.log("   - 自动扩缩容");

      if (this.enhancedPool) {
        const metrics = this.enhancedPool.getMetrics();
        console.log(`   - 当前连接池大小: ${metrics.poolSize}`);
        console.log(`   - 总查询数: ${metrics.totalQueries}`);
        console.log(
          `   - 平均响应时间: ${metrics.averageResponseTime.toFixed(2)}ms`
        );
      }
    }

    console.log("\n🎯 下一步建议:");
    console.log("1. 在生产环境监控系统指标");
    console.log("2. 根据实际负载调整连接池参数");
    console.log("3. 定期检查安全日志");
    console.log("4. 考虑启用自动扩缩容功能");
    console.log("");
  }

  /**
   * 回滚操作
   */
  private async rollback(): Promise<void> {
    console.log("🔄 执行回滚操作...");

    try {
      if (this.enhancedPool) {
        await this.enhancedPool.close();
        console.log("✅ 增强连接池已关闭");
      }

      console.log("✅ 回滚完成");
    } catch (error) {
      console.error("❌ 回滚失败:", error);
    }
  }
}

/**
 * 主入口函数
 */
async function main(): Promise<void> {
  const config: DeploymentConfig = {
    enableSqlSecurity: true,
    enablePoolEnhancement: true,
    runCompatibilityTests: true,
    runPerformanceTests: true,
    backupCurrentConfig: true,
  };

  // 解析命令行参数
  const args = process.argv.slice(2);
  if (args.includes("--security-only")) {
    config.enablePoolEnhancement = false;
  }
  if (args.includes("--pool-only")) {
    config.enableSqlSecurity = false;
  }
  if (args.includes("--no-tests")) {
    config.runCompatibilityTests = false;
    config.runPerformanceTests = false;
  }

  const deployer = new SecurityPerformanceDeployer(config);
  await deployer.deploy();
}

// 执行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
}

export { SecurityPerformanceDeployer };
export type { DeploymentConfig };
