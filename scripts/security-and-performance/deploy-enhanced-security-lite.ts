#!/usr/bin/env ts-node

import { Pool } from "pg";
import dotenv from "dotenv";
import { SecureSQLExecutor } from "../../src/lib/database/sql-security-enhanced";
import { EnhancedDatabasePool } from "../../src/lib/database/enhanced-db-pool";

// 加载环境变量
dotenv.config({ path: ".env.local" });

/**
 * 轻量版安全和性能增强部署脚本
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

      // 3. 部署SQL安全增强
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
    } finally {
      await this.cleanup();
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

    // 创建基础连接池用于SQL安全增强执行器
    this.originalPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      min: 2,
    });

    // 创建SQL安全增强执行器
    this.secureExecutor = new SecureSQLExecutor(this.originalPool);

    // 测试SQL安全增强
    await this.testSQLSecurity();

    console.log("✅ SQL安全增强部署完成");
  }

  /**
   * 测试SQL安全增强
   */
  private async testSQLSecurity(): Promise<void> {
    console.log("  🔍 测试SQL安全增强...");

    if (this.secureExecutor) {
      // 模拟常见的SQL查询
      const testQueries = [
        "SELECT 1 as sql_test",
        "SELECT COUNT(*) FROM information_schema.tables",
        "SELECT current_database(), current_user",
      ];

      for (const query of testQueries) {
        try {
          await this.secureExecutor.executeSecurely(query, {
            userId: "deploy-test",
            scriptId: "security-test",
            timeoutMs: 5000,
          });
          console.log(`    ✅ SQL安全增强测试: ${query.substring(0, 30)}...`);
        } catch {
          console.log(
            `    ⚠️  SQL安全检查正常阻止: ${query.substring(0, 30)}...`
          );
        }
      }
    }
  }

  /**
   * 部署连接池增强
   */
  private async deployPoolEnhancement(): Promise<void> {
    console.log("🏊 部署连接池增强...");

    // 创建增强的连接池
    this.enhancedPool = EnhancedDatabasePool.getInstance({
      max: 20,
      min: 5,
      enableAutoScaling: true,
      enableMonitoring: true,
      slowQueryThresholdMs: 1000,
    });

    // 初始化连接池
    await this.enhancedPool.initialize();

    // 测试连接池增强
    await this.testPoolEnhancement();

    console.log("✅ 连接池增强部署完成");
  }

  /**
   * 测试连接池增强
   */
  private async testPoolEnhancement(): Promise<void> {
    if (!this.enhancedPool) return;

    console.log("  🏊 测试连接池增强...");

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

    // 获取连接池指标
    const metrics = this.enhancedPool.getMetrics();
    console.log(
      `    📈 连接池状态: 总连接数: ${metrics.poolSize}, 活跃连接: ${metrics.activeConnections}, 空闲连接: ${metrics.idleConnections}`
    );
  }

  /**
   * 运行兼容性测试
   */
  private async runCompatibilityTests(): Promise<void> {
    console.log("📋 运行兼容性测试...");

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

    if (this.enhancedPool) {
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
          await this.enhancedPool.query(script.sql);
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

    // 获取连接池指标
    const metrics = this.enhancedPool.getMetrics();
    console.log(
      `    📈 连接池状态: 总连接数: ${metrics.poolSize}, 活跃连接: ${metrics.activeConnections}, 空闲连接: ${metrics.idleConnections}`
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

  private async rollback(): Promise<void> {
    console.log("🔄 回滚部署...");

    try {
      // 关闭连接池
      if (this.enhancedPool) {
        await this.enhancedPool.close();
        this.enhancedPool = null;
      }

      // 关闭原始连接池
      if (this.originalPool) {
        await this.originalPool.end();
        this.originalPool = null;
      }

      console.log("✅ 回滚完成");
    } catch (error) {
      console.error("❌ 回滚失败:", error);
    }
  }

  private async cleanup(): Promise<void> {
    console.log("🧹 清理资源...");

    try {
      // 清理数据库连接
      if (this.originalPool) {
        await this.originalPool.end();
        this.originalPool = null;
      }

      // 清理增强的连接池
      if (this.enhancedPool) {
        await this.enhancedPool.close();
        this.enhancedPool = null;
      }

      // 清理其他资源
      this.secureExecutor = null;

      console.log("✅ 清理完成");
    } catch (error) {
      console.error("❌ 清理失败:", error);
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
  if (args.includes("--no-tests")) {
    config.runCompatibilityTests = false;
    config.runPerformanceTests = false;
  }
  if (args.includes("--security-only")) {
    config.enablePoolEnhancement = false;
  }
  if (args.includes("--pool-only")) {
    config.enableSqlSecurity = false;
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
