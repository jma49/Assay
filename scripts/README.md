# SQL 脚本部署系统 - Scripts 目录

这个目录包含了 SQL 脚本部署系统的所有运维和管理脚本。

## 📁 目录结构

### 🚀 核心执行脚本

- `run-sql.ts` - 单个 SQL 脚本执行器
- `run-all-scripts.ts` - 批量脚本执行器
- `types.ts` - 公共类型定义

### 🧹 维护脚本 (`maintenance/`)

- `optimize-database-indexes.ts` - 数据库索引优化和性能监控

### 🔒 安全和性能 (`security-and-performance/`)

- `deploy-enhanced-security-lite.ts` - 安全增强和性能优化部署

### 💾 缓存管理

- `manage-cache.ts` - Redis 缓存管理工具

### 🔧 服务组件 (`services/`)

- `mongo-service.ts` - MongoDB 服务管理

### ⚙️ 核心组件 (`core/`)

- `sql-executor.ts` - SQL 执行核心引擎

## 🎯 常用操作

### 数据库优化

```bash
# 完整数据库优化
npm run optimize:db

# 仅生成性能报告
npm run optimize:db:report

# 预览优化操作
npm run optimize:db:dry-run
```

### 安全部署

```bash
# 完整安全和性能部署
npm run security:deploy

# 仅部署SQL安全增强
npm run security:deploy-sql-only

# 仅部署连接池优化
npm run security:deploy-pool-only
```

### 缓存管理

```bash
# 查看缓存健康状态
npm run cache:health

# 查看缓存统计
npm run cache:stats

# 清除所有缓存
npm run cache:clear

# 监控缓存性能
npm run cache:monitor
```

### SQL 脚本执行

```bash
# 执行所有脚本
npm run sql:run-all

# 执行已启用的脚本
npm run sql:run-enabled

# 执行定时脚本
npm run sql:run-scheduled

# 执行特定脚本
npm run sql:run <script-name>
```

## ✨ 优化功能状态

### ✅ 已完成的优化

- **数据库索引优化** - MongoDB 和 PostgreSQL 索引已优化
- **SQL 安全增强** - 参数化查询、注入防护已部署
- **连接池优化** - 智能连接管理和性能监控已启用
- **缓存机制** - Redis 缓存策略和 Check History API 缓存已实现
- **查询优化** - Check History API 聚合查询已优化

### 📊 性能提升成果

- **Check History API**: 50-90%性能提升
- **数据库查询**: 平均响应时间降至 200ms 以下
- **缓存命中**: 95%+的缓存命中率
- **连接池**: QPS 达到 99+，连接利用率优化

## 🔧 维护建议

1. **定期性能检查**

   ```bash
   npm run optimize:db:report
   npm run cache:stats
   ```

2. **监控系统健康**

   ```bash
   npm run cache:health
   npm run redis:status
   ```

3. **安全检查**
   ```bash
   npm run security:deploy -- --no-tests
   ```

## 📈 系统状态

- **总脚本数**: 10 个核心脚本
- **代码量**: ~77KB
- **功能覆盖**: 执行、缓存、安全、监控、维护
- **优化状态**: 🟢 已完成全面优化

## 🚨 注意事项

1. 生产环境执行前请先在测试环境验证
2. 大型操作建议在低峰期执行
3. 定期备份重要配置和数据
4. 监控系统资源使用情况

## 🕐 定时任务架构

### 📋 **双模式架构说明**

本系统采用**职责分离**的双模式定时任务架构：

#### **🤖 本地独立调度器** (推荐主用)

