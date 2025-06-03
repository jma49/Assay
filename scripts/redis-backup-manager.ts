#!/usr/bin/env ts-node

/**
 * Redis备份管理器
 * 功能：
 * 1. 自动备份Redis dump文件
 * 2. 按日期重命名
 * 3. 保留最近N次记录
 * 4. 清理过期备份
 */

import * as fs from "fs";
import * as path from "path";

interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  dumpFileName: string;
  backupPrefix: string;
}

class RedisBackupManager {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupDir: path.join(process.cwd(), "data", "redis"),
      maxBackups: 5, // 保留最近5次备份
      dumpFileName: "dump.rdb",
      backupPrefix: "dump_backup_",
      ...config,
    };
  }

  /**
   * 生成备份文件名
   */
  private generateBackupFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `${this.config.backupPrefix}${dateStr}.rdb`;
  }

  /**
   * 获取所有备份文件列表（按时间排序）
   */
  private getBackupFiles(): string[] {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      return [];
    }

    const files = fs
      .readdirSync(this.config.backupDir)
      .filter(
        (file) =>
          file.startsWith(this.config.backupPrefix) && file.endsWith(".rdb")
      )
      .map((file) => {
        const filePath = path.join(this.config.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // 按修改时间倒序
      .map((item) => item.name);

    return files;
  }

  /**
   * 清理过期备份
   */
  private cleanupOldBackups(): void {
    const backupFiles = this.getBackupFiles();

    if (backupFiles.length <= this.config.maxBackups) {
      return;
    }

    const filesToDelete = backupFiles.slice(this.config.maxBackups);

    console.log(`🗑️  清理过期备份，保留最近 ${this.config.maxBackups} 个文件`);

    filesToDelete.forEach((fileName) => {
      const filePath = path.join(this.config.backupDir, fileName);
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✅ 已删除: ${fileName}`);
      } catch (error) {
        console.error(`   ❌ 删除失败: ${fileName}`, error);
      }
    });
  }

  /**
   * 创建备份
   */
  public createBackup(): boolean {
    const currentDumpPath = path.join(
      this.config.backupDir,
      this.config.dumpFileName
    );

    // 检查当前dump文件是否存在
    if (!fs.existsSync(currentDumpPath)) {
      console.log(`⚠️  Redis dump文件不存在: ${currentDumpPath}`);
      return false;
    }

    // 检查文件是否有内容
    const stats = fs.statSync(currentDumpPath);
    if (stats.size === 0) {
      console.log(`⚠️  Redis dump文件为空，跳过备份`);
      return false;
    }

    // 生成备份文件名
    const backupFileName = this.generateBackupFileName();
    const backupPath = path.join(this.config.backupDir, backupFileName);

    try {
      // 复制文件
      fs.copyFileSync(currentDumpPath, backupPath);

      console.log(`📦 Redis备份已创建:`);
      console.log(`   源文件: ${this.config.dumpFileName}`);
      console.log(`   备份文件: ${backupFileName}`);
      console.log(`   文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

      // 清理过期备份
      this.cleanupOldBackups();

      return true;
    } catch (error) {
      console.error(`❌ 备份失败:`, error);
      return false;
    }
  }

  /**
   * 列出所有备份
   */
  public listBackups(): void {
    const backupFiles = this.getBackupFiles();

    if (backupFiles.length === 0) {
      console.log(`📁 备份目录为空: ${this.config.backupDir}`);
      return;
    }

    console.log(`📁 Redis备份列表 (${this.config.backupDir}):`);
    console.log(`   保留策略: 最近 ${this.config.maxBackups} 个备份\n`);

    backupFiles.forEach((fileName, index) => {
      const filePath = path.join(this.config.backupDir, fileName);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const timeStr = stats.mtime.toLocaleString("zh-CN");

      console.log(`   ${index + 1}. ${fileName}`);
      console.log(`      时间: ${timeStr}`);
      console.log(`      大小: ${sizeKB} KB\n`);
    });
  }

  /**
   * 恢复备份
   */
  public restoreBackup(backupFileName: string): boolean {
    const backupPath = path.join(this.config.backupDir, backupFileName);
    const currentDumpPath = path.join(
      this.config.backupDir,
      this.config.dumpFileName
    );

    if (!fs.existsSync(backupPath)) {
      console.error(`❌ 备份文件不存在: ${backupFileName}`);
      return false;
    }

    try {
      // 备份当前文件（如果存在）
      if (fs.existsSync(currentDumpPath)) {
        const tempBackupName = `${
          this.config.dumpFileName
        }.restore_backup_${Date.now()}`;
        const tempBackupPath = path.join(this.config.backupDir, tempBackupName);
        fs.copyFileSync(currentDumpPath, tempBackupPath);
        console.log(`📦 当前文件已备份为: ${tempBackupName}`);
      }

      // 恢复备份
      fs.copyFileSync(backupPath, currentDumpPath);
      console.log(
        `✅ 已恢复备份: ${backupFileName} -> ${this.config.dumpFileName}`
      );

      return true;
    } catch (error) {
      console.error(`❌ 恢复失败:`, error);
      return false;
    }
  }
}

// CLI 接口
async function main() {
  const manager = new RedisBackupManager();
  const command = process.argv[2];

  switch (command) {
    case "backup":
      manager.createBackup();
      break;

    case "list":
      manager.listBackups();
      break;

    case "restore":
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error("❌ 请指定要恢复的备份文件名");
        console.log("用法: npm run redis:restore <backup_file_name>");
        process.exit(1);
      }
      manager.restoreBackup(backupFile);
      break;

    default:
      console.log("Redis备份管理器");
      console.log("");
      console.log("用法:");
      console.log("  npm run redis:backup  - 创建备份");
      console.log("  npm run redis:list    - 列出备份");
      console.log("  npm run redis:restore <file> - 恢复备份");
      console.log("");
      console.log("配置:");
      console.log(`  备份目录: data/redis/`);
      console.log(`  保留数量: 5 个最近的备份`);
      console.log(`  自动清理: 是`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { RedisBackupManager };
