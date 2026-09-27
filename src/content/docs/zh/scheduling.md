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

`.github/workflows/sql-check-cron.yml` 每 30 分钟启动一次执行器。把 `DATABASE_URL` 和 `MONGODB_URI` 加到仓库的 Secrets 后，它就会在默认分支上开始运行；没有配置时会静默跳过。也可以在 Actions 页面手动运行，选择 `scheduled`（到点的检查）或 `all`（立即执行全部）。

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
