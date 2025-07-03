#!/usr/bin/env node

/**
 * 独立定时任务调度器
 *
 * 功能特性：
 * - 支持秒级精度定时任务
 * - 动态加载数据库中的脚本配置
 * - 支持高频执行（每分钟、每5分钟等）
 * - Web API 管理接口
 * - 健康检查和监控
 * - 优雅关闭和重启
 */

import express from "express";
import * as cron from "node-cron";
import { getMongoDbClient } from "../../src/lib/database/mongodb";
import { executeSqlScriptFromDb } from "../core/sql-executor";
import { Collection, Document } from "mongodb";

interface ScheduledScript {
  scriptId: string;
  name: string;
  cronSchedule: string;
  sqlContent: string;
  isScheduled: boolean;
  lastExecuted?: Date;
  nextExecution?: Date;
  status: "active" | "paused" | "error";
  hashtags?: string[];
}

interface TaskInfo {
  scriptId: string;
  cronSchedule: string;
  task: cron.ScheduledTask;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  errorCount: number;
}

class TaskScheduler {
  private tasks: Map<string, TaskInfo> = new Map();
  private app: express.Application;
  private server: any;
  private isShuttingDown: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 3001) {
    this.app = express();
    this.setupExpress();
    this.setupGracefulShutdown();
  }

  private setupExpress(): void {
    this.app.use(express.json());

    // 健康检查端点
    this.app.get("/health", (req: any, res: any) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        activeTasks: this.tasks.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    // 获取所有任务状态
    this.app.get("/tasks", (req: any, res: any) => {
      const taskList = Array.from(this.tasks.entries()).map(
        ([scriptId, task]) => ({
          scriptId,
          cronSchedule: task.cronSchedule,
          lastExecuted: task.lastExecuted,
          nextExecution: task.nextExecution,
          executionCount: task.executionCount,
          errorCount: task.errorCount,
          isRunning: task.task.getStatus() === "scheduled",
        })
      );

      res.json({
        tasks: taskList,
        totalTasks: this.tasks.size,
        timestamp: new Date().toISOString(),
      });
    });

    // 暂停任务
    this.app.post("/tasks/:scriptId/pause", (req: any, res: any) => {
      const { scriptId } = req.params;
      const task = this.tasks.get(scriptId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      task.task.stop();
      res.json({ message: `Task ${scriptId} paused`, scriptId });
    });

    // 恢复任务
    this.app.post("/tasks/:scriptId/resume", (req: any, res: any) => {
      const { scriptId } = req.params;
      const task = this.tasks.get(scriptId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      task.task.start();
      res.json({ message: `Task ${scriptId} resumed`, scriptId });
    });

    // 手动执行任务
    this.app.post(
      "/tasks/:scriptId/execute",
      async (req: any, res: any) => {
        const { scriptId } = req.params;
        const task = this.tasks.get(scriptId);

        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }

        try {
          await this.executeScript(scriptId);
          res.json({ message: `Task ${scriptId} executed manually`, scriptId });
        } catch (error) {
          res.status(500).json({
            error: "Execution failed",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // 重新加载所有任务
    this.app.post(
      "/reload",
      async (req: any, res: any) => {
        try {
          await this.reloadTasks();
          res.json({
            message: "Tasks reloaded successfully",
            activeTasks: this.tasks.size,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          res.status(500).json({
            error: "Failed to reload tasks",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;

      console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);
      this.isShuttingDown = true;

      // 停止所有定时任务
      console.log("⏹️  停止所有定时任务...");
      for (const [scriptId, taskInfo] of this.tasks) {
        taskInfo.task.stop();
        console.log(`  - 已停止任务: ${scriptId}`);
      }

      // 停止健康检查
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // 关闭HTTP服务器
      if (this.server) {
        console.log("🌐 关闭HTTP服务器...");
        this.server.close(() => {
          console.log("✅ 优雅关闭完成");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  async start(): Promise<void> {
    try {
      console.log("🚀 启动定时任务调度器...");

      // 加载初始任务
      await this.loadTasksFromDatabase();

      // 启动HTTP服务器
      this.server = this.app.listen(this.port, () => {
        console.log(`🌐 管理API服务器已启动: http://localhost:${this.port}`);
        console.log(`📊 健康检查: http://localhost:${this.port}/health`);
        console.log(`📋 任务状态: http://localhost:${this.port}/tasks`);
      });

      // 设置定期重新加载任务（每5分钟检查一次数据库变化）
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.reloadTasks();
        } catch (error) {
          console.error("🔄 定期重新加载任务失败:", error);
        }
      }, 5 * 60 * 1000);

      console.log("✅ 定时任务调度器启动完成");
      console.log(`📅 活跃任务数量: ${this.tasks.size}`);
    } catch (error) {
      console.error("❌ 启动失败:", error);
      process.exit(1);
    }
  }

  private async loadTasksFromDatabase(): Promise<void> {
    try {
      const collection = await this.getSqlScriptsCollection();
      const scripts = await collection
        .find({ isScheduled: true, cronSchedule: { $exists: true, $ne: "" } })
        .toArray();

      console.log(`📋 从数据库加载 ${scripts.length} 个定时脚本`);

      for (const script of scripts) {
        await this.addTask({
          scriptId: script.scriptId,
          name: script.name || script.scriptId,
          cronSchedule: script.cronSchedule,
          sqlContent: script.sqlContent,
          isScheduled: script.isScheduled,
          status: "active",
          hashtags: script.hashtags || [],
        });
      }
    } catch (error) {
      console.error("❌ 加载数据库任务失败:", error);
      throw error;
    }
  }

  private async reloadTasks(): Promise<void> {
    console.log("🔄 重新加载任务...");

    // 停止并清除现有任务
    for (const [scriptId, taskInfo] of this.tasks) {
      taskInfo.task.stop();
    }
    this.tasks.clear();

    // 重新加载
    await this.loadTasksFromDatabase();
    console.log(`✅ 任务重新加载完成，当前活跃任务: ${this.tasks.size}`);
  }

  private async addTask(script: ScheduledScript): Promise<void> {
    try {
      // 验证cron表达式
      if (!cron.validate(script.cronSchedule)) {
        console.warn(
          `⚠️  跳过无效的cron表达式: ${script.scriptId} - ${script.cronSchedule}`
        );
        return;
      }

      // 创建定时任务
      const task = cron.schedule(
        script.cronSchedule,
        async () => {
          await this.executeScript(script.scriptId);
        },
        {
          timezone: "UTC", // 使用UTC时区保持一致性
        }
      );

      // 存储任务信息
      this.tasks.set(script.scriptId, {
        scriptId: script.scriptId,
        cronSchedule: script.cronSchedule,
        task,
        executionCount: 0,
        errorCount: 0,
      });

      console.log(
        `✅ 已添加定时任务: ${script.scriptId} (${script.cronSchedule})`
      );
    } catch (error) {
      console.error(`❌ 添加任务失败 ${script.scriptId}:`, error);
    }
  }

  private async executeScript(scriptId: string): Promise<void> {
    const taskInfo = this.tasks.get(scriptId);
    if (!taskInfo) {
      console.error(`❌ 任务不存在: ${scriptId}`);
      return;
    }

    try {
      console.log(`🏃 开始执行定时脚本: ${scriptId}`);
      taskInfo.lastExecuted = new Date();
      taskInfo.executionCount++;

      // 从数据库获取最新的脚本内容
      const collection = await this.getSqlScriptsCollection();
      const script = await collection.findOne({ scriptId });

      if (!script) {
        throw new Error(`脚本不存在: ${scriptId}`);
      }

      if (!script.isScheduled) {
        console.log(`⏸️  脚本已被禁用: ${scriptId}`);
        return;
      }

      // 执行脚本
      const result = await executeSqlScriptFromDb(
        scriptId,
        script.sqlContent,
        script.hashtags
      );

      if (result.success) {
        console.log(`✅ 脚本执行成功: ${scriptId} - ${result.statusType}`);
      } else {
        console.log(`⚠️  脚本执行需要关注: ${scriptId} - ${result.message}`);
        taskInfo.errorCount++;
      }
    } catch (error) {
      console.error(`❌ 脚本执行失败 ${scriptId}:`, error);
      taskInfo.errorCount++;
    }
  }

  private async getSqlScriptsCollection(): Promise<Collection<Document>> {
    const mongoDbClient = getMongoDbClient();
    const db = await mongoDbClient.getDb();
    return db.collection("sql_scripts");
  }
}

// 主函数
async function main() {
  const port = parseInt(process.env.SCHEDULER_PORT || "3001");
  const scheduler = new TaskScheduler(port);

  try {
    await scheduler.start();
  } catch (error) {
    console.error("❌ 调度器启动失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动调度器
if (require.main === module) {
  main().catch(console.error);
}

export { TaskScheduler };
