# 已禁用的 Vercel 定时任务配置

## 状态：已在 v0.1.8 中禁用

为了准备 v0.1.9 版本的本地执行器架构，原有的 Vercel 定时任务配置已被移除。

## 原配置内容

以下是之前在 `vercel.json` 中的定时任务配置：

```json
{
  "crons": [
    {
      "path": "/api/run-scheduled-scripts",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**说明：**

- **路径**：`/api/run-scheduled-scripts`
- **时间**：`0 10 * * *` (每天上午 10 点 UTC)
- **功能**：执行所有启用定时任务的脚本

## 迁移计划

### v0.1.9 本地执行器将替代此功能

1. **本地任务调度器** (`scripts/task-scheduler.ts`)

   - 读取 MongoDB 中的脚本配置
   - 根据 `isScheduled` 和 `cronSchedule` 字段创建本地 cron 任务
   - 支持动态更新和监听脚本变更

2. **配置迁移**

   - 所有现有的 `isScheduled=true` 脚本将自动迁移
   - `cronSchedule` 字段将直接用于本地调度器
   - 无需手动重新配置

3. **优势**
   - 🔒 安全访问生产数据库
   - ⚡ 更灵活的任务调度
   - 🔄 更好的错误处理和重试机制
   - 📊 实时任务状态监控

## 恢复方法

如果需要临时恢复 Vercel 定时任务，请将以上配置重新添加到 `vercel.json` 文件中，并确保 `/api/run-scheduled-scripts` API 已启用。

## 相关文件

- `vercel.json` - 已清空配置
- `src/app/api/run-scheduled-scripts/route.ts` - API 已禁用，返回状态信息
- `src/components/scripts/ScriptMetadataForm.tsx` - 前端 UI 保留，添加了状态提示
- `README.md` - 包含 v0.1.9 详细开发计划

---

_最后更新：v0.1.8 - 2025 年 5 月_
