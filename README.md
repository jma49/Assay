# SQL 脚本自动化执行工具

这个项目用于自动化执行 SQL 脚本，监控数据质量，并将执行结果和摘要通过 Slack 通知。同时，详细的执行历史和查询结果行会存储在 MongoDB 中，以便后续分析和在 Dashboard 中展示。

## 主要功能

- **自动化执行:** 通过 GitHub Actions 定时或手动触发 SQL 脚本执行。
- **结果存储:** 将每次执行的状态、摘要和原始查询结果存储到独立的 MongoDB 数据库中。
- **Slack 通知:** 发送包含执行状态、摘要和 GitHub Actions 链接的 Slack 通知。
- **前端 Dashboard:** 提供一个现代化的可视化界面，支持以下功能：
  - 实时展示最近的检查历史和结果详情
  - 支持明暗主题切换
  - 支持中英文语言切换
  - 提供实时搜索和多维度筛选
  - 详细的执行状态和结果展示
  - 支持手动触发脚本执行
  - 响应式设计，适配各种设备

## 界面特点

### 统计卡片

- 实时展示下次计划检查时间
- 显示成功率统计和进度条
- 失败检查数量和提醒

### 手动触发

- 支持选择特定脚本执行
- 实时执行状态反馈
- 优雅的加载和错误提示

### 历史记录

- 支持按状态筛选（全部/成功/失败）
- 实时搜索脚本名称和消息
- 可展开查看详细信息
- 支持查看原始查询结果
- 分页浏览功能

### 交互体验

- 流畅的动画过渡效果
- 清晰的视觉反馈
- 直观的操作界面
- 优雅的加载状态展示

## 项目结构

```
.
├── .env.local            # 本地开发环境变量配置文件
├── .github/
│   └── workflows/
│       └── sql-check-cron.yml  # GitHub Actions 工作流配置
├── public/               # Next.js 公共资源
├── scripts/
│   ├── run_sql.ts        # 主要的 SQL 脚本执行器 (包括写入 MongoDB)
│   └── sql_scripts/      # 存放 SQL 查询脚本
│       └── check_order_duplicates.sql
├── src/
│   ├── app/              # Next.js 应用目录 (包括 API 和页面)
│   │   ├── api/check-history/route.ts # 获取检查历史的 API
│   │   ├── api/list-scripts/route.ts  # 获取可用脚本列表的 API
│   │   ├── api/run-check/route.ts     # 手动触发检查的 API
│   │   └── page.tsx      # Dashboard 主页面
│   ├── components/       # React 组件
│   │   ├── Dashboard.tsx           # 主面板组件
│   │   ├── ClientLayoutWrapper.tsx # 客户端布局包装器
│   │   └── ui/           # UI 组件
│   │       ├── theme-toggle.tsx    # 主题切换组件
│   │       └── ...                 # 其他 UI 组件
│   └── lib/              # 工具库
│       ├── db.ts         # PostgreSQL 数据库连接 (被检查的库)
│       └── mongodb.ts    # MongoDB 数据库连接 (用于存储历史结果)
├── test/
│   └── database/         # 数据库连接测试脚本
│       └── mongodb.test.ts
├── .gitignore
├── next.config.ts        # Next.js 配置
├── package.json          # 项目依赖与脚本配置
├── README.md             # 项目说明 (本文档)
└── tsconfig.json         # TypeScript 配置
```

## 环境变量配置

### 本地开发 (`.env.local`)

在项目根目录创建 `.env.local` 文件并配置以下变量：

```dotenv
# 被检查数据库的连接信息
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名"

# 用于存储历史记录的 MongoDB 连接字符串
MONGODB_URI="mongodb+srv://用户名:密码@主机/数据库名?options"

# Slack webhook URL
SLACK_WEBHOOK_URL="https://hooks.slack.com/YOUR_WEBHOOK_URL"

# Node.js 环境
NODE_ENV="development"

# GitHub 仓库信息 (用于生成 Actions 链接)
NEXT_PUBLIC_GITHUB_REPO="your-org/your-repo"
```

**注意:** `.env.local` 文件不应提交到 Git 仓库。

### GitHub Actions (Secrets)

在你的 GitHub 仓库 `Settings` -> `Secrets and variables` -> `Actions` 中配置以下 Secrets：

- `DATABASE_URL`: 被检查数据库的连接信息。
- `MONGODB_URI`: 用于存储历史记录的 MongoDB 连接字符串。
- `SLACK_WEBHOOK_URL`: Slack Webhook URL。

工作流文件 (`sql-check-cron.yml`) 会自动从这些 Secrets 读取配置。

## 安装依赖

```bash
npm install
```

## 使用方法

### 运行检查脚本 (本地)

- 执行默认的检查 (例如 `check_order_duplicates`):

  ```bash
  npm run sql:check
  ```

  _(注意: `sql:check` 当前在 `package.json` 中可能硬编码了特定脚本，需要检查或修改)_

- 执行指定的 SQL 文件:
  ```bash
  npm run sql:run scripts/sql_scripts/your_sql_file.sql
  ```

### 运行 MongoDB 连接测试 (本地)

```bash
npm run test:mongodb
```

### 运行 Next.js 前端 (本地)

```bash
npm run dev
```

访问 `http://localhost:3000` 查看 Dashboard。

## GitHub Actions 自动化

该项目配置了 GitHub Actions 工作流 (`.github/workflows/sql-check-cron.yml`)，它会：

- **定时执行:** 默认每天 UTC 时间 19:00 执行 `check_order_duplicates.sql` 脚本。
- **手动触发:** 允许通过 GitHub Actions UI 手动触发工作流。
- **结果处理:** 将执行结果写入配置的 MongoDB 数据库，并通过 Slack 发送通知。

## 添加新的 SQL 检查脚本

1.  在 `scripts/sql_scripts/` 目录下创建新的 `.sql` 文件。
2.  脚本应主要包含 `SELECT` 查询，避免执行数据修改操作。
3.  所有的 sql 脚本都需要以在脚本最开头添加以下信息，供给前端获取对应信息：
    ```sql
    -- NAME: script_name_in_english
    -- CN_NAME: 脚本中文名称
    -- DESCRIPTION: English description of what this script does.
    -- CN_DESCRIPTION: 此脚本功能的中文描述。
    /*
    Purpose: 脚本目的（可选，如果没有CN_DESCRIPTION将作为备选）
    Scope: 脚本作用范围
    Author: 作者名称
    Created: YYYY/MM/DD
    */
    ```
4.  (可选) 如果需要让某个新脚本成为默认的定时检查任务，需要修改 `.github/workflows/sql-check-cron.yml` 中 `Run SQL Script` 步骤调用的脚本名称。

## 安全注意事项

- **切勿**将包含敏感凭证（数据库密码、Webhook）的 `.env.local` 文件提交到版本控制系统。
- 始终使用 GitHub Secrets 来管理生产环境或 CI/CD 环境中的凭证。
- 确保用于执行 SQL 检查的数据库用户权限最小化（通常只需要读取权限）。
- 确保 MongoDB 用户对历史记录数据库有写入权限。
- 定期审查 SQL 脚本内容，确保没有潜在的破坏性操作。

## 技术栈

- **前端框架:** Next.js 14 (App Router)
- **UI 组件:** shadcn/ui + Tailwind CSS
- **状态管理:** React Hooks
- **数据库:**
  - PostgreSQL (被检查的数据库)
  - MongoDB (存储执行历史)
- **自动化:** GitHub Actions
- **通知集成:** Slack Webhook
- **开发语言:** TypeScript
- **代码规范:** ESLint + Prettier

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
