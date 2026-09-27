# 定时执行

编辑检查时打开 **Run on a schedule**，填一个 cron 表达式。时间是 **UTC**。

| 表达式 | 执行时间 |
|---|---|
| `0 * * * *` | 每小时整点 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 8 * * *` | 每天 UTC 08:00 |
| `0 8 * * 1` | 每周一 UTC 08:00 |

## 谁来启动定时执行

Assay 本身不常驻一个时钟，需要有东西去启动定时执行器。执行器会运行所有 cron 表达式与当前时间匹配（30 分钟内）的检查。自托管的工作区有两种做法：

### GitHub Actions

仓库里有 `.github/workflows/sql-check-cron.yml`。把 `DATABASE_URL` 和 `MONGODB_URI` 加到仓库的 Secrets，再启用它的 `schedule:` 触发器即可。也可以在 Actions 页面手动运行，并选择模式（`scheduled`、`all` 或 `backup`）。

### 一台常驻的小服务器

运行独立的定时器，它会从 MongoDB 读取每个检查的时间表，并按各自的时间执行：

```bash
npm run scheduler
```

## 手动执行定时检查

在仪表盘选 **Bulk Execution → Execute Scheduled Scripts**，会立即执行所有定时检查，不管现在几点。

## 另见

- [执行检查](/docs/running-checks)
- [部署](/docs/deployment)
