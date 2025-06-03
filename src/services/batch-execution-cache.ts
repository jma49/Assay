import redisClient from "@/lib/redis";
import { Redis } from "ioredis";

/**
 * 开发环境日志辅助函数
 */
const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...args);
  }
};

const devError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.error(message, ...args);
  }
};

/**
 * 批量执行状态数据结构
 * 用于跟踪脚本执行进度和结果
 */
export interface BatchExecutionState {
  executionId: string;
  scripts: Array<{
    scriptId: string;
    scriptName: string;
    isScheduled: boolean;
    status: "pending" | "running" | "completed" | "failed" | "attention_needed";
    startTime?: string;
    endTime?: string;
    message?: string;
    findings?: string;
    mongoResultId?: string;
  }>;
  startedAt: string;
  completedAt?: string;
  totalScripts: number;
  isActive: boolean;
}

/**
 * 脚本状态更新请求
 */
export interface ScriptStatusUpdate {
  scriptId: string;
  status: "pending" | "running" | "completed" | "failed" | "attention_needed";
  message?: string;
  findings?: string;
  mongoResultId?: string;
}

/**
 * 批量执行缓存管理服务
 * 提供Redis缓存的CRUD操作，支持原子性更新和状态管理
 */
export class BatchExecutionCache {
  private redis: Redis | null = null;

  // Redis键命名规范
  private readonly KEY_PREFIX = "batch_execution:";
  private readonly ACTIVE_EXECUTIONS_SET = "active_batch_executions";

  // 缓存过期时间配置（24小时）
  private readonly DEFAULT_TTL = 24 * 60 * 60;

  /**
   * 获取Redis客户端实例
   * 延迟初始化模式，只在需要时创建连接
   */
  private async getRedis(): Promise<Redis> {
    if (!this.redis) {
      this.redis = await redisClient.getClient();
    }
    return this.redis;
  }

  /**
   * 生成执行状态的Redis键名
   */
  private getExecutionKey(executionId: string): string {
    return `${this.KEY_PREFIX}${executionId}`;
  }

