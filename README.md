# SQL 脚本部署系统

一个用于管理、执行和监控 SQL 检查脚本。该应用程序可以对数据库运行 SQL 查询，保存执行结果，并通过 Slack 发送通知的系统

## 主要功能

- **手动脚本执行**：直接从 UI 触发 SQL 检查
- **定时执行**：通过 GitHub Actions 自动执行检查
- **结果历史**：查看过去的执行结果，支持搜索和过滤
- **Slack 通知**：成功和失败检查的实时提醒
- **安全限制**：防止数据修改操作
- **双语支持**：支持英文和中文界面切换

## 系统架构

系统由以下部分组成：

1. **Web 仪表盘**：用于监控和手动触发的 Next.js 应用程序
2. **API 路由**：
   - `/api/run-check`：用于手动脚本执行
   - `/api/check-history`：用于检索执行历史
   - `/api/list-scripts`：用于获取可用脚本
3. **核心执行引擎**：`scripts/run-sql.ts`用于运行 SQL 脚本
4. **MongoDB 集成**：存储执行结果和元数据
5. **PostgreSQL 连接**：对数据库执行 SQL 查询

## 项目结构

```
.
├── scripts/
│   ├── run-sql.ts           # 核心脚本执行引擎
│   └── sql_scripts/         # SQL脚本文件
│       └── check-order-duplicates.sql
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── check-history/
│   │   │   ├── list-scripts/
│   │   │   └── run-check/    # 直接脚本执行API
│   │   ├── page.tsx         # 仪表盘页面
│   │   └── layout.tsx
│   ├── components/          # React组件
│   │   └── dashboard/       # 仪表盘UI组件
│   └── lib/                 # 实用工具库
│       ├── db.ts            # PostgreSQL连接
│       ├── mongodb.ts       # MongoDB连接
│       └── script-executor.ts # API执行包装器
```

## 设置与配置

### 环境变量

创建一个`.env.local`文件，包含：

```
# PostgreSQL数据库
DATABASE_URL="postgresql://user:password@host:port/database"

# MongoDB数据库
MONGODB_URI="mongodb+srv://..."

# Slack通知
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# GitHub（用于定时任务）
GITHUB_PAT="..."
GITHUB_OWNER="..."
GITHUB_REPO="..."
```

### 安装

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 手动运行脚本
npm run sql:run check-order-duplicates
```

## SQL 脚本格式要求

SQL 脚本必须严格遵循以下格式规范：

1. **文件位置**：所有 SQL 脚本必须放在 `scripts/sql_scripts/` 目录中
2. **文件命名**：使用连字符分隔的小写字母（例如：`check-data-consistency.sql`）
3. **元数据格式**：脚本必须在文件顶部包含元数据块注释：

```sql
/*
Name: script-name-in-english
Description: Detailed description of what this script does
Scope: area of application (optional)
Author: your name
Created: YYYY/MM/DD
CN_Name: 脚本中文名称
CN_Description: 脚本功能的中文描述
CN_Scope: 应用范围（可选）
*/
```

4. **查询要求**：

   - 脚本必须仅包含读取操作（SELECT 查询）
   - 严禁包含任何数据修改操作（INSERT, UPDATE, DELETE, DROP 等）
   - 查询应以分号（;）结尾分隔多个语句
   - 每个查询必须有明确目的，查询结果应易于解释

5. **注释规范**：

   - 使用 `--` 添加行注释说明复杂逻辑
   - 为复杂查询的各部分添加注释以提高可读性

6. **安全考虑**：
   - 避免使用动态 SQL 或不安全的查询模式
   - 查询应高效且有索引支持，避免全表扫描

系统会自动解析这些元数据并在 UI 中显示，支持中英文切换显示相应的名称和描述。

## 添加新的 SQL 脚本

1. 在`scripts/sql_scripts/`目录中创建一个`.sql`文件
2. 确保包含完整的元数据块注释（如上所述）
3. 编写 SQL 查询（禁止数据修改操作）
4. 该脚本将自动在 UI 中可用

## 关键文件说明

- **run-sql.ts**：核心脚本执行引擎 - 处理 SQL 解析、执行、结果保存和通知
- **script-executor.ts**：API 路由和执行引擎之间的桥梁
- **db.ts**：PostgreSQL 数据库连接管理器
- **mongodb.ts**：用于存储执行结果的 MongoDB 客户端

## 生产环境运行

构建并启动应用程序：

```bash
npm run build
npm run start
```

对于定时执行，使用`.github/workflows/`中的 GitHub Actions 工作流。