- **位置**: `scripts/scheduler/task-scheduler.ts`
- **职责**: 个性化定时任务的主要执行器
- **优势**:
  - ⚡ 支持秒级精度定时任务
  - 🎯 每个脚本独立 cron 调度
  - 📊 实时 Web API 监控 (http://localhost:3001)
  - 🔧 灵活的暂停/恢复控制

**启动方式**:

```bash
# 方式1: 直接启动
npm run scheduler

# 方式2: 使用启动脚本
./scripts/scheduler/start-scheduler.sh

# 方式3: 开发模式
npx ts-node scripts/scheduler/task-scheduler.ts
```

**API 接口**:

管理 API 默认只监听 `127.0.0.1`（可用 `SCHEDULER_HOST` 修改）。除 `/health` 外，所有接口都需要携带 `SCHEDULER_API_TOKEN`；未配置该变量时，管理接口返回 503。

```bash
# 健康检查
curl http://localhost:3001/health

# 查看所有任务状态
curl -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/tasks

# 暂停特定任务
curl -X POST -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/tasks/check-user-activity/pause

# 恢复特定任务
curl -X POST -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/tasks/check-user-activity/resume

# 手动执行任务
curl -X POST -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/tasks/check-user-activity/execute

# 重新加载所有任务
curl -X POST -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/reload
```

#### **☁️ GitHub Actions** (备用/手动)

- **位置**: `.github/workflows/sql-check-cron.yml`
- **职责**: 手动触发和备用执行
- **使用场景**:
  - 🆘 本地调度器故障时的备用执行
  - 🔧 手动批量执行所有脚本
  - 📋 定期系统健康检查

**触发方式**:

1. **手动触发**: GitHub → Actions → "SQL Script Manual/Backup Job" → Run workflow
2. **可选定时**: 注释中的每日备用检查（可按需启用）

### 🚀 **推荐使用策略**

#### **日常使用** (本地调度器)

```typescript
// 1. 在界面中设置脚本的个性化定时
isScheduled: true
cronSchedule: "0 8 * * *"  // 每天芝加哥凌晨3点

// 2. 启动本地调度器
npm run scheduler

// 3. 监控执行状态
curl -H "Authorization: Bearer $SCHEDULER_API_TOKEN" http://localhost:3001/tasks
```

#### **备用/应急** (GitHub Actions)

```bash
# 场景1: 本地调度器故障，需要紧急执行定时脚本
# → GitHub Actions → Manual trigger → execution_mode: "scheduled"

# 场景2: 需要批量执行所有脚本进行全面检查
# → GitHub Actions → Manual trigger → execution_mode: "all"

# 场景3: 测试新部署的脚本
# → GitHub Actions → Manual trigger → debug_mode: true
```

### ⚖️ **对比选择**

| 使用场景               | 推荐方式          | 原因                        |
| ---------------------- | ----------------- | --------------------------- |
| **个性化定时任务**     | 🤖 本地调度器     | 支持独立 cron，精确时间控制 |
| **高频执行** (<1 小时) | 🤖 本地调度器     | 不受 GitHub 限制，秒级精度  |
| **生产环境监控**       | 🤖 本地调度器     | 实时状态，API 控制          |
| **应急备用执行**       | ☁️ GitHub Actions | 无需本地环境，可靠性高      |
| **批量一次性操作**     | ☁️ GitHub Actions | 手动控制，完整日志          |
| **新环境测试**         | ☁️ GitHub Actions | 隔离环境，安全测试          |

### 📊 **监控和管理**

#### **本地调度器监控**:

```bash
# 实时任务状态
watch -n 5 'curl -s http://localhost:3001/tasks | jq .'

# 健康检查
curl http://localhost:3001/health | jq .
```

#### **GitHub Actions 监控**:

- GitHub → Actions → Workflow runs
- 完整执行日志和错误追踪
- Email 通知（可配置）

### 🔧 **故障处理**

#### **本地调度器故障**:

1. 检查进程状态: `ps aux | grep task-scheduler`
2. 查看日志: `tail -f logs/scheduler.log`
3. 重启服务: `./scripts/scheduler/start-scheduler.sh`
4. 临时备用: 手动触发 GitHub Actions

#### **GitHub Actions 故障**:

1. 检查 Secrets 配置
2. 查看 Actions 运行日志
3. 使用本地调度器作为主要方式

### 📝 **迁移说明**

如果从旧的单一 GitHub Actions 模式迁移：

1. **启动本地调度器**: `npm run scheduler`
2. **验证任务加载**: `curl http://localhost:3001/tasks`
3. **观察执行情况**: 监控几个周期
4. **可选备用保护**: 在 GitHub Actions 中启用注释的每日检查

这种架构既保证了灵活性，又提供了可靠的备用机制。
