# SQL 脚本自动化执行工具

这个项目用于自动化执行 SQL 脚本，并将执行结果通过 Slack 通知。主要用于定期检查系统中的数据问题，如 订单系统中的重复订单。

## 项目结构

```
.
├── .env.loval            # 环境变量配置文件
├── .github               # GitHub相关配置
│   └── workflows         # GitHub Actions工作流配置
│       └── sql-check-cron.yml  # 定时执行SQL检查的工作流
├── lib                   # 工具库
│   └── db.ts             # 数据库连接配置
├── scripts               # 脚本目录
│   └── sql_scripts       # SQL脚本目录
│       ├── run_sql.ts    # SQL脚本执行器
│       └── check_order_duplicates.sql  # 订单重复检查脚本
└── package.json          # 项目依赖配置
```

## 环境变量配置

在`.env.loval`文件中配置以下环境变量：

```
# 数据库配置
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名"

# Slack webhook
SLACK_WEBHOOK_URL="https://hooks.slack.com/YOUR_WEBHOOK_URL"

# 环境
NODE_ENV="development"
```

## 安装依赖

```bash
npm install
```

## 使用方法

### 本地执行 Square 订单重复检查

```bash
npm run sql:check
```

### 执行其他 SQL 脚本

```bash
npm run sql:run -- path/to/your/sql/file.sql
```

## GitHub Actions 自动化

该项目配置了 GitHub Actions 工作流，会按照以下时间表自动执行：

- 每天芝加哥时间下午 2 点执行 Square 订单重复检查
- 将检查结果通过 Slack 通知

## 添加新的 SQL 脚本

1. 在`scripts/sql_scripts`目录下创建新的 SQL 脚本文件
2. 脚本应该只包含查询操作，不应包含修改操作
3. 可以使用以下格式的注释添加脚本说明：

```sql
/*
Purpose: 脚本目的
Scope: 数据范围
Author: 作者
Created: 创建日期
*/
```

## 安全注意事项

- 数据库连接信息和 Slack Webhook URL 应该作为 GitHub Secrets 配置，而不是直接提交到代码库
- SQL 脚本应该只包含查询操作，不应包含修改操作
- 在 GitHub Actions 中，使用生产环境时请谨慎配置数据库权限
