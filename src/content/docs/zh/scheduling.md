# 定时执行

编辑检查时打开 **按计划自动执行**，默认是每天 09:00 UTC；在 **重复** 里选其他时间，或选 **自定义（cron）…** 填一个 5 个字段的 cron 表达式。时间是 **UTC**，表单会按你所在的时区显示下次执行时间。

| 预设 | Cron |
|---|---|
| 每 30 分钟 | `*/30 * * * *` |
| 每小时 | `0 * * * *` |
| 每天 00:00 / 09:00 UTC | `0 0 * * *` / `0 9 * * *` |
| 工作日 09:00 UTC | `0 9 * * 1-5` |
| 每周一 09:00 UTC | `0 9 * * 1` |
| 每月 1 日 09:00 UTC | `0 9 1 * *` |

无效的表达式无法保存。使用下面的 GitHub Actions 方式时，无论表达式怎么写，一个检查最多每 30 分钟执行一次。

## 谁来启动定时执行

Assay 本身不常驻一个时钟，需要有东西去启动定时执行器。执行器对每个检查**每个计划时间只执行一次**：取它的 cron 表达式最近一次到点的时间，如果这个时间还没执行过就执行。触发晚了也不会错过，重复触发也不会执行两次；超过两小时的旧计划时间会被跳过，而不是一次性全部补跑。

自托管的工作区有两种做法：

### GitHub Actions（推荐）

`.github/workflows/sql-check-cron.yml` 每 30 分钟启动一次执行器。把 `DATABASE_URL` 和 `MONGODB_URI` 加到仓库的 Secrets 后，它就会在默认分支上开始运行；没有配置时会静默跳过。也可以在 Actions 页面手动运行，选择 `scheduled`（到点的检查）或 `all`（立即执行全部），或者填写 **check_id** 只执行这一个检查。手动运行后同样会发送告警。

执行器读取的配置和应用相同，所以在托管平台上设置过的，也要在 GitHub 上设置；没有设置的使用默认值：

| 名称 | 设置为 | 何时需要 |
|---|---|---|
| `DATABASE_URL`、`MONGODB_URI` | Secret | 必需 |
| `APP_URL`、`CRON_SECRET` | Secret | 定时执行后立即发送告警 |
| `CA_CERT_BLOB_URL`、`CLIENT_CERT_BLOB_URL`、`CLIENT_KEY_BLOB_URL` | Secret | PostgreSQL 使用私有 CA 或客户端证书 |
| `MONGODB_DB_NAME` | Variable | `MONGODB_URI` 里没有数据库名，且你用的不是默认名称 |
| `CHECK_TIMEOUT_MS`、`RUN_RETENTION_DAYS` | Variable | 你在托管平台上改过它们 |
| `CHECK_CONCURRENCY`、`PG_POOL_MAX` | Variable | 可选；同时执行的检查数和 PostgreSQL 连接数 |

Secret 加在 **Settings → Secrets and variables → Actions → Secrets**，其余加在 **Variables**。公开仓库的工作流日志是公开的，所以日志里只显示每个检查的 ID、结果和行数；错误信息只保存在应用里。

想只看会执行哪些检查、而不真正执行：

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/run-all-scripts.ts scheduled --dry-run
```

### 自己的服务器

用系统 cron 每 5 分钟调用同一个命令即可。无论调用多频繁，每个定时检查在每个时间槽只执行一次：

```cron
*/5 * * * * cd /srv/assay && npm run sql:run-scheduled >> /var/log/assay-checks.log 2>&1
```

## 手动执行定时检查

在**执行记录**页点 **批量执行…**，选择只执行定时检查，所有定时检查会立即执行，不管现在几点。

## 另见

- [执行检查](/docs/running-checks)
- [部署](/docs/deployment)
