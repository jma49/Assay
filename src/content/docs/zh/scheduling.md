# 定时执行

编辑检查时打开 **Run on a schedule**，填一个 cron 表达式。时间是 **UTC**。

| 表达式 | 执行时间 |
|---|---|
| `0 * * * *` | 每小时整点 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 8 * * *` | 每天 UTC 08:00 |
| `0 8 * * 1` | 每周一 UTC 08:00 |

## 谁来启动定时执行

Assay 本身不常驻一个时钟，需要有东西去启动定时执行器。执行器对每个检查**每个计划时间只执行一次**：取它的 cron 表达式最近一次到点的时间，如果这个时间还没执行过就执行。触发晚了也不会错过，重复触发也不会执行两次；超过两小时的旧计划时间会被跳过，而不是一次性全部补跑。

自托管的工作区有两种做法：

### GitHub Actions（推荐）

`.github/workflows/sql-check-cron.yml` 每 30 分钟启动一次执行器。把 `DATABASE_URL` 和 `MONGODB_URI` 加到仓库的 Secrets 后，它就会在默认分支上开始运行；没有配置时会静默跳过。也可以在 Actions 页面手动运行，选择 `scheduled`（到点的检查）或 `all`（立即执行全部）。

想只看会执行哪些检查、而不真正执行：

```bash
DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/run-all-scripts.ts scheduled --dry-run
```

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