  /**
   * 获取执行状态
   */
  async getExecution(executionId: string): Promise<BatchExecutionState | null> {
    try {
      const redis = await this.getRedis();
      const key = this.getExecutionKey(executionId);
      const data = await redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as BatchExecutionState;
    } catch (error) {
      devError("[BatchCache] 获取执行记录失败:", error);
      throw new Error(
        `获取执行记录失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  /**
   * 创建新的批量执行状态记录
   * 使用Redis Pipeline确保原子性操作
   */
  async createExecution(
    executionId: string,
    scripts: Array<{
      scriptId: string;
      scriptName: string;
      isScheduled: boolean;
    }>,
  ): Promise<BatchExecutionState> {
    try {
      const execution: BatchExecutionState = {
        executionId,
        scripts: scripts.map((script) => ({
          ...script,
          status: "pending",
        })),
        startedAt: new Date().toISOString(),
        totalScripts: scripts.length,
        isActive: true,
      };

      const redis = await this.getRedis();
      const key = this.getExecutionKey(executionId);

      await redis.setex(key, this.DEFAULT_TTL, JSON.stringify(execution));
      await redis.sadd(this.ACTIVE_EXECUTIONS_SET, executionId);

      devLog(`[BatchCache] 创建执行记录: ${executionId}`);
      return execution;
    } catch (error) {
      devError("[BatchCache] 创建执行记录失败:", error);
      throw new Error(
        `创建执行记录失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  /**
   * 原子性更新脚本执行状态
   * 使用Lua脚本确保状态更新的一致性和准确性
   */
  async updateScriptStatus(
    executionId: string,
    update: ScriptStatusUpdate,
  ): Promise<BatchExecutionState | null> {
    try {
      const redis = await this.getRedis();
      const key = this.getExecutionKey(executionId);

      // Lua脚本实现原子性状态更新
      const luaScript = `
        local key = KEYS[1]
        local executionData = redis.call('GET', key)
        
        if not executionData then
          return nil
        end
        
        local execution = cjson.decode(executionData)
        local scriptId = ARGV[1]
        local newStatus = ARGV[2]
        local message = ARGV[3]
        local findings = ARGV[4]
        local mongoResultId = ARGV[5]
        local currentTime = ARGV[6]
        
        -- 定位并更新目标脚本状态
        for i, script in ipairs(execution.scripts) do
          if script.scriptId == scriptId then
            local previousStatus = script.status
            script.status = newStatus
            script.message = (message ~= '') and message or nil
            script.findings = (findings ~= '') and findings or nil
            script.mongoResultId = (mongoResultId ~= '') and mongoResultId or nil
            
            -- 状态变更时间戳管理
            if newStatus == 'running' and previousStatus == 'pending' then
              script.startTime = currentTime
            elseif newStatus == 'completed' or newStatus == 'failed' or newStatus == 'attention_needed' then
              script.endTime = currentTime
            end
            
            break
          end
        end
        
        -- 检查执行完成状态
        local allCompleted = true
        for i, script in ipairs(execution.scripts) do
          if script.status ~= 'completed' and script.status ~= 'failed' and script.status ~= 'attention_needed' then
            allCompleted = false
            break
          end
        end
        
        if allCompleted and execution.isActive then
          execution.isActive = false
          execution.completedAt = currentTime
        end
        
        -- 持久化更新后的状态
        redis.call('SETEX', key, ${this.DEFAULT_TTL}, cjson.encode(execution))
        
        return cjson.encode(execution)
      `;

      const result = (await redis.eval(
        luaScript,
        1,
        key,
        update.scriptId,
        update.status,
        update.message || "",
        update.findings || "",
        update.mongoResultId || "",
        new Date().toISOString(),
      )) as string | null;

      if (!result) {
        return null;
      }

      const execution = JSON.parse(result) as BatchExecutionState;

      // 清理已完成的执行记录
      if (!execution.isActive) {
        await redis.srem(this.ACTIVE_EXECUTIONS_SET, executionId);
      }

      devLog(`[BatchCache] 更新脚本 ${update.scriptId} 状态: ${update.status}`);
      return execution;
    } catch (error) {
      devError("[BatchCache] 状态更新失败:", error);
      throw new Error(
        `脚本状态更新失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  /**
   * 完成批量执行
   */
  async completeExecution(executionId: string): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = this.getExecutionKey(executionId);

      const luaScript = `
        local key = KEYS[1]
        local executionId = ARGV[1]
        local now = ARGV[2]
        local activeSet = "${this.ACTIVE_EXECUTIONS_SET}"
        
        local execution = redis.call('GET', key)
        if not execution then
          return nil
        end
        
        local data = cjson.decode(execution)
        data.isActive = false
        data.completedAt = now
        
        redis.call('SETEX', key, ${this.DEFAULT_TTL}, cjson.encode(data))
        redis.call('SREM', activeSet, executionId)
        
        return 'OK'
      `;

      await redis.eval(
        luaScript,
        1,
        key,
        executionId,
        new Date().toISOString(),
      );
      devLog(`[BatchCache] 执行完成: ${executionId}`);
    } catch (error) {
      devError("[BatchCache] 完成标记失败:", error);
      throw new Error(
        `完成标记失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 删除执行记录
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = this.getExecutionKey(executionId);

      await redis.del(key);
      await redis.srem(this.ACTIVE_EXECUTIONS_SET, executionId);

      devLog(`[BatchCache] 删除执行记录: ${executionId}`);
    } catch (error) {
      devError("[BatchCache] 删除记录失败:", error);
      throw new Error(
        `删除记录失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 获取活跃的执行ID列表
   */
  async getActiveExecutions(): Promise<string[]> {
    try {
      const redis = await this.getRedis();
      return await redis.smembers(this.ACTIVE_EXECUTIONS_SET);
    } catch (error) {
      devError("[BatchCache] 获取活跃执行失败:", error);
      return [];
    }
  }

  /**
   * 清理非活跃的执行记录
   */
  async cleanupInactiveExecutions(): Promise<number> {
    try {
      const activeIds = await this.getActiveExecutions();
      let cleanedCount = 0;

      for (const executionId of activeIds) {
        const execution = await this.getExecution(executionId);
        if (!execution || !execution.isActive) {
          await this.deleteExecution(executionId);
          cleanedCount++;
        }
      }

      devLog(`[BatchCache] 清理非活跃记录: ${cleanedCount} 条`);
      return cleanedCount;
    } catch (error) {
      devError("[BatchCache] 清理操作失败:", error);
      return 0;
    }
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStats(): Promise<{
    activeCount: number;
    totalExecutions: number;
  }> {
    try {
      const redis = await this.getRedis();
      const activeIds = await redis.smembers(this.ACTIVE_EXECUTIONS_SET);
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await redis.keys(pattern);

      return {
        activeCount: activeIds.length,
        totalExecutions: keys.length,
      };
    } catch (error) {
      devError("[BatchCache] 获取统计信息失败:", error);
      return {
        activeCount: 0,
        totalExecutions: 0,
      };
    }
  }
}

// 导出单例服务实例
export const batchExecutionCache = new BatchExecutionCache();
